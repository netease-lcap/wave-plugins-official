---
name: ralph-loop
description: 启动 Ralph 循环：把同一段 prompt 反复喂回自己，靠文件系统与 git 历史累积迭代，直到输出完成标记或到达迭代上限
disable-model-invocation: true
allowed-tools:
  - Bash(node *ralph-loop.js*)
  - Bash(node *ralph-loop.js* <<'WAVE_RALPH_ARGS'*>*)
---

# Ralph 循环

把同一段 prompt 一轮一轮喂给同一个会话，每轮都在上一轮留下的文件和 git 历史
上继续，直到模型自己输出完成标记（或到达轮次上限）。

用法：

```
/ralph-loop:ralph-loop <prompt> [--max-iterations N] [--completion-promise TEXT]
/ralph-loop:ralph-loop --help
```

`--max-iterations N` 的含义是「总共跑 N 轮（含首个回合）」，即 N-1 次回喂，
与 Claude Code 的 ralph-loop 一致：`1` = 一次都不喂回（prompt 不会被执行），
`0` 或省略 = 不限轮。首个真正干活的回合，提示行显示的是「第 2 轮」。

先把状态写进 `.wave/ralph-loop.local.md`：

```!
node ${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js start <<'WAVE_RALPH_ARGS'
$ARGUMENTS
WAVE_RALPH_ARGS
```

## 接下来怎么做

- 上面那行**已经执行完了**，它的输出就是结果。不要再自己调 `Bash` / `Glob` / `Read` 去
  复核 `.wave/ralph-loop.local.md`（`.wave` 是隐藏目录，文件工具看不到它）。
- 输出以 `📖` 开头 ⇒ 用户是在问用法。把这段用法**原样转述**给用户，然后停下，
  不要启动循环、也不要开始做任何工作。
- 输出以 `❌` 开头 ⇒ **循环没有启动**。把错误原样告诉用户，然后停下，
  不要开始执行任何工作。
- 输出以 `✅` 开头 ⇒ 循环已就绪。**这一轮不要做 prompt 里的任何工作**，只回复
  一行「Ralph 循环已就绪」就结束回合 —— Stop hook 会立刻把第一轮活儿的 prompt
  送进来（提示行写的是「第 2 轮」，因为启动命令这个回合就是第 1 轮），从那时开始干活。

## 循环里的行为约定

- 每轮开头那行「🔄 Ralph 第 N 轮」是循环注入的提示，不属于用户原来的 prompt。
- 设了完成条件时，**只有真的达成**才输出 `<promise>完成标记</promise>`，
  不要为了退出循环而谎报；标记必须与要求逐字一致。
- 每轮结束前把进度落到文件里（代码、测试、笔记都行），下一轮只能靠这些痕迹
  接上，聊天记录不保证完整传下去。
- 用户随时可以用 `/ralph-loop:cancel-ralph` 停掉循环。
