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

### 启动

```
/ralph-loop:ralph-loop <prompt> [--max-iterations N] [--completion-promise TEXT]
```

- `<prompt>`：**第 1 轮就执行**，之后每轮原样喂回。成对引号按 shell 规则去掉
  （`"Fix the auth bug"` → `Fix the auth bug`），其余逐字保留 —— `$`、`;`、`&&`、换行、反引号都没问题。
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

**第 1 轮就是「敲下命令的那个回合」**：skill 先把状态写好，然后模型当场开始执行
prompt，回合结束时才被 Stop hook 拦下。所以 `--max-iterations 1` 是「跑一次活就停」，
不会有任何回喂 —— 和 CC 一样。

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
引号剥除、重复 flag 后者覆盖，都对齐了。下面这些是**刻意**不一致的地方：

| 差异 | 为什么 |
|---|---|
| 状态文件放 `<cwd>/.wave/ralph-loop.local.md`，不是 `.claude/` | `.wave/` 是 wave 自己的项目级约定目录 |
| 支持 `--max-iterations=10` 等号形式 | 更符合 Unix 习惯；CC 的解析循环会把它当 prompt 正文（等于悄悄不设上限）。等号形式只是**多支持**一种写法，`--flag value` 的语义完全同 CC |
| 已有循环时**拒绝启动**，要求先 `/ralph-loop:cancel-ralph` | CC 是静默覆盖状态文件，会把正在跑的循环冲掉、且不告诉你旧 prompt 丢了 |
| 多行 prompt **原样保留换行** | CC 会把多行塌成一行，结构化 prompt（清单、代码块）会被毁掉 |
| Stop hook 用 `exit 2` + stderr，不是 `{"decision":"block"}` JSON | wave 的 hook 协议没有 `systemMessage` / `decision` 通道；「第几轮 / 怎么退出」只能折进喂回去的正文 |
| 命令名是 `/ralph-loop:ralph-loop` 而不是 `/ralph-loop` | wave 里插件贡献的斜杠命令一律带插件名前缀 |
| 入口是 `skills/*/SKILL.md` 而不是 `commands/*.md` | wave 里 command 正文拿不到 `${WAVE_PLUGIN_ROOT}`，且内联 bash 受权限门控（见文末实现说明） |

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
- **正文是剥过引号的 prompt**：和 CC 一样做 shell 式 quote removal，只去成对引号，
  空白与换行一字不动。
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
到上限、完成标记命中、未命中继续（含 iteration 递增与 prompt 原样喂回）、参数经 stdin
的完整性（引号剥除、成对引号、词中引号、多行仍保留换行、`$` / `;` / `&&` 不被当命令）、
重复 flag 取最后一个、等号形式 `--max-iterations=10`、会话认领、重复启动、cancel，
以及**与 CC 对齐的轮次语义**（`N=2` 只喂回 1 次、`N=1` 首回合就干活且零回喂、
`--help` 不写状态文件）。

## 实现说明（为什么入口是 skill 而不是 commands/*.md）

任务书按 CC 的经验把入口设计成 `commands/*.md` + 内联 bash。在 wave 上实测（`wave 1.5.1`）
有三条硬事实让这条路走不通，于是入口改用 `skills/`，两个 skill 同样注册为带前缀的斜杠命令：

| 实测 | 结果 |
|---|---|
| 插件的 `commands/*.md` 正文里 `${WAVE_PLUGIN_ROOT}` | **不替换**，展开为空串 → `node /scripts/…` 必然找不到脚本。占位符只对 skills / hooks / MCP / LSP / subagents 生效（`builtin/skills/settings.ts` 的说明，`commandArgumentParser` 之外没有任何替换点） |
| 命令 / 技能正文里的内联 bash | 会过权限门 `createBashCommandGate`，默认模式下没有命中 allow 规则就**直接拒**（命令被静默跳过） |
| `$ARGUMENTS` 替换 | 原文替换、不加引号不转义（`commandArgumentParser.ts`），直接拼进 shell 会被 prompt 里的 `"` `'` `$` `;` `&&` 破坏 |

所以最终形态是：

- **参数走 stdin**。heredoc 用带引号的分隔符（`<<'WAVE_RALPH_ARGS'`），shell 不做任何展开，
  `$ARGUMENTS` 原文进 stdin，切分与解析全部在 node 里做（`scripts/ralph-loop.js`）。
- **内联命令是单一形态的 `node …/ralph-loop.js`**，靠 skill 的 `allowed-tools` 放行，
  而且规则刻意写成两条：
  - `Bash(node *ralph-loop.js*)` —— 普通情况（且 `cancel` 那种单条命令）；
  - `Bash(node *ralph-loop.js* <<'WAVE_RALPH_ARGS'*>*)` —— prompt 里出现 `>` 时。
    权限系统会把命令里的 `>` 当成写重定向，只给第一条规则会被判「有重定向的命令不能用
    无重定向的规则放行」而拒；第二条把放行范围钉死在「同一个 ralph-loop 脚本 + 同一个
    heredoc」，`node x/ralph-loop.js > /tmp/pwn` 这类真重定向仍然被拒。
- hook 与脚本一律 node，不写 bash 脚本（Windows 上 `bash` 可能解析到 WSL bash），
  也不依赖 `jq` / `perl`。

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
├── scripts/
│   ├── ralph-loop.js       # start / cancel（start 从 stdin 读 prompt）
│   └── self-test.mjs       # 自测
└── skills/
    ├── ralph-loop/SKILL.md     # /ralph-loop:ralph-loop
    └── cancel-ralph/SKILL.md   # /ralph-loop:cancel-ralph
```
