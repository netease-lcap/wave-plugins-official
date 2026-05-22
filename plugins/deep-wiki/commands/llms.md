---
description: 为 Wiki 生成 llms.txt 和 llms-full.txt 文件 — 遵循 llms.txt 规范的 LLM 友好型项目摘要
---

# Deep Wiki: 生成 llms.txt

生成遵循 [llms.txt 规范](https://llmstxt.org/) 的 `llms.txt` 和 `llms-full.txt` 文件，为 Wiki 文档提供 LLM 友好的访问方式。

## 什么是 llms.txt

`llms.txt` 是一个标准化 Markdown 文件，帮助 LLM 快速理解项目。它提供：

- 简洁的项目摘要
- 关键文档文件的链接和简短描述
- 结构化分节（Onboarding、Architecture、API 等）

生成两个文件：

| 文件 | 用途 | 大小 |
|------|------|------|
| `llms.txt` | 链接 + 简短描述 — 适合小上下文窗口 | 小（1-5 KB） |
| `llms-full.txt` | 所有链接页面的完整内联内容 | 大（50-500 KB） |

## 第 1 步：收集项目上下文

扫描仓库和现有 Wiki（如果已生成），收集：

1. **项目标识** — 名称、一句话描述、主要语言、关键技术
2. **Wiki 页面** — 扫描 `wiki/` 目录中所有生成的 `.md` 文件
3. **入职指南** — 检查 `onboarding/` 文件夹中面向不同受众的指南
4. **README** — 提取核心项目描述
5. **关键入口点** — 主文件、API 表面、配置

## 第 2 步：生成 `llms.txt`

创建 `wiki/llms.txt`，遵循 llms.txt 规范格式：

```markdown
# {项目名称}

> {一段落摘要：它做什么、为谁、关键技术。信息密度高。}

{2-3 段重要背景：架构哲学、关键约束、此项目的独特之处。包括 LLM 准确回答此项目问题所需知道的非显而易见的事项。}

## Onboarding

- [{贡献者指南}](./onboarding/contributor-guide.md): 新贡献者的分步指南 — 环境搭建、首个任务、测试和编码规范
- [{资深工程师指南}](./onboarding/staff-engineer-guide.md): 面向资深工程师的架构深入 — 设计决策、领域模型、组件类型和故障模式
- [{主管指南}](./onboarding/executive-guide.md): 面向工程领导的能力概览 — 风险评估、技术投资和技术扩展模型
- [{产品经理指南}](./onboarding/product-manager-guide.md): 面向 PM 的功能导向指南 — 用户旅程、能力、限制和数据/隐私

## Architecture

- [{架构概览}](./02-architecture/overview.md): 系统架构、组件边界和部署拓扑
- [{数据模型}](./02-architecture/data-model.md): 核心实体、关系和数据不变式
- [{API 参考}](./02-architecture/api-reference.md): 端点、认证和线路格式

## Getting Started

- [{搭建指南}](./01-getting-started/setup.md): 先决条件、安装和首次运行
- [{配置}](./01-getting-started/configuration.md): 环境变量、功能开关和配置文件

## Deep Dive

- [{组件名称}](./03-deep-dive/component.md): 描述组件的目的和范围
- ...更多页面...

## Optional

- [{变更日志}](./changelog.md): 近期变更和版本历史
- [{贡献指南}](./contributing.md): 如何为项目做出贡献
```

### llms.txt 规则

1. **H1** — 项目名称（必须，仅一个）
2. **Blockquote** — 密集的一段落摘要（必须）
3. **背景段落** — 重要说明、约束、非显而易见的事项（推荐）
4. **H2 分节** — 每个包含 Markdown 列表的 `[标题](url): 描述` 条目
5. **"Optional" 分节** — 特殊含义：这些链接可以为较短的上下文窗口跳过。将变更日志、贡献指南和补充材料放在这里。
6. **所有链接都是相对的** — 相对于 wiki 目录（例如 `./onboarding/contributor-guide.md`）
7. **描述简洁** — 每个链接一句话，信息丰富而非通用
8. **顺序重要** — 将最重要的分节放在最前（Onboarding → Architecture → Getting Started → Deep Dive → Optional）
9. **动态内容** — 从实际生成的 Wiki 目录中派生所有分节名称和页面标题

### 内容质量

- Blockquote 摘要应该**密集且具体** — 不是"一个做某事的项目"而是"一个基于 Orleans 虚拟角色的分布式任务编排引擎，为 Azure 托管的微服务提供可靠的至少一次交付保证的工作流执行"
- 背景段落应包括**非显而易见的约束** — 没有被告知 LLM 会答错的事情（例如"虽然 API 表面类似于 FastAPI，但它使用不支持依赖注入的自定义路由器"）
- 链接描述应该告诉读者**他们会学到什么**，而不是仅仅重述标题

## 第 3 步：生成 `llms-full.txt`

创建 `wiki/llms-full.txt` — 与 `llms.txt` 结构相同，但使用 XML 风格标签内联完整页面内容。

### 格式

```markdown
# {项目名称}

> {与 llms.txt 相同的 blockquote 摘要}

{与 llms.txt 相同的背景段落}

## Onboarding

<doc title="{贡献者指南}" path="onboarding/contributor-guide.md">
{contributor-guide.md 的完整 Markdown 内容}
</doc>

<doc title="{资深工程师指南}" path="onboarding/staff-engineer-guide.md">
{staff-engineer-guide.md 的完整 Markdown 内容}
</doc>

...

## Architecture

<doc title="{架构概览}" path="02-architecture/overview.md">
{overview.md 的完整 Markdown 内容}
</doc>

...

## Optional

<doc title="{变更日志}" path="changelog.md">
{changelog.md 的完整 Markdown 内容}
</doc>
```

### llms-full.txt 规则

1. **与 `llms.txt` 相同的 H1、blockquote 和背景**
2. **用 `<doc>` 块替换链接列表**，包含完整的页面内容
3. **每个 `<doc>` 标签** 有 `title` 和 `path` 属性
4. **去除 VitePress frontmatter**（YAML `---` 块）从内联内容中
5. **保留 Mermaid 图表** — 按原样保留在 `<doc>` 块中
6. **保留引用** — 所有本地引用格式保持原样
7. **保留表格** — 所有 Markdown 表格保持原样
8. **与 `llms.txt` 相同的分节顺序**
9. **"Optional" 分节** — 仍然存在，但读者/工具可以跳过以节省上下文

## 第 4 步：验证

生成两个文件后，验证：

1. **`llms.txt` 中的所有链接指向 wiki 目录中存在的文件**
2. **`llms-full.txt` 中的所有 `<doc>` 块包含实际内容**（非空或占位符）
3. **blockquote 摘要对此项目是具体的**（不是通用的）
4. **分节排序匹配**：Onboarding → Architecture → Getting Started → Deep Dive → Optional
5. **无重复条目** — 每个 Wiki 页面恰好出现在一个分节中
6. **文件大小合理** — `llms.txt` 应为 1-5 KB，`llms-full.txt` 应包含所有 Wiki 页面

## 输出

生成三个文件：

```
./llms.txt                # 根级发现文件（仓库标准路径）
wiki/
├── llms.txt              # 链接 + 描述（用于 VitePress 站点）
└── llms-full.txt         # 完整内联内容（综合参考）
```

### 根级 `./llms.txt`（发现文件）

根级 `./llms.txt` 是**标准发现位置**，遵循 llms.txt 规范。编码 Agent 和工具（包括 GitHub MCP 服务器的 `get_file_contents` 和 `search_code`）会在仓库根目录查找 `/llms.txt`。此文件应与 `wiki/llms.txt` 相同，但链接调整为指向 `wiki/` 目录：

```markdown
- [{页面标题}](./wiki/onboarding/contributor-guide.md): 描述
```

如果根级 `llms.txt` 已存在且**不是**由 deep-wiki 生成的，**不要覆盖它** — 报告它已被跳过。

报告摘要：

```
## llms.txt 生成报告

- `./llms.txt` — 根级发现文件，{N} 个分节，{M} 个链接页面
- `wiki/llms.txt` — {N} 个分节，{M} 个链接页面，{size} KB
- `wiki/llms-full.txt` — {N} 个分节，{M} 个内联页面，{size} KB

### 分节
| 分节 | 页面 | 备注 |
|------|------|------|
| Onboarding | 4 | 所有面向不同受众的指南 |
| Architecture | {N} | 核心架构页面 |
| Getting Started | {N} | 搭建和配置 |
| Deep Dive | {N} | 组件文档 |
| Optional | {N} | 变更日志、贡献指南 |
```

$ARGUMENTS
