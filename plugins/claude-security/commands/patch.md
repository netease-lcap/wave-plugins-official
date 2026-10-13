---
description: 把扫描报告里选定的安全发现变成补丁：在临时副本中起草、独立复核，补丁由你自己应用
allowed-tools: Bash(git hash-object*), Bash(git worktree add*), Bash(git worktree remove*), Bash(git worktree list*), Bash(git status*), Bash(git diff*), Bash(git rev-parse*), Read, Glob, Grep, Write(WAVE-SECURITY-*/patches/**), Agent
---

# Turn findings into patches

You are turning already-verified findings from a scan report into patches. Two invariants:

- **The user's working tree is never edited by you.** Drafting happens in a scratch copy of the
  repository, and the result is a patch file. Applying it is the user's decision, made by hand.
- **A patch is only delivered if an independent reviewer confirms it.** No reviewer, no patch — just an
  explanation of why not.

## Step 1 — Find the report

The scan directory is the newest `WAVE-SECURITY-*` under the working directory (`ls -dt
WAVE-SECURITY-*/`) unless the user named one as an argument. Read its `findings.json`.

If there is no scan directory, stop and tell the user to run `/claude-security:scan` first — a patch is
generated against a report, and inventing findings here would skip the verification the report records.
If `findings[].length` is 0, say there is nothing to patch.

## Step 2 — Select the findings

If the user named ids (`/claude-security:patch F1 F3`), those are the selection — confirm they exist, and
ignore anything in `rejected[]`. Otherwise use `AskUserQuestion` with multi-select, listing the confirmed
findings as `F<n> · <severity> · <title>` and nothing else; do not re-rank or pre-check them.

Take at most **5 findings per run** (each one costs a repository copy and an independent review). If more
were selected, do the first five, then say plainly how many are left and that re-running continues.

## Step 3 — Check every selected finding is still current

For each selected finding, compare the recorded revision against the code on disk:

- git repository: `git hash-object <file>` must equal `findings[].revision.blobSha`.
- not under version control: the file's size and mtime should match `revision.size` / `revision.mtime`.

On any mismatch, **skip that finding**, do not patch it, and tell the user plainly that the code has
changed since the scan and that finding needs a re-scan — a patch written against code that no longer
exists is worse than none. Continue with the findings that still match.

## Step 4 — Draft and review, one finding at a time

For each finding that passed Step 3:

1. **Create the scratch copy** — `git worktree add /tmp/WAVE-SECURITY-PATCH-<ts>-<F-id>/repo --detach HEAD`
   (for a repository not under version control, `cp -a` the tree into
   `/tmp/WAVE-SECURITY-PATCH-<ts>-<F-id>/repo`). Its path must keep the `WAVE-SECURITY-PATCH-` segment —
   that is the only place you are permitted to edit files. Record the exact path.
2. **Draft** — `Agent` with `subagent_type: "claude-security:patch-author"`, giving it the finding, the
   scratch path, and the project's security guidance if any. It edits the scratch copy only. Its edits
   carry the normal permission check for the paths it touches, so an approval prompt there is expected —
   never widen it to the user's own files.
3. **Review** — `Agent` with `subagent_type: "claude-security:patch-verifier"`, giving it the scratch path
   and the project's test command (read it from `package.json` / `Makefile` / `pyproject.toml` /
   `pom.xml` — say "no test command found" when there is none). The reviewer must be a **fresh** call: do
   not pass it the author's rationale, and do not answer for it.
4. **Decide** — only `verdict: "approve"` with all three checks `ok: true` produces a patch. Otherwise
   produce no patch for that finding; write its note with the reason instead. A reviewer that could not
   run tests has stated a limitation, not given an approval — record that limitation in the note either
   way, and do not upgrade `uncertain` into a pass.

## Step 5 — Write the results

For each finding, in `<scan dir>/patches/`:

- `F<n>.patch` — for an approved patch: `git -C <scratch> diff > <scan dir>/patches/F<n>.patch`. It must
  apply from the repository root with `git apply <path>`. Never apply it yourself, anywhere but the
  scratch copy.
- `F<n>.md` — the note, always written. It states: the finding id / severity / title and its location; what
  the patch changes and which existing mechanism it reuses; how it was verified (the exact test command
  and its result, plus the independent reviewer's verdict and reasoning in your own words); any residual
  risk or behavior change; **how to apply it** — `git apply <scan dir>/patches/F<n>.patch` — and that
  applying is the user's decision; the recorded revision it was built against. When no patch was produced,
  the note says so in its first line and gives the reason, plus what the real fix would require.

## Step 6 — Clean up and report

Remove every scratch copy (`git worktree remove --force <path>`, or delete the temp tree). Confirm with
`git status --porcelain` that the user's working tree is unchanged — if anything shows up, say so
immediately and explain what it is.

Then report, briefly: which findings got a patch and which did not (with the one-line reason), the exact
paths under `patches/`, that **nothing has been applied**, and the command to apply one. Do not offer to
apply them.
