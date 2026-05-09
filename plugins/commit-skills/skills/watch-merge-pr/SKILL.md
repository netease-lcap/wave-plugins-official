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

- PR info: !`gh pr view --json headRefName,state,statusCheckRollup --jq '{branch: .headRefName, state: .state, checks: (.statusCheckRollup | length)}' 2>/dev/null || echo '{}'`

## Your task

Watch the current PR checks and merge it with rebase once they pass.

If the `checks` field in "PR info" is 0, skip `gh pr checks --watch` and merge directly.

1. Watch checks (if count > 0): `gh pr checks --watch | tail -5`
2. If any check fails:
   a. Fetch the failed log: `gh run view --log-failed`
   b. Analyze the log to identify the root cause
   c. Fix the issue in the codebase
   d. Commit and push: `git add -A && git commit && git push` (use interactive commit for a meaningful message)
   e. Go back to step 1 to re-watch
3. Once all checks pass, merge: `gh pr merge --rebase` (do NOT add --delete-branch, it fails in worktrees)

IMPORTANT: Sequential bash commands that depend on each other (e.g., `gh pr checks --watch` → `gh pr merge --rebase`) MUST NOT be called as separate parallel tool calls in one response. Instead, chain them with `&&` in a single Bash tool call.

Execute the commands. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
