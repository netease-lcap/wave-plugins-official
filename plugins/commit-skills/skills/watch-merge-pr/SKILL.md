---
name: watch-merge-pr
description: Watch PR checks and merge when successful
disable-model-invocation: true
allowed-tools:
  - Bash(gh pr checks*)
  - Bash(gh pr merge*)
  - Bash(gh run list*)
  - Bash(gh run view*)
---

## Context

- PR info: !`gh pr view --json headRefName,state --jq '{branch: .headRefName, state: .state}' 2>/dev/null || echo '{}'`

## Your task

Watch the current PR checks and merge it with rebase once they pass.

1. Watch checks: `gh pr checks --watch | tail -5` (if no checks configured, exits immediately)
2. If any check fails:
   a. Get the failed run ID: `gh run list --status failure -L 1 --json databaseId --jq '.[0].databaseId'`
   b. Download the failed log to a temp file (single network request, reusable for analysis):
      `gh run view <run-id> --log-failed > /tmp/gh-failed-log.txt 2>&1`
   c. Use the Grep tool to search `/tmp/gh-failed-log.txt` for failure indicators (pattern: `FAIL|Error|failed|ELIFECYCLE|exit code`, case-insensitive)
   d. If more context is needed, use the Grep tool with context lines (`-C 5`) on the same file
   e. Fix the issue in the codebase
   f. Commit and push: `git add -A && git commit && git push` (use interactive commit for a meaningful message)
   g. Go back to step 1 to re-watch
3. Once all checks pass, merge: `gh pr merge --rebase` (do NOT add --delete-branch, it fails in worktrees)

IMPORTANT: Sequential bash commands that depend on each other (e.g., `gh pr checks --watch` → `gh pr merge --rebase`) MUST NOT be called as separate parallel tool calls in one response. Instead, chain them with `&&` in a single Bash tool call.

Execute the commands. For log analysis (step 2c-d), use the Grep and Read tools on the downloaded log file. Do not send any other text or messages besides these tool calls.
