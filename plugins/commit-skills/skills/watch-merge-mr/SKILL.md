---
name: watch-merge-mr
description: Watch MR pipeline and merge when successful
disable-model-invocation: true
allowed-tools:
  - Bash(glab mr view*)
  - Bash(glab ci status*)
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

- MR info: !`glab mr view --output json 2>/dev/null || echo '{}'`

## Your task

Watch the current MR pipeline and merge it once it succeeds.

1. Watch pipeline: `glab ci status --live` (blocks until the pipeline ends; final line prints `Pipeline state: success` or `Pipeline state: failed`; if no pipeline is configured, it exits immediately)
2. If the pipeline fails:
   a. List the latest pipeline's jobs to find the failed job ID: `glab ci get -d`
   b. Download the failed job log to a temp file (single network request, reusable for analysis):
      `glab ci trace <failed-job-id> > /tmp/glab-failed-log.txt 2>&1`
   c. Use the Grep tool to search `/tmp/glab-failed-log.txt` for failure indicators (pattern: `FAIL|Error|failed|exit code`, case-insensitive)
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

IMPORTANT: Sequential bash commands that depend on each other (e.g., `glab ci status --live` → `glab mr merge --yes`) MUST NOT be called as separate parallel tool calls in one response. Instead, chain them with `&&` in a single Bash tool call.

Execute the commands. For log analysis (step 2c-d), use the Grep and Read tools on the downloaded log file. Do not send any other text or messages besides these tool calls.
