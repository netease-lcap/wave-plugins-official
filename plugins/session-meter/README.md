# session-meter

上下文用了几成、这一场累计花了多少 token。

## 用法

- `/ctx`：打开「用量」面板，同时把当前数字念一遍给模型听。
- 输入框下面常驻一行：`上下文 12%（24k/200k）`，每收到一次带 usage 的响应就更新（`session.measure`）。
- 面板每帧都现问一次 `$.session.usage()`，不缓存、不订阅。

## 面板里有什么

| 区块 | 内容 | 数据来源 |
| --- | --- | --- |
| 上下文 | 进度条 + `已用/窗口`（≥70% 转黄、≥90% 转红） | `$.session.usage().context` |
| 本场累计 | 输入 / 输出 / 缓存读 / 缓存写 | `$.session.usage().tokens` |
| 这条会话 | 轮次、已进行时长、模型、引擎版本、可用工具数 | `$.session.turns()` / `$.session.model()` / `$.session.version()` / `$.tool.list()` |

底部两个按钮：**复制数字**（`$.ui.copy`）、**刷新**（`$.ui.invalidate("ui.render")`）。

## 口径与边界

- **没有「花了多少钱」**：引擎没有成本账本，`$.session.usage()` 里也没有 `cost`，所以面板里不编一个金额。
- `tokens.prompt` **含**缓存命中的 token（上游 `prompt_tokens` 就是含的），缓存另有两项单列；别把它当 Claude Code 的 `input_tokens` 相加。
- 额度窗口（`rateLimits`）恒为空数组：还没有企业端的额度接口，面板里不画这一块。
- 上下文百分比是「最近一次带 usage 的响应报出的总数 / 压缩阈值」，不是窗口大小。
