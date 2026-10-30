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

⚠️ 上面那行**已经执行完了**，它的输出就是结果，不必再复核：

- 不要再自己调 `Bash` 去删一遍或验证一遍 —— 那会被权限拦下，然后被你误报成「取消失败」。
- 也不用再去找 `.wave/ralph-loop.local.md`：脚本的输出（`🛑` 删掉了 / `ℹ️` 本来就没有）
  已经是准确结论。
