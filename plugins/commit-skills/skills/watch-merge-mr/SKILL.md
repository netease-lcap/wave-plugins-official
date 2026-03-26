---
name: watch-merge-mr
description: Watch MR pipeline and merge when successful
disable-model-invocation: true
allowed-tools:
  - Bash(while true; do s=$(glab mr view --output json | jq -r '.pipeline.status'); echo "$(date '+%H:%M:%S') - Pipeline: $s"; [[ "$s" == "success" ]] && { glab mr merge --yes --remove-source-branch; break; }; [[ "$s" == "failed" || "$s" == "canceled" ]] && { echo "Pipeline failed, aborting merge."; break; }; sleep 10; done)
---

## Context

- Current MR status: !`glab mr view`

## Your task

Watch the current MR pipeline and merge it once it succeeds:

```bash
while true; do s=$(glab mr view --output json | jq -r '.pipeline.status'); echo "$(date '+%H:%M:%S') - Pipeline: $s"; [[ "$s" == "success" ]] && { glab mr merge --yes --remove-source-branch; break; }; [[ "$s" == "failed" || "$s" == "canceled" ]] && { echo "Pipeline failed, aborting merge."; break; }; sleep 10; done
```

You have the capability to call multiple tools in a single response. Execute the command using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
