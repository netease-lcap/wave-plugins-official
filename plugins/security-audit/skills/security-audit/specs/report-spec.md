# Report spec — what a scan leaves on disk

Both scan jobs (codebase, changes) end here. The product is **one timestamped directory** under the working
directory, and nothing outside it is ever written.

## The scan directory

Create `<cwd>/WAVE-SECURITY-<YYYYMMDD-HHmmss>/`, and write `.gitignore` in it first, containing exactly:

```
# Evidence, not source: keeps the whole report out of `git add`.
*
```

Then verify the ignore actually takes effect — `git check-ignore -v WAVE-SECURITY-<ts>/report.md` must report
a matching rule. If it does not (e.g. not under version control), say so in the report; the directory still
must not be added to version control by hand.

The directory holds, and nothing else:

- `report.md` — the human-readable report
- `findings.json` — the machine-readable result
- `results.sarif` — SARIF 2.1.0 log
- `patches/` — written later, only by the suggest-patches job

## What may enter `findings[]`

Only a finding an **independent reviewer confirmed**. The verifier gets the finding plus the file and
**nothing about the hunter's reasoning, claimed impact or confidence** — a verifier that has been told what
to conclude is not a verifier. Batch by file when there are many findings (one call may judge several
findings from the same file), but each finding gets its own verdict.

**Merge duplicates before numbering.** Two hunters that found the same weakness report the same
`location.file`, the same sink line and the same `cweId`: keep one finding, take the **higher** of the two
severities and the **higher** of the two confidences, and note the other hunter's area in `notes`. Findings
in the same file within ±5 lines of each other with the same `cweId` and the same root cause are also one
finding. Number (`F1`, `F2`, …) only what survives the merge, and let a verifier's `lower` stand where it
was applied.

- `confirmed` → goes into `findings[]`, and only this counts as a finding.
- `rejected` or `uncertain` → goes into `rejected[]` with the verifier's reason. It is never counted in the
  summary and never given a severity. Do not re-litigate a rejection yourself.

## `findings.json` — this exact shape

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
      "confidence": "high | medium | low",
      "cweId": "CWE-89",
      "category": "short class, e.g. injection / access control / crypto / secrets",
      "impact": "what breaks if it is exploited",
      "exploitScenario": "who can trigger it, with what input, to what effect",
      "location": { "file": "src/a.ts", "startLine": 10, "endLine": 20 },
      "symbol": "the enclosing function, or the top-level construct at file scope",
      "snippet": "the sink line, quoted verbatim",
      "evidence": "the code that carries the problem",
      "remediation": "the concrete change that fixes it",
      "verification": {
        "verdict": "confirmed",
        "reason": "what the verifier checked",
        "severityAdjustment": "keep | lower"
      },
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

Assign ids in the order findings survived the merge: `F1`, `F2`, … The `revision` block is what makes the
report attributable to exact code — fill `blobSha` with `git hash-object <file>` (it changes when the file's
content changes, so later staleness is detectable) and always record `size`/`mtime` as the fallback for a
directory that is not under version control.

## `report.md` — for a human, in this order

Scope and revision (what exactly was scanned, from which commit, with which exclusions); a findings table
(`id | severity | confidence | CWE | title | file:line`); one section per finding with impact, exploit
scenario, evidence, and remediation verbatim from `findings.json`; the rejected list with reasons; then two
closing notes — (1) the scan is **non-deterministic**: a second scan of the same code may find a different
set of issues, so its value comes from being run again, not from being repeatable; (2) how to act on it: the
suggest-patches job turns selected findings into patches that the user applies themselves.

## `results.sarif` — SARIF 2.1.0

Write it by filling this skeleton (one `rules[]` entry per distinct CWE, one `results[]` entry per finding).
Do not invent extra fields, and do not re-derive severities: map `critical`/`high` → `error`, `medium` →
`warning`, `low` → `note`.

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "security-audit",
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
