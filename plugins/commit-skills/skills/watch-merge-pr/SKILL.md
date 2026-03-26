---
name: watch-merge-pr
description: Watch PR checks and merge when successful
disable-model-invocation: true
allowed-tools:
  - Bash(gh pr checks*)
  - Bash(gh pr merge*)
---

## Context

- Current PR status: !`gh pr view`
- PR checks count: !`gh pr view --json statusCheckRollup --jq '.statusCheckRollup | length' 2>/dev/null || echo 0`

## Your task

Watch the current PR checks and merge it with rebase once they pass.

If "PR checks count" is 0, you should skip `gh pr checks --watch` and merge directly.

1. Watch checks (if count > 0): `gh pr checks --watch`
2. Merge: `gh pr merge --rebase`

You have the capability to call multiple tools in a single response. Execute the commands using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
