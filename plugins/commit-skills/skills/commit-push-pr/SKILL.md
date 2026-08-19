---
name: commit-push-pr
description: Commit, push, and open a PR
disable-model-invocation: true
allowed-tools:
  - Bash(git checkout --branch*)
  - Bash(git checkout -b*)
  - Bash(git add*)
  - Bash(git status*)
  - Bash(git fetch*)
  - Bash(git push*)
  - Bash(git commit*)
  - Bash(gh pr create*)
  - Bash(gh pr view*)
  - Bash(gh pr edit*)
---

## Context

- Current git status: !`git status`
- Current branch: !`git branch --show-current`
- Commit messages diff with main: !`git log main..HEAD --oneline`
- `gh pr view --json number 2>&1 || echo none`: !`gh pr view --json number 2>&1 || echo none`

## Your task

Based on the above changes:

1. Create a new branch if on main
2. Create a single commit with an appropriate message
3. Push the branch to origin with upstream set (e.g., `git push -u origin <branch-name>`)
4. Create a pull request using `gh pr create`. The PR title and body MUST reflect all commits in the branch (refer to "Commit messages diff with main" in the context). Use `--fill` or specify `-t` (title) and `-b` (body) explicitly.
5. IMPORTANT: Sequential bash commands that depend on each other (e.g., `git add` → `git commit` → `git push`) MUST NOT be called as separate parallel tool calls in one response. Instead, chain them with `&&` in a single Bash tool call (e.g., `git add . && git commit -m "msg" && git push -u origin branch`).
6. Complete all the above steps. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
