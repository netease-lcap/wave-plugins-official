---
name: watch-merge-mr
description: Watch MR pipeline and merge when successful
disable-model-invocation: true
allowed-tools:
  - Bash(node */watch-merge-mr.mjs*)
---

## Context

- Current MR status: !`glab mr view`

## Your task

Watch the current MR pipeline and merge it once it succeeds:

```bash
node ${WAVE_SKILL_DIR}/scripts/watch-merge-mr.mjs
```

You have the capability to call multiple tools in a single response. Execute the command using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
