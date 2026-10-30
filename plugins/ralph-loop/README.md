# ralph-loop

把同一段 prompt 一轮一轮喂回**同一个会话**，每轮都在上一轮留下的文件与 git 历史
上继续干，直到模型自己输出完成标记（或到达轮次上限）。

机制来自 Geoffrey Huntley 的 Ralph Wiggum 技术，这里是 wave 版实现，不是 CC 插件的
移植：CC 用 `{"decision":"block","reason":...}` 拦退出，wave 的协议完全不同（见下）。

## 机制

```
/ralph-loop:ralph-loop <prompt> --max-iterations 5
        │
        ├─ 状态写入 .wave/ralph-loop.local.md（frontmatter 存参数，正文 = 原始 prompt）
        │
        ├─ 模型**当场开始执行 prompt**（这就是第 1 轮，不会先回一句「已就绪」）
        │
        └─ agent 干完一轮想停
              └─ Stop hook 拦下：iteration+1 写回，把「第 N 轮提示行 + 原始 prompt」
                 写到 stderr 并 exit 2
                    └─ wave 把 stderr 作为一条 meta user message 注入会话，重开一轮
                          └─ 循环，直到命中 <promise>…</promise> / 到上限 / 手动取消
```

轮次语义刻意与 CC 的 `setup-ralph-loop.sh` + `stop-hook.sh` 对齐：状态文件里的
`iteration` 是「当前回合序号」，启动时就是 `1`；Stop hook 在自增**之前**判
`iteration >= max_iterations`，否则写回 `iteration + 1`，并把**新**序号写进提示行
（第一次回喂显示「第 2 轮」，同 CC 的 `Ralph iteration 2`）。所以
`--max-iterations N` = 总共 N 个回合（含首回合）= `N-1` 次回喂。

wave 侧的关键契约（都在 `wave-agent` 的 agent-sdk 里）：

- Stop hook 的「阻止停止 + 继续对话」= `process.stderr.write(text)` + `process.exit(2)`
  （`managers/hookManager.ts` 的 `handleBlockingError` / `managers/aiManager.ts` 的
  `executeStopHooks` 的 `shouldRestart`）。
- Stop hook 的 stdin 是 JSON，其中 `last_assistant_message` 是最后一条 assistant 的纯文本，
  所以判完成标记直接读它，**不用解析 transcript**。
- 用户按 `Esc` 中断时引擎根本不执行 Stop hook，所以「中断即停」是白送的，hook 里不需要
  写中断判据。
- wave 没有 CC 的 `systemMessage` 字段：每轮「第几轮 / 怎么结束」必须拼进喂回去的正文，
  否则模型既不知道自己在循环里，也不知道怎么退出。

## 用法

> wave 里插件贡献的斜杠命令一律带插件名前缀，所以命令实际是
> `/ralph-loop:ralph-loop` 与 `/ralph-loop:cancel-ralph`。
>
> 需要在支持 `${WAVE_PLUGIN_ROOT}` 与 `${WAVE_ARGUMENTS_FILE}` 的 wave 上用
> （这两个占位符都是这次一起加的）。旧客户端上正文里的占位符不会替换，命令会
> 直接报「读不到参数文件」，不会悄悄跑错。

### 启动

```
/ralph-loop:ralph-loop <prompt> [--max-iterations N] [--completion-promise TEXT]
```

- `<prompt>`：**第 1 轮就执行**，之后每轮原样喂回。**逐字保留**：引号、`$`、`;`、`&&`、
  反引号、换行都不会被 shell 解析或改写 —— 参数经 `${WAVE_ARGUMENTS_FILE}` 传进脚本，
  整段文本从头到尾不经过 shell（见文末实现说明）。
- `--max-iterations N`：**总共跑 N 轮（含首个回合）**，也就是最多喂回 `N-1` 次，到点自动停。
  `0` 或不给 = 不限轮。语义与 Claude Code 的 ralph-loop 一致。同一个 flag 给多次，取最后一个（同 CC）。
- `--completion-promise TEXT`：模型输出 `<promise>TEXT</promise>` 时循环结束（逐字比较）。
- `--help` / `-h`：打印用法并退出，不会启动循环、不写状态文件。

轮次怎么数（和 CC 对齐）：

| 参数 | 总共跑 | 喂回次数 | 注入的提示行 |
|---|---|---|---|
| `--max-iterations 1` | 1 轮（就这一轮，当场干活） | 0 | 无 |
| `--max-iterations 2` | 2 轮 | 1 | 第 2 轮 |
| `--max-iterations 5` | 5 轮 | 4 | 第 2、3、4、5 轮 |
| 不给 / `0` | 不限 | 不限 | 第 2、3、4… 轮 |

**第 1 轮就是「敲下命令的那个回合」**：命令先把状态写好，然后模型当场开始执行
prompt，回合结束时才被 Stop hook 拦下。所以 `--max-iterations 1` 是「跑一次活就停」，
不会有任何回喂 —— 和 CC 一样。

setup 的输出会在摘要之后空一行、**回显 prompt 原文**（与 CC 的 setup 相同），模型
直接从命令返回里读到任务，不依赖它自己去翻上一条消息；回显的就是写进状态文件的那份
（逐字，含引号与换行），所以「模型看到的任务」与「每轮回喂的正文」逐字一致。设了完成条件时，
输出里还会补三行写法说明（逐字输出 `<promise>…</promise>`、没做到不许输出、
换别的说法不算数）。

例子：

```
/ralph-loop:ralph-loop 把 tests/ 下失败的用例逐个修到 npm test 全绿 --max-iterations 8 --completion-promise ALL TESTS PASS
```

### 取消

```
/ralph-loop:cancel-ralph
```

删除状态文件；当前回合结束后就不会再被喂回来了。

> ⚠️ **一定要给 `--max-iterations` 兜底。** 不给上限、又没设完成标记（或模型永远达不到）
> 时，这个循环会一直跑下去，每一轮都在花模型调用，只有你手动 `/ralph-loop:cancel-ralph`
> 或按 `Esc` 中断才会停。按 `Esc` 是立刻停下（引擎不跑 Stop hook），但状态文件还在，
> 下次这个会话结束回合时循环会被重新接上 —— 想彻底停就用 cancel 命令。

## 与 CC（Claude Code ralph-loop）的差异

默认一切以 CC 为准：参数语义（N = 总回合数）、首回合就干活、`--help`/`-h`、
重复 flag 后者覆盖、入口都是 `commands/*.md` + 内联 bash，都对齐了。下面这些是**刻意**
不一致的地方：

| 差异 | 为什么 |
|---|---|
| 状态文件放 `<cwd>/.wave/ralph-loop.local.md`，不是 `.claude/` | `.wave/` 是 wave 自己的项目级约定目录 |
| 支持 `--max-iterations=10` 等号形式 | 更符合 Unix 习惯；CC 的解析循环会把它当 prompt 正文（等于悄悄不设上限）。等号形式只是**多支持**一种写法，`--flag value` 的语义完全同 CC |
| 已有循环时**拒绝启动**，要求先 `/ralph-loop:cancel-ralph` | CC 是静默覆盖状态文件，会把正在跑的循环冲掉、且不告诉你旧 prompt 丢了 |
| 多行 prompt **原样保留换行** | CC 会把多行塌成一行，结构化 prompt（清单、代码块）会被毁掉 |
| Stop hook 用 `exit 2` + stderr，不是 `{"decision":"block"}` JSON | wave 的 hook 协议没有 `systemMessage` / `decision` 通道；「第几轮 / 怎么退出」只能折进喂回去的正文 |
| 命令名是 `/ralph-loop:ralph-loop` 而不是 `/ralph-loop` | wave 里插件贡献的斜杠命令一律带插件名前缀 |
| prompt 里的引号**原样保留**（CC 按 shell 规则剥掉成对引号：`"Fix it"` → `Fix it`） | CC 的参数拼进 shell，引号是语法；wave 的参数经 `${WAVE_ARGUMENTS_FILE}` 走文件，引号就是用户写下的正文字符，剥掉反而是改用户的话 |

## 适合什么任务

- **成功标准明确、能自动验证**：测试全绿、lint 干净、构建通过、某个脚本输出符合预期。
- **允许重复劳动**：同一段指令反复执行，每轮的产出落在文件里，下一轮在它之上继续。
- 典型：把失败的测试修绿、把迁移脚本一个个跑通、按清单把 N 个文件改成同一种写法。

不适合：

- **需求模糊 / 需要人来拍板**：循环不会让模糊变清晰，只会把模糊重复 N 遍。
- **纯探索、一次性的问答**：没有「完成标准」就没有终点。
- **需要跨会话协作、需要人中途审阅**的改动：它自己闷头跑，中途不听你指挥。
- **不可逆操作**（删数据、推远端、发版）：每轮都会再执行一次。

## 状态文件

`<cwd>/.wave/ralph-loop.local.md`（项目级，记得把它加进 `.gitignore`，
文件里是「当前跑到第几轮」，不该进版本库）：

```markdown
---
iteration: 2
max_iterations: 8
completion_promise: "ALL TESTS PASS"
session_id: "0f3c…"
---
把 tests/ 下失败的用例逐个修到 npm test 全绿
```

- **会话隔离**：`session_id` 与 Stop hook 输入里的 `session_id` 不一致时直接放行，
  同一项目里别的会话不会被这个循环卡住。启动时拿不到会话 id，所以先写空串，
  由本会话第一次 Stop hook 认领并写回。
- **`iteration` 的含义是「当前回合序号」，启动时写 `1`**（第 1 轮就是敲命令那个回合，
  与 CC 一致），不是「已回喂次数」。别把它当计数器从 0 起算，会让 `--max-iterations` 整体差一轮。
- **正文是 prompt 原文**：引号、`$`、换行一字不动（参数没经过 shell，也就没有 quote
  removal 这回事）。
- **iteration 原子更新**：写临时文件再 `rename`，避免 hook 与命令并发时读到半个文件。
- **脏文件即停**：`iteration` / `max_iterations` 不是非负整数、正文为空、frontmatter
  读不出来 ⇒ 删文件 + 放行。宁可停，也不要拿着看不懂的状态死循环。
- 想要的话可以把 `.wave/ralph-loop.local.md` 写进 `.gitignore`：它是运行时状态，
  不是配置。

## 两个已知的表现限制

1. **循环结束时的播报只进日志**：wave 的 Stop hook 只有 `exit 2` 能被模型看到，`exit 0`
   的 stderr 不会进对话。所以「已到 N 轮上限」「命中完成条件」「状态文件不合法」这些
   收尾信息写在 hook 日志里（`~/.wave/logs/`），用户界面上看到的是「这一轮正常结束了」。
2. **每轮喂回去的提示行对用户不可见**：它是 `isMeta` 的 user message，模型看得到
   （因此知道自己处在循环里），UI 不展示。第 1 轮本来就没有这行（它就是你敲命令那一轮）。

## 自测

```bash
node plugins/ralph-loop/scripts/self-test.mjs
```

直接跑真实的 hook 与 CLI 进程（不 mock），覆盖：没有状态文件、session 不匹配、脏文件、
到上限、完成标记命中、未命中继续（含 iteration 递增与 prompt 原样喂回）、参数经
`--args-file` 的完整性（引号、`$`、反引号、`;`、`&&` 都不丢也不执行、多行仍保留换行、
`$(…)` 不被当命令）、重复 flag 取最后一个、等号形式 `--max-iterations=10`、
缺 `--args-file` 时报错、会话认领、重复启动、cancel，
以及**与 CC 对齐的轮次语义**（`N=2` 只喂回 1 次、`N=1` 首回合就干活且零回喂、
`--help` 不写状态文件）。

## 实现说明（参数怎么进来）

入口和 CC 一样是 `commands/*.md` + 内联 bash：命令正文只做一件事 —— 把那行的输出
（状态文件的写入结果与 prompt 回显）摆到模型面前。参数不拼进命令行，而是走文件：

| 环节 | 做法 |
|---|---|
| 参数怎么进来 | 正文写 `--args-file "${WAVE_ARGUMENTS_FILE}"`。wave 把 `$ARGUMENTS` **原文**写进一个临时文件（`0600`，命令跑完立刻删除，成功失败都删），命令里只留这个路径 |
| 为什么走文件 | 命令行上只有一个路径词，prompt 里有什么都不影响 shell 怎么解析 —— 引号不是语法、`$` 不展开、反引号不会执行、`;` / `&&` 不会切成两条命令、多行也不会被折平；正文里有多个 `!` 命令也互不干扰（按调用各建一个文件） |
| 脚本怎么定位自己 | `node "${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js"`，`${WAVE_PLUGIN_ROOT}`（以及等价的 `${CLAUDE_PLUGIN_ROOT}`）对 `commands/*.md` 正文同样生效 |
| 权限 | 内联命令仍然过权限门，由 frontmatter 的 `allowed-tools: Bash(node *ralph-loop.js*)` 放行（命令形态固定，一条规则就够） |
| hook 与脚本 | 一律 node，不写 bash 脚本（Windows 上 `bash` 可能解析到 WSL 的），也不依赖 `jq` / `perl` |

脚本**不做** shell 的引号处理：不剥成对引号、不拆词。参数已经不是 shell 语法了，
再模仿一次只会把用户真写的引号吃掉。

## 目录

```
ralph-loop/
├── .wave-plugin/plugin.json
├── hooks/
│   ├── hooks.json          # Stop hook 声明
│   └── stop.js             # hook 入口（读 stdin → 判定 → 写回 / 收尾）
├── lib/
│   ├── state.js            # 状态文件解析、格式化、原子写、删除
│   └── loop.js             # 判定逻辑（纯函数，自测直接覆盖）
├── commands/
│   ├── ralph-loop.md       # /ralph-loop:ralph-loop
│   └── cancel-ralph.md     # /ralph-loop:cancel-ralph
└── scripts/
    ├── ralph-loop.js       # start / cancel（start 用 --args-file 读 prompt）
    └── self-test.mjs       # 自测
```
