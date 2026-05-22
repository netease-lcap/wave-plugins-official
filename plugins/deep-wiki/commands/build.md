---
description: 将生成的 Wiki Markdown 页面打包为 VitePress 站点 — 深色主题、深色模式 Mermaid 图表和 click-to-zoom
---

# Deep Wiki: 构建 VitePress 站点

将生成的 Wiki Markdown 文件打包为完整的 VitePress 站点，包含 Daytona 风格深色主题、深色模式 Mermaid 图表以及图表和图像的 click-to-zoom 功能。

## 前置条件

Wiki Markdown 文件应已存在（来自 `/deep-wiki:generate` 或手动创建）。此命令在其周围搭建 VitePress 项目。

## 第 1 步：搭建 VitePress 项目

创建 `wiki/` 目录，结构如下：

```
wiki/
├── package.json
├── .gitignore
├── AGENTS.md                          # Wiki 文件夹的 Agent 指令
├── index.md                           # Wiki 首页（非占位符 — 见下文）
├── llms.txt                           # LLM 友好链接 + 描述
├── llms-full.txt                      # LLM 友好完整内联内容
├── onboarding/                        # 面向不同受众的入职指南
│   ├── index.md                       # 入职指南选择页
│   ├── contributor-guide.md           # 面向新贡献者
│   ├── staff-engineer-guide.md        # 面向资深/首席工程师
│   ├── executive-guide.md             # 面向工程领导
│   └── product-manager-guide.md       # 面向产品经理
├── {NN}-{section-name}/               # 编号分区文件夹
│   ├── {page-name}.md
│   └── ...
├── .vitepress/
│   ├── config.mts                     # 完整 VitePress 配置
│   ├── public/
│   │   ├── logo.svg                   # 品牌 Logo
│   │   ├── llms.txt                   # 部署后提供在 /llms.txt
│   │   └── llms-full.txt              # 部署后提供在 /llms-full.txt
│   └── theme/
│       ├── index.ts                   # 主题设置（zoom 处理程序）
│       └── custom.css                 # 完整深色主题 + Mermaid + zoom CSS
```

### index.md — Wiki 首页（关键）

`index.md` **必须是**开发者导向的 Wiki 首页 — **不是营销落地页**。不使用 `hero:` frontmatter、标语或 CTA 按钮。

生成结构：

```markdown
---
title: 项目名称 — 文档
description: 项目名称的技术文档
---

# 项目名称

[1-2 句技术描述]

## Quick Start

\`\`\`bash
# 实际的仓库命令
git clone <repo-url>
cd <repo>
npm install && npm run dev
\`\`\`

## Architecture Overview

\`\`\`mermaid
graph LR
  A[组件 A] --> B[组件 B]
  B --> C[组件 C]
\`\`\`
<!-- Sources: src/app.ts:1, src/server.ts:1 -->

## Documentation Map

| Section | Description |
|---------|-------------|
| [Onboarding](./onboarding/) | 面向贡献者、资深工程师、领导和产品经理的指南 |
| [Getting Started](./01-getting-started/) | 搭建、配置、入门 |
| [Architecture](./02-architecture/) | 系统设计、数据流、组件 |
| ... | ... |

## Key Files

| File | Purpose | Source |
|------|---------|--------|
| `src/main.ts` | 应用入口 | (src/main.ts:1) |
| ... | ... | ... |

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| TypeScript | 主要语言 |
| ... | ... |
```

**不要包含：**
- VitePress `hero:` frontmatter
- 营销文案（"强大的"、"极快的"、"企业级"）
- 功能卡片或徽章
- "开始使用" CTA 按钮

**必须包含：**
- 实际的 Quick Start 可运行命令
- 带源码引用的架构图
- 链接到所有 Wiki 分节的文档映射表
- 带源码引用的关键文件表
- 技术栈摘要表

### package.json

```json
{
  "name": "wiki",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vitepress dev",
    "build": "vitepress build",
    "preview": "vitepress preview"
  },
  "devDependencies": {
    "medium-zoom": "^1.1.0",
    "mermaid": "^11.12.2",
    "vitepress": "^1.6.4",
    "vitepress-plugin-mermaid": "^2.0.17"
  }
}
```

### .gitignore

```
node_modules/
.vitepress/cache/
.vitepress/dist/
```

## 第 2 步：VitePress 配置（config.mts）

配置必须：

- 使用 `withMermaid()` 包装（来自 `vitepress-plugin-mermaid`）
- 设置 `ignoreDeadLinks: true`（Wiki 页面引用内部源路径）
- 通过 head link 加载 Inter + JetBrains Mono 字体
- 设置 `appearance: 'dark'`（仅深色模式）
- 从生成的分节结构动态配置侧边栏
- Onboarding 分节置于最前（展开状态）
- 设置 `outline: { level: [2, 3] }`
- 启用 `markdown: { lineNumbers: true }`
- 包含 `vite: { optimizeDeps: { include: ['mermaid'] } }`
- 设置全面的 Mermaid 深色模式 `themeVariables`：

```typescript
mermaid: {
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#0d1117',
    primaryColor: '#2d333b',
    primaryTextColor: '#e6edf3',
    primaryBorderColor: '#6d5dfc',
    secondaryColor: '#1c2333',
    secondaryTextColor: '#e6edf3',
    secondaryBorderColor: '#6d5dfc',
    tertiaryColor: '#161b22',
    tertiaryTextColor: '#e6edf3',
    tertiaryBorderColor: '#30363d',
    lineColor: '#8b949e',
    textColor: '#e6edf3',
    mainBkg: '#2d333b',
    nodeBkg: '#2d333b',
    nodeBorder: '#6d5dfc',
    nodeTextColor: '#e6edf3',
    clusterBkg: '#161b22',
    clusterBorder: '#30363d',
    titleColor: '#e6edf3',
    edgeLabelBackground: '#1c2333',
    actorBkg: '#2d333b',
    actorTextColor: '#e6edf3',
    actorBorder: '#6d5dfc',
    actorLineColor: '#8b949e',
    signalColor: '#e6edf3',
    signalTextColor: '#e6edf3',
    labelBoxBkgColor: '#2d333b',
    labelBoxBorderColor: '#6d5dfc',
    labelTextColor: '#e6edf3',
    loopTextColor: '#e6edf3',
    activationBorderColor: '#6d5dfc',
    activationBkgColor: '#1c2333',
    sequenceNumberColor: '#e6edf3',
    noteBkgColor: '#2d333b',
    noteTextColor: '#e6edf3',
    noteBorderColor: '#6d5dfc',
    classText: '#e6edf3',
    labelColor: '#e6edf3',
    altBackground: '#161b22',
  },
},
```

### 动态侧边栏生成

扫描生成的 Markdown 文件并构建侧边栏配置：

- ONBOARDING 分节始终在最前（展开），包含四份入职指南
- 然后是编号分节：`01-getting-started`、`02-architecture` 等
- 每个分节成为一个可折叠组
- 前 3-4 个分节展开，其余折叠

## 第 3 步：主题设置（theme/index.ts）

实现两个缩放系统和一个专注模式切换：

### 图像缩放（medium-zoom）
```typescript
import mediumZoom from 'medium-zoom'
// 应用于所有图片：mediumZoom('.vp-doc img:not(.no-zoom)', { background: 'rgba(0, 0, 0, 0.92)' })
```

### Mermaid 图表缩放（自定义 SVG overlay — 关键）

Mermaid 渲染的是 `<svg>` 而不是 `<img>`，所以 medium-zoom 不适用。必须实现自定义全屏 overlay。

```typescript
// 在 setup() 中，enhanceApp 或 theme/index.ts 内
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import mediumZoom from 'medium-zoom'
import './custom.css'

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()

    const initZoom = () => {
      // Image zoom
      mediumZoom('.vp-doc img:not(.no-zoom)', {
        background: 'rgba(0, 0, 0, 0.92)',
      })

      // Mermaid diagram zoom — 轮询异步渲染的 SVG
      const attachMermaidZoom = (retries = 0) => {
        const diagrams = document.querySelectorAll('.mermaid')
        if (diagrams.length === 0 && retries < 20) {
          setTimeout(() => attachMermaidZoom(retries + 1), 500)
          return
        }

        diagrams.forEach((container) => {
          if (container.getAttribute('data-zoom-attached')) return
          container.setAttribute('data-zoom-attached', 'true')
          container.style.cursor = 'pointer'

          container.addEventListener('click', () => {
            const svg = container.querySelector('svg')
            if (!svg) return
            openDiagramModal(svg)
          })
        })
      }
      attachMermaidZoom()
    }

    const openDiagramModal = (svg: SVGSVGElement) => {
      // 创建 overlay
      const overlay = document.createElement('div')
      overlay.className = 'diagram-zoom-overlay'

      const wrapper = document.createElement('div')
      wrapper.className = 'diagram-zoom-wrapper'

      const controls = document.createElement('div')
      controls.className = 'diagram-zoom-controls'
      controls.innerHTML = `
        <button class="zoom-btn" data-action="zoom-in" title="Zoom in (+)">+</button>
        <button class="zoom-btn" data-action="zoom-out" title="Zoom out (-)">−</button>
        <button class="zoom-btn" data-action="zoom-reset" title="Reset (0)">Reset</button>
        <button class="zoom-btn zoom-close" data-action="close" title="Close (Esc)">✕</button>
      `

      const content = document.createElement('div')
      content.className = 'diagram-zoom-content'
      const cloned = svg.cloneNode(true) as SVGSVGElement

      // 修复缺失的 viewBox
      if (!cloned.getAttribute('viewBox')) {
        const bbox = svg.getBBox()
        cloned.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
      }
      cloned.style.width = '100%'
      cloned.style.height = 'auto'
      cloned.style.maxHeight = 'none'

      content.appendChild(cloned)
      wrapper.appendChild(controls)
      wrapper.appendChild(content)
      overlay.appendChild(wrapper)
      document.body.appendChild(overlay)
      document.body.style.overflow = 'hidden'

      // Zoom 状态
      let scale = 1
      let translateX = 0
      let translateY = 0
      const applyTransform = () => {
        content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
      }

      // 控制按钮
      controls.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).closest('[data-action]')?.getAttribute('data-action')
        if (action === 'zoom-in') { scale = Math.min(scale * 1.3, 5); applyTransform() }
        if (action === 'zoom-out') { scale = Math.max(scale / 1.3, 0.2); applyTransform() }
        if (action === 'zoom-reset') { scale = 1; translateX = 0; translateY = 0; applyTransform() }
        if (action === 'close') closeOverlay()
      })

      // 滚轮缩放
      overlay.addEventListener('wheel', (e) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        scale = Math.min(Math.max(scale * delta, 0.2), 5)
        applyTransform()
      }, { passive: false })

      // 拖拽平移
      let isPanning = false
      let startX = 0, startY = 0
      content.addEventListener('mousedown', (e) => {
        isPanning = true; startX = e.clientX - translateX; startY = e.clientY - translateY
        content.style.cursor = 'grabbing'
      })
      document.addEventListener('mousemove', (e) => {
        if (!isPanning) return
        translateX = e.clientX - startX; translateY = e.clientY - startY
        applyTransform()
      })
      document.addEventListener('mouseup', () => {
        isPanning = false; content.style.cursor = 'grab'
      })

      // 键盘快捷键
      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeOverlay()
        if (e.key === '+' || e.key === '=') { scale = Math.min(scale * 1.3, 5); applyTransform() }
        if (e.key === '-') { scale = Math.max(scale / 1.3, 0.2); applyTransform() }
        if (e.key === '0') { scale = 1; translateX = 0; translateY = 0; applyTransform() }
      }
      document.addEventListener('keydown', keyHandler)

      // 点击背景关闭
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay()
      })

      const closeOverlay = () => {
        document.removeEventListener('keydown', keyHandler)
        document.body.style.overflow = ''
        overlay.remove()
      }
    }

    onMounted(() => initZoom())
    watch(() => route.path, () => nextTick(() => initZoom()))
  },
}
```

**关键实现说明：**
- 使用 `setup()` + `onMounted` + route 监听器 — 不是 `enhanceApp()`（SSR 期间 DOM 不存在）
- **轮询 Mermaid SVG**，最多 20 × 500ms 重试 — `vitepress-plugin-mermaid` 是异步渲染的
- **克隆 SVG**（不要移动）— 移动会破坏页面布局
- **修复缺失 viewBox** — 从 `getBBox()` 计算，确保缩放正确
- **标记容器** 使用 `data-zoom-attached` 防止路由变更时重复绑定

### Focus Mode 切换

添加阅读专注模式，隐藏侧边栏和导航栏：

```typescript
// 在 setup() 内部，initZoom 之后添加
const initFocusMode = () => {
  if (document.getElementById('focus-mode-toggle')) return

  const btn = document.createElement('button')
  btn.id = 'focus-mode-toggle'
  btn.className = 'focus-mode-btn'
  btn.title = '切换专注模式 (F)'
  btn.textContent = '👁'
  btn.addEventListener('click', toggleFocusMode)
  document.body.appendChild(btn)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey
      && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault()
      toggleFocusMode()
    }
  })
}

const toggleFocusMode = () => {
  document.body.classList.toggle('focus-mode')
  const btn = document.getElementById('focus-mode-toggle')
  if (btn) btn.textContent = document.body.classList.contains('focus-mode') ? '👁‍🗨' : '👁'
}

onMounted(() => { initZoom(); initFocusMode() })
```

## 第 4 步：深色主题 CSS（theme/custom.css）

### 字体
- `--vp-font-family-base: 'Inter'`
- `--vp-font-family-mono: 'JetBrains Mono'`

### 配色

| Element | Background | Border | Text |
|---------|-----------|--------|------|
| Page background | `#0d1117` | — | `#e6edf3` |
| Elevated surface | `#161b22` | `#30363d` | `#e6edf3` |
| Card/node | `#2d333b` | `#6d5dfc` | `#e6edf3` |
| Secondary surface | `#1c2333` | `#6d5dfc` | `#e6edf3` |
| Lines/arrows | — | `#8b949e` | — |
| Brand accent | — | `#6d5dfc` | — |
| Muted text | — | — | `#8b949e` |

### 必须的 CSS 分节
1. 深色模式 VitePress 变量（背景、表面、文本、品牌、代码块、滚动条）
2. 布局 — 更宽的内容区（`max-width: 820px`）
3. 导航栏 — 边框、背景修复
4. 侧边栏 — 大写分节标题、活跃项左侧边框高亮
5. 内容排版 — h1-h3、p、li、strong 字号
6. 行内代码 — 柔和背景、品牌色文本
7. 代码块 — 深色背景、圆角、语言标签
8. 表格 — 交替行颜色、大写表头
9. Mermaid 容器 — 居中、内边距、边框、深色背景

### Mermaid 深色模式 CSS 覆盖（关键）

主题变量不能覆盖所有内容。强制所有 SVG 形状使用深色填充：

```css
.mermaid .node rect, .mermaid .node circle, .mermaid .node ellipse,
.mermaid .node polygon, .mermaid .node path, .mermaid .label-container {
  fill: #2d333b !important;
  stroke: #6d5dfc !important;
}
.mermaid .nodeLabel, .mermaid .node text, .mermaid text, .mermaid span {
  color: #e6edf3 !important;
  fill: #e6edf3 !important;
}
.mermaid .cluster rect { fill: #161b22 !important; stroke: #30363d !important; }
.mermaid .actor { fill: #2d333b !important; stroke: #6d5dfc !important; }
.mermaid .edgeLabel rect { fill: #1c2333 !important; }
.mermaid .flowchart-link, .mermaid .messageLine0, .mermaid .messageLine1, .mermaid line {
  stroke: #8b949e !important;
}
.mermaid marker path { fill: #8b949e !important; }
```

### Zoom CSS
- Mermaid 悬停提示：发光边框 + "🔍 点击查看"徽章
- 全屏 overlay：背景模糊、居中容器、缩放控制、拖拽光标
- 图片悬停：微妙发光 + hover 放大
- medium-zoom overlay：深色背景带模糊

```css
/* === Mermaid 悬停提示 === */
.mermaid {
  cursor: pointer;
  transition: box-shadow 0.2s ease;
  position: relative;
}
.mermaid:hover {
  box-shadow: 0 0 0 2px #6d5dfc40, 0 0 20px #6d5dfc20;
}
.mermaid::after {
  content: '🔍 Click to zoom';
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: #2d333b;
  color: #8b949e;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.mermaid:hover::after { opacity: 1; }

/* === 图表 Zoom Overlay === */
.diagram-zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.diagram-zoom-wrapper {
  display: flex;
  flex-direction: column;
  width: 90vw;
  height: 90vh;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  overflow: hidden;
}
.diagram-zoom-controls {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}
.zoom-btn {
  background: #2d333b;
  color: #e6edf3;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 14px;
}
.zoom-btn:hover { background: #3d434b; border-color: #6d5dfc; }
.zoom-close { margin-left: auto; }
.diagram-zoom-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transform-origin: center center;
}
.diagram-zoom-content svg { max-width: none; }

/* === Focus Mode 按钮 === */
.focus-mode-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2d333b;
  border: 1px solid #30363d;
  color: #e6edf3;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.focus-mode-btn:hover {
  background: #3d434b;
  border-color: #6d5dfc;
  transform: scale(1.1);
}

/* === Focus Mode 激活状态 === */
.focus-mode .VPSidebar,
.focus-mode .VPNav,
.focus-mode .VPLocalNav,
.focus-mode .VPFooter,
.focus-mode .VPDocAside {
  display: none !important;
}
.focus-mode .VPDoc {
  padding: 0 !important;
}
.focus-mode .VPDoc .container {
  max-width: 900px !important;
  margin: 0 auto !important;
}
.focus-mode .vp-doc {
  padding: 40px 20px !important;
}
```

## 第 5 步：后处理（Markdown 修复）

在构建之前，修复生成 Markdown 中的常见问题：

### 修复 Mermaid 行内样式
扫描 Mermaid 块中的浅色 `style` 指令并替换为深色等效值：
- `#e1f5ff` → `#1a3a4a`、`#e8f5e9` → `#1a3a20`、`#fff3e0` → `#3a3020`
- `#f3e5f5` → `#2a1a3a`、`#f5f5f5` → `#2d333b`、`#ffffff` → `#2d333b`
- 添加 `,color:#e6edf3` 确保文本可见

### 转义泛型
在代码围栏之外包裹裸露的泛型（`Task<string>`、`List<T>`）。Vue 模板编译器会将裸 `<T>` 视为 HTML 标签。

### 修复 Mermaid 中的 `<br/>`
将 Mermaid 块中的 `<br/>` 替换为 `<br>`（自闭合标签会导致 Vue 编译错误）。

### 验证 Hex 颜色
检查 Mermaid 块中所有 hex 颜色是否有效（3 或 6 位）。

## 第 6 步：构建

```bash
cd wiki && npm install && npm run build
```

输出在 `wiki/.vitepress/dist/`。预览：`npm run preview`。

## Logo SVG

```svg
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#6d5dfc"/>
  <path d="M8 22V10l8-4 8 4v12l-8 4-8-4z" fill="#0d1117" fill-opacity="0.3"/>
  <path d="M16 6l8 4v12l-8 4-8-4V10l8-4z" stroke="white" stroke-width="1.5" fill="none"/>
  <circle cx="16" cy="14" r="3" fill="white"/>
  <path d="M12 20l4-3 4 3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>
```

$ARGUMENTS
