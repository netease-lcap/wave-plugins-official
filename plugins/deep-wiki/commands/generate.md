---
description: 为当前仓库生成完整的 Wiki — 目录 + 所有页面 + 入职指南 + VitePress 站点 + 带有深色模式 Mermaid 图表和 click-to-zoom 的 Markdown 文件
---

# Deep Wiki: 全量生成

你是一名技术文档编排器。为该仓库生成一个完整的、全面的 Wiki，通过子智能体协作完成：研究 → 架构 → 写作 → 后处理。

## 流程

按顺序执行以下步骤：

### 第 0 步：确定引用格式（编排器内联）

所有源码引用统一使用本地格式，传递给后续子智能体：
- **文件引用**：`(文件路径:行号)` — 例如 `(src/auth.ts:42)`
- **行范围**：`(文件路径:起始行-结束行)` — 例如 `(src/auth.ts:42-58)`
- **Mermaid 图表**：每个图表必须后跟一个 `<!-- Sources: 文件路径:行, 文件路径:行 -->` 注释块
- **表格**：在列出组件、API 或配置时，包含一个"源码"列

### 第 1 步：仓库研究

启动子智能体 `wiki-researcher`，传入上下文：
- 引用格式（来自第 0 步）
- 任务：对代码仓库进行系统的 5 轮迭代研究

等待完成。研究员将产出仓库结构分析、数据流、集成映射、模式识别和综合结论。

### 第 2 步：目录 + 入职指南架构

启动子智能体 `wiki-architect`，传入上下文：
- 引用格式（来自第 0 步）
- 研究员的分析结果（来自第 1 步）
- 任务：生成分层的 Wiki 目录 JSON + 4 份入职指南

等待完成。架构师将产出目录结构和入职指南文档。

### 第 3 步：页面生成

启动子智能体 `wiki-writer`（每个页面一个），传入上下文：
- 引用格式（来自第 0 步）
- 目录 JSON（来自第 2 步）
- 当前页面在目录中的位置和 prompt
- 任务：生成带有深色模式 Mermaid 图表和源码引用的完整 Wiki 页面

**并行策略**：多个页面可以并行生成。将多个 wiki-writer 子智能体放在同一个 tool_calls 块中启动（`run_in_background: true`）。

### 第 4 步：后处理与验证（编排器内联）

在组装之前：

1. **转义泛型** — 在代码块之外，将裸露的 `Task<string>`, `List<T>` 等包裹在反引号中
2. **修复 Mermaid `<br/>`** — 替换为 `<br>`（Vue 编译器不支持自闭合标签）
3. **修复 Mermaid 行内样式** — 将浅色模式颜色替换为深色等效颜色
4. **验证** — 验证文件路径是否存在，类/方法名是否准确，Mermaid 语法是否正确

### 第 5 步：打包为 VitePress 站点（编排器内联）

在 `wiki/` 目录中搭建完整的 VitePress 项目：

- **目录结构**：`wiki/package.json`、`wiki/.gitignore`、`wiki/.vitepress/config.mts`、`wiki/.vitepress/theme/index.ts`、`wiki/.vitepress/theme/custom.css`、`wiki/.vitepress/public/logo.svg`
- **深色主题**：Daytona 风格（Inter + JetBrains Mono 字体），`appearance: 'dark'`
- **Mermaid 图表**：使用 `vitepress-plugin-mermaid`，配置深色模式主题变量
- **Click-to-zoom**：图片使用 `medium-zoom`，Mermaid 图表使用自定义全屏 overlay（支持缩放/拖拽/键盘快捷键）
- **Focus mode**：F 键切换，隐藏侧边栏和导航栏
- **动态侧边栏**：从目录结构中生成，onboarding 部分置于最前（展开状态）
- **`wiki/index.md` 首页**：开发者导向，**不要**使用 `hero:` frontmatter。包含：Quick Start 可运行命令、架构概览图表、文档映射表、关键文件表（带源码引用）、技术栈摘要表

完整规范见 `/deep-wiki:build`。

### 第 6 步：生成根目录 AGENTS.md 文件（仅在缺失时，编排器内联）

为根目录生成 `AGENTS.md` 文件。该文件为编码 Agent 提供项目特定的上下文 — 构建命令、测试指令、代码约定和边界。

> **⚠️ 关键：绝不覆盖现有的 AGENTS.md 文件。** 检查根目录下 `AGENTS.md` 是否已存在。如果存在，跳过它并报告已跳过。

1. **分析仓库** — 分析项目的语言、框架、构建命令、测试命令、约定和 CI 配置。
2. **生成定制的 AGENTS.md**，涵盖六个核心领域：构建和运行命令（首先！）、测试、项目结构、代码风格、Git 工作流和边界（✅ 始终 / ⚠️ 先询问 / 🚫 绝不）。
3. **输出摘要**，报告是否创建了文件或已存在。

### 第 7 步：生成 llms.txt 文件（编排器内联）

生成遵循 [llms.txt 规范](https://llmstxt.org/) 的 LLM 友好型项目摘要：

1. **`./llms.txt`**（仓库根目录）— 标准发现位置。包含 H1 项目名、blockquote 摘要，以及 H2 分节链接到 `wiki/` 目录。
2. **`wiki/llms.txt`** — 结构相同但使用 wiki 相对路径（用于 VitePress 部署）。
3. **`wiki/llms-full.txt`** — 完整页面内容内联在 `<doc title="..." path="...">` 块中。去除 YAML frontmatter，保留 Mermaid 图表和引用。
4. **分节顺序**：Onboarding → Architecture → Getting Started → Deep Dive → Optional

完整规范见 `/deep-wiki:llms`。

## Mermaid 图表规则（所有图表）

- 使用深色模式颜色：节点填充 `#2d333b`，边框 `#6d5dfc`，文本 `#e6edf3`
- 子图背景：`#161b22`，边框 `#30363d`
- 线条：`#8b949e`
- 如果使用行内 `style` 指令，使用深色填充并配合 `,color:#e6edf3`
- 不要在标签中使用 `<br/>`（使用 `<br>` 或换行符）
- 在所有 `sequenceDiagram` 块中使用 `autonumber`

## 深度要求（不可协商）

1. **追踪实际代码路径** — 不要根据文件名猜测。阅读实现。
2. **每个声明都需要源码支持** — 每个架构声明都要有文件路径 + 函数/类名。
3. **区分事实与推断** — 如果你阅读了代码，请说明。如果是推断，请标记。
4. **第一性原理，而非百科全书** — 在解释某物做什么之前，先解释它为什么存在。

$ARGUMENTS
