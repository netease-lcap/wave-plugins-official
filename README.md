# wave-plugins-official

Wave 官方插件集合，包含多种 AI 辅助开发工具、文档处理、浏览器自动化、代码规范转换等能力。

## 插件列表

| 插件 | 描述 |
|------|------|
| **code2cwspec** | 从现有代码逆向生成为 CodeWave 格式的 spec.md + menus.md + TypeScript 实体/枚举声明文件 |
| **code2spec** | 分析代码仓库，自动识别功能模块并生成编号规格说明文档（多智能体架构） |
| **commit-skills** | 简化的 Git 工作流技能，支持提交、推送和创建 Pull Request |
| **deep-wiki** | AI 驱动的 Wiki 生成器，支持 Mermaid 图表、源码引用、入职指南和 llms.txt |
| **document-skills** | 文档处理套件，包含 Excel、Word、PowerPoint 和 PDF 处理能力 |
| **frontend-design** | 创建独特的、生产级前端界面，避免千篇一律的 AI 审美 |
| **superpowers** | AI 编程助手核心技能库：TDD、调试、协作模式和成熟技巧 |
| **tavily-search** | Tavily AI 驱动的搜索引擎 MCP 服务器，提供网络搜索能力 |
| **typescript-lsp** | TypeScript/JavaScript 语言服务器，提供代码智能提示 |
| **chrome-devtools** | Chrome DevTools Protocol MCP 服务器，用于浏览器自动化 |

## 插件市场管理

插件市场通过中央注册表文件进行管理：

- **市场注册表**: `.wave-plugin/marketplace.json`
- **插件配置**: `plugins/<plugin-name>/.wave-plugin/plugin.json`

### 添加新插件

1. 确保插件目录存在于 `plugins/` 下
2. 验证插件包含有效的 `.wave-plugin/plugin.json` 文件
3. 在 `.wave-plugin/marketplace.json` 的 `plugins` 数组中添加条目

```json
{
  "name": "plugin-name",
  "description": "插件简要描述",
  "source": "./plugins/plugin-name"
}
```

## 目录结构

```
wave-plugins-official/
├── .wave-plugin/
│   └── marketplace.json      # 插件市场注册表
├── plugins/
│   ├── code2cwspec/          # 代码转 CodeWave 规范
│   ├── code2spec/            # 代码转规格说明
│   ├── commit-skills/        # Git 工作流技能
│   ├── deep-wiki/            # Wiki 生成器
│   ├── document-skills/      # 文档处理套件
│   ├── frontend-design/      # 前端界面设计
│   ├── tavily-search/        # AI 搜索引擎
│   ├── typescript-lsp/       # TypeScript 语言服务器
│   └── chrome-devtools/      # 浏览器自动化
└── AGENTS.md                 # 插件市场管理说明
```
