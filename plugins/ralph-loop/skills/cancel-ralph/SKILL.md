---
name: cancel-ralph
description: 取消当前项目的 Ralph 循环（删除 .wave/ralph-loop.local.md）
disable-model-invocation: true
allowed-tools:
  - Bash(node *ralph-loop.js*)
---

# 取消 Ralph 循环

删除本项目的 Ralph 循环状态文件：

```!
node ${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js cancel
```

把上面那行的输出原样回给用户，不要做别的。

⚠️ 上面那行**已经执行完了**，它的输出就是结果：

- 不要再自己调 `Bash` 去删一遍或验证一遍 —— 那会被权限拦下，然后被你误报成「取消失败」。
- 不要用 `Glob` / `Read` 去找 `.wave/ralph-loop.local.md` —— `.wave` 是隐藏目录，文件工具看不到它，
  「找不到」不等于「没删掉」。
