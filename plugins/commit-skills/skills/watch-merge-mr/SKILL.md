---
name: watch-merge-mr
description: Watch MR pipeline and merge when successful
disable-model-invocation: true
allowed-tools:
  - Bash(glab mr view*)
  - Bash(glab api*)
  - Bash(glab ci get*)
  - Bash(glab ci trace *)
  - Bash(glab mr merge*)
  - Bash(git add*)
  - Bash(git commit*)
  - Bash(git push*)
  - Bash(git rev-parse*)
  - Bash(git symbolic-ref*)
  - Bash(git -C*)
  - Bash(git switch*)
  - Bash(git branch -D*)
  - Bash(git pull*)
---

## Context

- MR info: !`glab mr view --output json 2>&1 || echo {}`

## Your task

Watch the current MR pipeline and merge it once it succeeds.

1. Watch the pipeline by polling the REST API (do NOT use `glab ci status --live` — its TUI redraws every 3s with ANSI cursor sequences, flooding captured output with noise; REST polling yields one clean status line per poll):
   a. Get the head pipeline from the MR REST API (do NOT rely on the `glab mr view` output in Context — it exposes no reliable `head_pipeline` field on GitLab CE):
      `glab api "projects/<project_id>/merge_requests/<iid>"` — read `head_pipeline.id`.
   b. If `head_pipeline` is null, look it up explicitly: `glab api "projects/<project_id>/merge_requests/<iid>/pipelines"` — take the highest `id` entry as the pipeline id.
   c. If no pipeline exists at all, no CI is configured for this MR — skip straight to step 3.
   d. Poll until the pipeline reaches a terminal state (`success`/`failed`/`canceled`), e.g.:
      `for i in $(seq 1 60); do st=$(glab api "projects/<project_id>/pipelines/<pipeline_id>" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))"); echo "poll $i: $st"; case "$st" in success|failed|canceled) break;; esac; sleep 10; done`
      If the loop's final status is still non-terminal (created/pending/running), run the loop again (long pipelines can outlast a single tool call).
2. If the pipeline fails or is canceled:
   a. List the MR head pipeline's jobs to find the failed job ID: `glab ci get --merge-request=<iid> --status=failed --with-job-details` (or `-p <pipeline_id>`)
   b. Download the failed job log to a temp file (single network request, reusable for analysis):
      `glab ci trace <failed-job-id> > /tmp/glab-failed-log.txt 2>&1; echo "log at: $(cygpath -w /tmp/glab-failed-log.txt 2>/dev/null || echo /tmp/glab-failed-log.txt)"`
   c. Use the Grep tool to search the log path printed above (native Windows path on Windows, e.g. `C:\Users\...\Temp\glab-failed-log.txt`) for failure indicators (pattern: `FAIL|Error|failed|exit code`, case-insensitive)
   d. If more context is needed, use the Grep tool with context lines (`-C 5`) on the same file
   e. Fix the issue in the codebase
   f. Commit and push: `git add -A && git commit && git push` (use interactive commit for a meaningful message)
   g. Go back to step 1 to re-watch
3. Once the pipeline succeeds, merge: `glab mr merge --yes --rebase` (the `--remove-source-branch` is handled by GitLab server-side; do NOT add `--delete-branch` style flags that fail in worktrees)
4. After the merge succeeds, sync the local repository:
   - If inside a worktree (i.e. `git rev-parse --git-dir` differs from `git rev-parse --git-common-dir`), pull the main repo:
     `git -C "$(git rev-parse --git-common-dir)/.." pull`
   - Otherwise, switch to the default branch, delete the merged branch, and pull:
     `git switch <default-branch> && git branch -D <source-branch> && git pull`
     - Default branch: `git symbolic-ref --short refs/remotes/origin/HEAD` (strip the `origin/` prefix; fall back to `main`)
     - Source/merged branch is the MR source_branch from Context above

IMPORTANT: Sequential bash commands that depend on each other (e.g., pipeline polling → `glab mr merge --yes`) MUST NOT be called as separate parallel tool calls in one response. Instead, chain them with `&&` in a single Bash tool call.

Execute the commands. For log analysis (step 2c-d), use the Grep and Read tools on the downloaded log file. Do not send any other text or messages besides these tool calls.
