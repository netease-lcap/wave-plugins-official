---
description: 对代码库 / 一段改动做多 agent 深度安全扫描，逐条发现经独立复核后落盘成报告
allowed-tools: Bash(git merge-base*), Bash(git hash-object*), Bash(git for-each-ref*), Bash(git symbolic-ref*), Bash(git check-ignore*), Write(WAVE-SECURITY-*/**), Read, Glob, Grep, Agent
---

# Deep security scan

You are running an on-demand security scan over code that **already exists** — including code you never
wrote. This is not a diff review: the point is inventory, not increment.

Two rules hold for the whole run:

- **Nothing happens before the user picks a scope.** You may read and count; you may not scan, spawn
  agents, or write files until they choose.
- **Nothing outside the scan directory is ever modified.** Not source files, not `git status`, not a
  single config. The scan is an observer.

## Step 1 — Inventory (read-only)

Measure, do not guess. Run these and keep the numbers:

- `git rev-parse --show-toplevel` — is this a git work tree? (If not, the scan still works: count source
  files by extension instead.)
- `git ls-files | wc -l` — tracked file count. Refine with `git ls-files | xargs wc -l | tail -1` if it is
  cheap to do so.
- `git symbolic-ref refs/remotes/origin/HEAD --short` — the base branch. Fall back to
  `git rev-parse --verify origin/main` / `origin/master`, or to the repo's own default-branch config.
- If a base branch resolves: `git merge-base <base> HEAD`, then
  `git diff --name-only <base>...HEAD | wc -l` and `git rev-list --count <base>...HEAD`.
- `git status --porcelain` — are there uncommitted changes?
- `git branch --show-current` and `git log -1 --format=%H` — the revision the report will be stamped with.

Exclude from the count, and list explicitly in `settings.excluded`: dependency and vendored trees
(`node_modules`, `vendor`, `third_party`), build output (`dist`, `build`, `out`, `target`), minified or
generated bundles, lockfiles, and test fixtures that are large binary blobs. State the exclusion list in
the report rather than silently shrinking the scope.

## Step 2 — Present the scope menu, then wait

Use the `AskUserQuestion` tool, single select. Offer only what actually applies to this repository:

| Option | When it applies | Description to show |
| --- | --- | --- |
| **Whole repository** | always (also when not under version control) | `<N> files · largest scope, longest run` |
| **Focused area** | always | `one directory or subsystem · ask me which path` |
| **Branch diff** | only if a base branch resolved **and** `git rev-list --count <base>...HEAD` > 0 | `commits this branch has over <base>: <N> files · smallest scope` |
| **Single commit** | only if the user named a commit id | `one commit · smallest scope` |

Both the file count and the relative cost tier come from Step 1 — never from a guess. When the user picks
**Focused area**, ask a follow-up question for the path and re-count before proceeding.

If the working tree has uncommitted changes and they picked a diff or whole-repo scope, say plainly:
uncommitted work is **not** covered (`git` scopes see committed content only) and they can either commit
first or switch to a whole-repository scan of the working tree.

If the user cancels or names nothing, stop here. Say so in one line and do nothing else.

## Step 3 — Create the scan directory

Create `<cwd>/WAVE-SECURITY-<YYYYMMDD-HHmmss>/` and write `.gitignore` in it first, containing exactly:

```
# Evidence, not source: keeps the whole report out of `git add`.
*
```

Then verify the ignore actually takes effect — `git check-ignore -v WAVE-SECURITY-<ts>/report.md` must
report a matching rule. If it does not (e.g. not a git repository), say so in the report; the directory
still must not be added to version control by hand.

The directory holds, and nothing else:

- `report.md` — the human-readable report
- `findings.json` — the machine-readable result
- `results.sarif` — SARIF 2.1.0 log
- `patches/` — written later, only by `/claude-security:patch`

## Step 4 — Scan: map, hunt, verify

Three phases, strictly in order. Phase C is not optional and not skippable for "obviously real" findings.

**A. Architecture and threat model** — one `Agent` call with `subagent_type:
"claude-security:threat-modeler"`, handing it the confirmed scope. It returns the architecture of that
scope, the trust boundaries and entry points, what data is sensitive here, and a prioritized threat
model: what an attacker would actually try against *this* codebase. Keep that text — every hunter in
phase B needs it verbatim.

**B. Hunt** — `Agent` calls with `subagent_type: "claude-security:vulnerability-hunter"`. Split the
confirmed scope into disjoint areas (by directory, or by subsystem when directories are meaningless) and
launch **one hunter per area in a single message** so they run in parallel. Cap the fan-out at 6 hunters;
with more areas, merge the smallest ones by directory until you are at 6, and state the grouping in the
report. Each hunter gets: its area, the threat model from phase A, and its output schema. A hunter that
found nothing must say so explicitly — silence is not an answer.

**C. Verify** — for **every** finding from **every** hunter, an independent reviewer:
`subagent_type: "claude-security:finding-verifier"`. Hand it the finding plus the file, and **nothing
about the hunter's reasoning, claimed impact, or confidence** — a verifier that has been told what to
conclude is not a verifier. Batch by file when there are many findings (one call may judge several
findings from the same file), but each finding gets its own verdict.

Then partition:

- `confirmed` → goes into `findings[]`, and only this counts as a finding.
- `rejected` or `uncertain` → goes into `rejected[]` with the verifier's reason. It is never counted in
  the summary and never given a severity. Do not re-litigate a rejection yourself.

## Step 5 — Write the three artifacts

**`findings.json`** — this exact shape:

```json
{
  "scan": {
    "scope": "repo | path | branch-diff | commit",
    "scopeDetail": "the path, the ref pair, or the commit, exactly as confirmed",
    "startedAt": "ISO 8601",
    "finishedAt": "ISO 8601",
    "cwd": "absolute path the scan ran in",
    "revision": {
      "vcs": "git",
      "ref": "branch name or 'HEAD'",
      "commit": "full sha, or null when not under version control",
      "base": "base branch used for a diff scope, else null"
    },
    "filesScanned": 0,
    "filesSkipped": 0,
    "settings": {
      "excluded": ["node_modules/**", "…"],
      "guidanceFiles": ["paths of security guidance files that were loaded, if any"],
      "hunters": 0,
      "mergedAreas": ["area → area, when the cap forced a merge"]
    },
    "notes": ["coverage caveats, e.g. truncation or a scope that could not be counted exactly"]
  },
  "findings": [
    {
      "id": "F1",
      "title": "one line",
      "severity": "critical | high | medium | low",
      "confidence": 0.0,
      "cwe": "CWE-89",
      "category": "short class, e.g. injection / access control / crypto / secrets",
      "impact": "what breaks if it is exploited",
      "exploitScenario": "who can trigger it, with what input, to what effect",
      "location": { "file": "src/a.ts", "startLine": 10, "endLine": 20 },
      "evidence": "the code that carries the problem",
      "remediation": "the concrete change that fixes it",
      "verification": { "verdict": "confirmed", "reason": "what the verifier checked" },
      "revision": {
        "commit": "full sha at scan time, or null",
        "path": "src/a.ts",
        "blobSha": "git hash-object output, or null when not under version control",
        "size": 0,
        "mtime": "ISO 8601 or null"
      }
    }
  ],
  "rejected": [{ "id": "R1", "title": "…", "fromHunter": "area", "reason": "the verifier's reason" }]
}
```

Assign ids in the order findings were confirmed: `F1`, `F2`, … The `revision` block is what makes the
report attributable to exact code — fill `blobSha` with `git hash-object <file>` (it changes when the
file's content changes, so later staleness is detectable) and always record `size`/`mtime` as the
fallback for a directory that is not under version control.

**`report.md`** — for a human, in this order: scope and revision (what exactly was scanned, from which
commit, with which exclusions); a findings table (`id | severity | confidence | CWE | title | file:line`);
one section per finding with impact, exploit scenario, evidence, and remediation verbatim from
`findings.json`; the rejected list with reasons; then two closing notes — (1) the scan is
**non-deterministic**: a second scan of the same code may find a different set of issues, so its value
comes from being run again, not from being repeatable; (2) how to act on it: `/claude-security:patch`
turns selected findings into patches that you apply yourself.

**`results.sarif`** — SARIF 2.1.0, written by filling this skeleton (one `rules[]` entry per distinct
CWE, one `results[]` entry per finding). Do not invent extra fields, and do not re-derive severities:
map `critical`/`high` → `error`, `medium` → `warning`, `low` → `note`.

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "claude-security",
          "informationUri": "https://github.com/netease-lcap/wave-agent",
          "rules": [
            {
              "id": "CWE-89",
              "name": "SqlInjection",
              "shortDescription": { "text": "Improper Neutralization of Special Elements used in an SQL Command" },
              "properties": { "tags": ["security", "external/cwe/cwe-89"], "cwe": "CWE-89" }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "CWE-89",
          "level": "error",
          "message": { "text": "<title> — <impact>" },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": { "uri": "src/a.ts" },
                "region": { "startLine": 10, "endLine": 20 }
              }
            }
          ],
          "partialFingerprints": { "waveFindingId": "F1" }
        }
      ]
    }
  ]
}
```

Use the real CWE name and description for each id you assign; `external/cwe/cwe-<n>` is the tag format
GitHub code scanning expects.

## Step 6 — Report back

Say, in a few lines: the confirmed scope and revision, files scanned, how many findings survived
verification by severity, how many were rejected, and the absolute path of `report.md`. State plainly
when nothing survived verification. Mention the two honest caveats — non-determinism, and that this layer
does not block anything — and point at `/claude-security:patch` for the next step.
