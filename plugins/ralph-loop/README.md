# ralph-loop

把同一段 prompt 一轮一轮喂回**同一个会话**，每轮都在上一轮留下的文件与 git 历史
上继续干，直到模型自己输出完成标记（或到达轮次上限）。

机制来自 Geoffrey Huntley 的 Ralph Wiggum 技术。行为上跟 Claude Code 的官方 ralph-loop
插件**思想一致**：同一条拦停通道（`{"decision":"block","reason":…}` + exit 0）、同一套参数
解析（`$ARGUMENTS` 交给 shell 分词）、同样的轮次语义、同样的「已有循环静默覆盖」。
**平台约定一律用 wave 自己的**——状态文件在 `.wave/`、插件清单在 `.wave-plugin/`、
根占位符是 `${WAVE_PLUGIN_ROOT}`、命令带插件名前缀——这些不参与兼容性，没必要改成 `.claude/`。

## 机制

```
/ralph-loop:ralph-loop <prompt> --max-iterations 5
        │
        ├─ 状态写入 .wave/ralph-loop.local.md（frontmatter 存参数，正文 = 原始 prompt）
        │
        ├─ 模型**当场开始执行 prompt**（这就是第 1 轮，不会先回一句「已就绪」）
        │
        └─ agent 干完一轮想停
              └─ Stop hook 拦下：iteration+1 写回，往 stdout 打一行
                 {"decision":"block","reason":"<原始 prompt>","systemMessage":"<给用户的一行>"} 并 exit 0
                    └─ wave 把 reason 作为一条 meta user message 注入会话，重开一轮
                          └─ 循环，直到命中 <promise>…</promise> / 到上限 / 手动取消
```

`reason` **就是原始 prompt，不带任何前缀**（与 CC 的 `stop-hook.sh` 一致）：模型每轮
看到的都是同一段话，进度全靠文件与 git 历史累积；「第几轮 / 怎么停」写在同一份 JSON 的
`systemMessage` 里，那是给**用户**看的。

轮次语义刻意与 CC 的 `setup-ralph-loop.sh` + `stop-hook.sh` 对齐：状态文件里的
`iteration` 是「当前回合序号」，启动时就是 `1`；Stop hook 在自增**之前**判
`iteration >= max_iterations`，否则写回 `iteration + 1`，并把**新**序号写进
`systemMessage`（第一次回喂显示「第 2 轮」，同 CC 的 `Ralph iteration 2`）。所以
`--max-iterations N` = 总共 N 个回合（含首回合）= `N-1` 次回喂。

wave 侧的关键契约（都在 `wave-agent` 的 agent-sdk 里）：

- Stop hook 的「阻止停止 + 继续对话」= stdout 打 `{"decision":"block","reason":…}` 并
  `exit 0`（`managers/hookManager.ts` 的 `extractStopBlockReason`）。与 CC 同名字段同语义；
  `reason` 会作为一条 meta user message 注入，重开一轮。`exit 2` + stderr 那条老通道
  仍然优先，只是本插件不再用。
- Stop hook 的 stdin 是 JSON，其中 `last_assistant_message` 是最后一条 assistant 的纯文本，
  所以判完成标记直接读它，**不用解析 transcript**。`stop_hook_active` / `permission_mode`
  也在这个 JSON 里；本插件不依赖它们（CC 的 ralph-loop 同样不用，靠 iteration 自限）。
- 用户按 `Esc` 中断时引擎根本不执行 Stop hook，所以「中断即停」是白送的，hook 里不需要
  写中断判据。
- 同一份 JSON 里的 `systemMessage` = 在对话里给**用户**显示一行提示（模型看不到）。
  `reason` 给模型、`systemMessage` 给用户，两者互不干扰（详见「播报可见性」）。

## 用法

> wave 里插件贡献的斜杠命令一律带插件名前缀，所以命令实际是
> `/ralph-loop:ralph-loop` 与 `/ralph-loop:cancel-ralph`。
>
> 需要支持 `${WAVE_PLUGIN_ROOT}` 与 Stop hook `decision:block` 通道的 wave（本仓
> 一同提交的那版 agent-sdk 起）。旧客户端上不会有隐藏的降级：`${WAVE_PLUGIN_ROOT}`
> 不替换会直接报错，而 `decision` 不认会静默放行（循环停下、不报错）——所以别在旧版上跑。
>
> 想先弄明白这东西是什么、手上的活适不适合交给它：`/ralph-loop:help`（纯讲解，
> 不启动循环、不碰项目文件）。参数细节看 `/ralph-loop:ralph-loop --help`。

### 启动

```
/ralph-loop:ralph-loop <prompt> [--max-iterations N] [--completion-promise TEXT]
```

- `<prompt>`：**第 1 轮就执行**，之后每轮原样喂回。参数像 CC 一样交给 shell 分词
  （命令里是 `start $ARGUMENTS`，`$ARGUMENTS` 不加引号），所以：成对引号会被剥掉、
  连续空白与换行会被折成单个空格、`$` / 反引号 / `;` / `&&` 会被 shell 当成语法
  —— **别把这类东西写进 prompt，除非你确实想让它被 shell 处理**。要保留多行结构，
  先把 prompt 写进文件，再用一句话让模型去读那个文件。
- `--max-iterations N`：**总共跑 N 轮（含首个回合）**，也就是最多喂回 `N-1` 次，到点自动停。
  `0` 或不给 = 不限轮。语义与 Claude Code 的 ralph-loop 一致。同一个 flag 给多次，取最后一个（同 CC）。
- `--completion-promise TEXT`：模型输出 `<promise>TEXT</promise>` 时循环结束（逐字比较）。
  **TEXT 含空格时必须整体加引号**（`--completion-promise "ALL TESTS PASS"`）；不加引号只取到
  第一个词，多出来的词会被并回 prompt 正文。
- `--help` / `-h`：打印用法并退出，不会启动循环、不写状态文件。

轮次怎么数（和 CC 对齐）：

| 参数 | 总共跑 | 喂回次数 | 播报里的轮次 |
|---|---|---|---|
| `--max-iterations 1` | 1 轮（就这一轮，当场干活） | 0 | 无 |
| `--max-iterations 2` | 2 轮 | 1 | 第 2 轮 |
| `--max-iterations 5` | 5 轮 | 4 | 第 2、3、4、5 轮 |
| 不给 / `0` | 不限 | 不限 | 第 2、3、4… 轮 |

**第 1 轮就是「敲下命令的那个回合」**：命令先把状态写好，然后模型当场开始执行
prompt，回合结束时才被 Stop hook 拦下。所以 `--max-iterations 1` 是「跑一次活就停」，
不会有任何回喂 —— 和 CC 一样。

setup 的输出会在摘要之后空一行、**回显 prompt**（与 CC 的 setup 相同，CC 是 `echo "$PROMPT"`），
模型直接从命令返回里读到任务，不依赖它自己去翻上一条消息；回显的就是写进状态文件的那份
（shell 分词后拼回来的词表），所以「模型看到的任务」与「每轮回喂的 `reason`」逐字一致。
设了完成条件时，输出里还会补三行写法说明（逐字输出 `<promise>…</promise>`、没做到不许输出、
换别的说法不算数）。

例子：

```
/ralph-loop:ralph-loop 把 tests/ 下失败的用例逐个修到 npm test 全绿 --max-iterations 8 --completion-promise "ALL TESTS PASS"
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

## 挂后台跑之前

Ralph 循环想的是「无人值守跑 N 轮」，但**权限门仍然逐次拦**——这一点插件绕不过去，
先看清楚再让它跑：

1. **默认（`default` / `plan`）权限模式下，每一轮里模型自己的工具调用照样会弹权限窗。**
   循环只负责把 prompt 喂回去，管不到模型这一轮要调什么；一轮里模型调 10 次工具，你
   就得点 10 次（不同轮之间也一样）。想真的无人值守，启动时把权限模式换成
   `acceptEdits`（自动接受文件编辑）或 `bypassPermissions`（全放行，慎用）——这是真机
   实测行为，不是插件的 bug，也不是 hook 能替用户点掉的。留在默认模式跑长循环，你会
   守在一堆权限窗前面，循环还会因为某次拒绝而空转。（`dontAsk` 并不更好：它不弹窗，
   但直接把没被规则放行的工具**自动拒绝**掉，循环会在同一处反复失败。）
2. **把 `.wave/` 加进项目的 `.gitignore`。** 循环期间会有一个未跟踪的
   `.wave/ralph-loop.local.md`（每轮都在改），不 ignore 的话它会一直挂在 `git status`
   里，还容易被顺手 `git add` 进去：

   ```gitignore
   # ralph-loop 的运行时状态
   .wave/
   ```

   （只想忽略状态文件本身、保留 `.wave/` 下别的东西，就写 `.wave/ralph-loop.local.md`。）

循环本身不常驻任何进程：它靠 Stop hook 触发，你把会话晾着就行，不用守着终端。
但「无人值守」和「每一步都能审」是互斥的两件事 —— 要后者就留在默认权限模式，
接受那一堆权限窗。

## 与 CC（Claude Code ralph-loop）的差异

**行为**全部以 CC 为准：`{"decision":"block","reason":…}` + `exit 0` 拦停、`reason` 就是
原始 prompt 不带前缀、`start $ARGUMENTS` 走 shell 分词、`--max-iterations N` = 总回合数、
首回合就干活、`--help`/`-h`、重复 flag 后者覆盖、已有循环静默覆盖、未知 flag 落进 prompt、
`--max-iterations=10` 不认（当 prompt 正文）、`.wave/` 状态文件名 `ralph-loop.local.md`、
`commands/*.md` + 内联 bash 的入口形态。

**平台约定**不跟着改（这些对齐了也没有兼容性收益）：

| 差异 | 为什么 |
|---|---|
| 状态文件在 `<cwd>/.wave/ralph-loop.local.md`，不是 `.claude/` | `.wave/` 是 wave 自己的项目级约定目录。而且格式不同（我们没有 `active: true`），路径相同也跑不通 CC 的 hook，反而会让两个插件在同一仓库里共用一份状态 |
| 插件清单在 `.wave-plugin/plugin.json`，根占位符是 `${WAVE_PLUGIN_ROOT}` | wave 的插件格式（`${CLAUDE_PLUGIN_ROOT}` 也兼容） |
| 命令名是 `/ralph-loop:ralph-loop` 而不是 `/ralph-loop` | wave 里插件贡献的斜杠命令一律带插件名前缀 |

CC 那几个「它这么做、你最好也别学」的地方，我们跟着一起学了，因为一致性比单点改进更重要：
参数经 shell ⇒ prompt 里的引号/多行会被改写（对 CC 用户是既有事实，写法上的应对也一致：
多行任务先落文件）；`--help` 文案里带完整 `<promise>TEXT</promise>` ⇒ 循环运行中问用法、
被模型原样转述时理论上可能被当成完成标记（占位符 `TEXT` 只在用户真把完成标记设成
`TEXT` 时才误判）。`scripts/self-test.mjs` 里有一条断言钉住「文案里就是完整标签」，
免得以后有人单方面「修好」又跟 CC 不一致。

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

`<cwd>/.wave/ralph-loop.local.md`（与 CC 同路径、同文件名；项目级，记得把它加进
`.gitignore`，文件里是「当前跑到第几轮」，不该进版本库）：

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
- **正文是 prompt**：shell 分词之后、用单个空格拼回来的那份（与 CC 的
  `PROMPT_PARTS[*]` 相同）。引号已被 shell 剥掉、换行已被折平，脚本不再做二次处理
  —— 也不该做，否则等于把 shell 已经解释过的东西再解释一遍。
- **iteration 原子更新**：写临时文件再 `rename`，避免 hook 与命令并发时读到半个文件。
- **脏文件即停**：`iteration` / `max_iterations` 不是非负整数、正文为空、frontmatter
  读不出来 ⇒ 删文件 + 放行。宁可停，也不要拿着看不懂的状态死循环。
- `.wave/` 建议直接进 `.gitignore`（循环期间会多出一个未跟踪的状态文件，
  见「挂后台跑之前」）：它是运行时状态，不是配置。

## 播报可见性（谁看到哪一句）

一份 JSON 两个字段，各管一头，别指望它们互换：

| 场景 | 用户看到 | 模型看到 |
|---|---|---|
| 每轮继续（`decision:block`） | `systemMessage`：`🔄 Ralph 第 N 轮 \| 想停：…` | `reason`：**原始 prompt，一字不加**（注入成一条 meta user message） |
| 收尾（到上限 / 命中完成条件 / 脏文件 / hook 异常） | `systemMessage`：`Ralph 循环已结束…` | 什么也看不到（`exit 0`、没有 `decision`，正常结束这一回合） |

- 注入的那条 meta user message 对用户仍然隐藏（`isMeta`，UI 不展示）；`systemMessage`
  是**另加**的一行，不是把它显示出来。
- 模型因此看不到「这是第几轮、还能跑几轮」——与 CC 完全一致。想让它知道，就把这类
  信息写进 prompt 本身（它是每轮固定不变的那段话）。
- 收尾那行同时写进了 stderr（hook 日志），所以事后也能在 `~/.wave/logs/` 里查到。

## 自测

```bash
node plugins/ralph-loop/scripts/self-test.mjs
```

直接跑真实的 hook 与 CLI 进程（不 mock），覆盖：没有状态文件、session 不匹配、脏文件、
到上限、完成标记命中、未命中继续（iteration 递增、`reason` 就是原始 prompt 且不带前缀）、
**参数解析与 CC 同一套规则**（多词用单空格拼回、引号里出现的 flag 字样不被解析、
重复 flag 取最后一个、未知 flag 落进 prompt、`--max-iterations=10` 不认、缺值/非法值
点名报错、空 prompt 给用法）、会话认领、**已有循环静默覆盖**、cancel，
**与 CC 对齐的轮次语义**（`N=2` 只喂回 1 次、`N=1` 首回合就干活且零回喂、
`--help` 不写状态文件且文案里是完整 `<promise>TEXT</promise>`），以及
**`decision` / `systemMessage` 各就各位**（继续 ⇒ `decision:block` + exit 0；
收尾 ⇒ 只有 `systemMessage`、没有 `decision`；`stop_hook_active` 传进来也不改变行为）。

用例跑在 `mkdtempSync` 建的临时目录里，整段包在 `try/finally` 中统一 `rmSync` 删除 ——
断言失败或抛异常也不会在 `/tmp` 里留垃圾。

## 实现说明（参数怎么进来）

入口和 CC 一样是 `commands/*.md` + 内联 bash：命令正文只做一件事 —— 把那行的输出
（状态文件的写入结果与 prompt 回显）摆到模型面前。参数也像 CC 一样**交给 shell**：

| 环节 | 做法 |
|---|---|
| 参数怎么进来 | 正文写 `node "${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js" start $ARGUMENTS`，`$ARGUMENTS` **不加引号**（CC 的 `setup-ralph-loop.sh $ARGUMENTS` 也是不加引号的） |
| 谁来分词 | shell。脚本拿到的是已经拆好的 argv：成对引号剥除、连续空白折叠、多行折平 —— 这正是 CC 的行为，脚本里**没有**第二套引号状态机 |
| 脚本怎么定位自己 | `node "${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js"`，`${WAVE_PLUGIN_ROOT}`（以及等价的 `${CLAUDE_PLUGIN_ROOT}`）对 `commands/*.md` 正文生效 |
| 权限 | 内联命令仍然过权限门，由 frontmatter 的 `allowed-tools: Bash(node *ralph-loop.js*)` 放行（命令形态固定，一条规则就够） |
| hook 与脚本 | 一律 node，不写 bash 脚本（Windows 上 `bash` 可能解析到 WSL 的），也不依赖 `jq` / `perl` |

脚本只做 flag 拆分：认识 `--max-iterations` / `--completion-promise` / `--help`，其余
**一律当 prompt 正文**（出现未知 flag 不能把用户的任务拒掉，与 CC 相同）；剩下的词用
单个空格拼回一句。

> ⚠️ 因此 prompt 里不要出现 `;`、`&&`、`$`、反引号 —— 它们会被 shell 先解释一遍
> （CC 上完全一样）。多行/带特殊字符的任务，先写成文件再让模型去读。
> `--help` 的用法文案里刻意保留完整的 `<promise>TEXT</promise>`（CC 同样如此），
> `scripts/self-test.mjs` 有一条断言钉住它，别单方面改成拆三段。

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
│   ├── cancel-ralph.md     # /ralph-loop:cancel-ralph
│   └── help.md             # /ralph-loop:help（只讲解，不启动循环）
└── scripts/
    ├── ralph-loop.js       # start / cancel（start 按 argv 解析 prompt 与选项）
    └── self-test.mjs       # 自测
```
