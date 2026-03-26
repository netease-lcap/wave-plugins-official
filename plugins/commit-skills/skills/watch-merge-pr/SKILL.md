---
name: watch-merge-pr
description: Watch PR checks and merge when successful
disable-model-invocation: true
allowed-tools:
  - Bash(gh pr checks --watch)
  - Bash(gh pr merge --rebase)
---

## Context

- Current PR status: !`gh pr view`

## Your task

Watch the current PR checks and merge it with rebase once they pass:

1. Watch checks: `gh pr checks --watch`
2. Merge: `gh pr merge --rebase`

You have the capability to call multiple tools in a single response. Execute the commands using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
