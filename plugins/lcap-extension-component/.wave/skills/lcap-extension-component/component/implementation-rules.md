---
outline: deep
---

# 组件实现规则

实现扩展组件时需同时满足以下六条规则。**计划阶段**应在实现顺序或验收标准中体现，**实现阶段**应在代码与自检中逐条落实，**验收阶段**按清单逐条核对。详细说明如下。

---

## 1. 展示类属性必有默认值

### 规则说明

与展示直接相关的属性（如 `data`、`options`、`config` 等）必须设置**合理默认值**，确保组件在以下情况下也能正常渲染、不报错、不白屏：

- 未传入该属性；
- 传入 `undefined` / `null`；
- 传入空数据（空数组、空对象等）。

### 为何重要

- 页面设计器中组件初次拖入画布时，往往尚未绑定数据源，若缺少默认值会导致报错或空白。
- 制品运行时若接口暂无数据或加载失败，空数据下组件也应有合理展示（空状态、占位等），而不是白屏或控制台报错。

### 如何落实

| 属性类型 | 建议默认值 | 示例 |
|----------|------------|------|
| 列表/数据源 | 空数组 `[]` | `data: []`，表格、图表、列表等 |
| 配置对象 | 空对象 `{}` 或符合 spec 的最小结构 | `options: {}`，`config: { ... }` |
| 可选展示字段 | 空字符串或占位文案 | `placeholder: ''`，`emptyText: '暂无数据'` |

可根据 spec 或业务含义给出空数组、空对象或占位内容；若 spec 已约定默认值，以 spec 为准。

### 验收要点

- [ ] 所有与展示直接相关的 Props（data、options、config 及同类）在 api.ts 中均有默认值或示例数据。
- [ ] 未传或传空数据时，组件能正常渲染（含空状态），无未捕获异常、不白屏。

**异步加载组件**：凡依赖异步数据或资源的展示组件，必须包含完整的状态机与 UI 反馈：**Loading**（加载中）、**Error**（加载失败）、**Empty**（空数据）。严禁出现加载失败后界面无任何提示或仍显示空白的情况。

---

## 2. 表单类组件 value 双向绑定

### 规则说明

输入框、选择器、开关、日期选择等**表单类组件**的 `value`（或 spec 约定的“值”属性）必须支持**双向绑定**：用户操作导致内部值变化时，需通过事件将新值回写给父组件/绑定变量，使“组件显示的值”与“绑定变量的值”保持一致。

### 为何重要

- 页面设计器需要“将组件输入赋值给变量”，发布后在制品中用户输入的内容会同步到绑定变量。
- 平台表单校验依赖值的同步，缺少回写会导致校验、提交与展示不一致。

### 如何落实

- **api.ts**：为“值”属性设置 `sync: true`，表示允许平台将组件内部变更同步到绑定变量。

  ```typescript
  @Prop({
    group: '数据属性',
    title: '值',
    sync: true,
  })
  value: V;
  ```

- **实现层**：内部值变化时触发对应事件（如 `update:value`、`input`），具体事件名与框架约定见 **platform/form.md**。
  - Vue2：需同时 `$emit('update:value', val)` 与 `$emit('input', val)`，必要时配置 `model: { prop: 'value', event: 'update:value' }`。
  - Vue3 / React：按平台约定监听 onChange 等并回写即可。

完整实现示例（Vue2/表单校验支持等）见 **component/platform/form.md**。

### 验收要点

- [ ] api.ts 中“值”属性已设置 `sync: true`。
- [ ] 实现中在内部变更时正确 emit 回写，设计器绑定变量后输入能同步更新，表单校验可正常工作。

---

## 3. 默认 HTML 属性穿透

### 规则说明

组件**根节点**必须支持以下常规 HTML 属性的透传，不得在组件内部拦截或丢弃：

- `style`
- `class`
- `data-*`（任意 data 属性）

这样父组件或设计器可以为组件设置样式、类名或 data 属性（如埋点、测试 id），而不会因组件未透传而失效。

### 为何重要

- 设计器与制品中常通过 class、style 做布局、主题或响应式控制；若根节点不透传，这些设置会丢失。
- 平台与业务可能依赖 `data-*` 做自动化测试、埋点或无障碍等，不透传会破坏这些能力。

### 如何落实

- 确保组件有**单一根节点**（或约定透传到主根节点）。
- 在根节点上绑定框架提供的“未声明属性”：
  - **Vue2**：根节点使用 `v-bind="$attrs"`（若需排除部分属性，可用 `v-bind="filteredAttrs"`，但必须包含 style、class、data-*）。
  - **Vue3**：根节点使用 `v-bind="$attrs"`；若存在多根节点，需在不会继承 attrs 的根上显式绑定。
  - **React**：将上层传入的 `className`、`style` 以及 `data-*` 等合并到根 DOM 的 props 上，不丢弃。

不要在自己的 props 里定义同名的 `class`/`style` 却不往根 DOM 传，也不要过滤掉 `data-*`。

### 验收要点

- [ ] 在根节点上设置 `class`、`style` 或 `data-*` 后，能在 DOM 上看到对应属性生效。
- [ ] 未在组件内部拦截或覆盖这些属性。

---

## 4. UI 样式规范

### 规则说明

组件的主题与样式必须优先使用对应 UI 框架的**全局主题变量**（CSS 变量），禁止在实现中随意写死颜色、间距等魔法值。需从本技能提供的 `platform/theme-variables-*.md` 中选择合适变量，以保证多主题与换肤能力正常工作。

### 为何重要

- 平台支持多主题与换肤，写死颜色/尺寸会导致在深色主题或定制主题下表现不一致。
- 使用主题变量可保持与 Ant Design、Element Plus、Cloud UI 等框架的视觉体系一致。

### 计划阶段要求 (Planning Requirement)

- **严禁仅在验收清单中勾选此项**；必须在写代码之前就在计划书中体现。
- **必须**在 `plan.md` 中建立「样式与主题适配」章节及**样式变量映射表**（见 plan-template 第三节）。
- **必须**在生成计划时主动查阅对应的 `platform/theme-variables-*.md` 文档，选定具体的全局变量（如 `--cw-color-primary`、`--el-bg-color-page`）填入映射表，不得推迟至实现阶段再决定。

### 如何落实

- 查阅并引用与当前项目 UI 框架对应的主题变量文档：
  - **platform/theme-variables-ant-design.md**
  - **platform/theme-variables-element-ui.md**
  - **platform/theme-variables-element-plus.md**
  - **platform/theme-variables-cloud-ui.md**
  - **platform/theme-variables-mobile-ui.md**
- 在组件样式中使用上述文档中的 CSS 变量（如 `--cw-color-primary`、`--cw-border-radius` 等），而不是写死 `#1677ff`、`6px` 等。
- 若组件需要暴露可配置样式（如颜色、尺寸），应在文档或 api 中声明可用的 **CSS 变量**，便于主题与定制。

### 例外：Canvas 与 JS 绘图

上述规则针对 **CSS 层** 的样式与变量；若组件使用 **Canvas、WebGL 或 JS 绘图 API**（如二维码、图表、离屏渲染），绘图上下文无法解析 `var(--*)`，须单独处理：

- **限制**：`ctx.fillStyle`、`fill()` 等绘图 API **无法直接使用** CSS 变量字符串，传入 `var(--el-xxx)` 不会得到预期颜色。
- **要求**：禁止将 CSS 变量名字符串直接传给绘图函数。
- **推荐**：在 JS 中通过 `getComputedStyle(el).getPropertyValue('--el-xxx')` 获取计算后的绝对颜色值，再传给绘图 API。
- **功能优先时**：对对比度要求严格的场景（如二维码识别），可选用硬编码高对比度颜色（如 `#ffffff`），在 plan.md 的「样式与主题适配」表中注明为 **JS 渲染** 即可。

### 验收要点

- [ ] 组件内无写死的颜色、间距等魔法值（或仅用于与主题变量无关系的局部逻辑）。
- [ ] 样式主要来自 theme-variables-*.md 中的变量；若适用，已声明或文档化可定制的 CSS 变量。

---

## 5. 图标规范

### 规则说明

组件**内部**图标渲染必须基于 **SVG** 语法（如 `<svg>`、`<use>`），并通过 IconSetter 或统一图标库名称驱动。禁止在实现中直接使用：

- 位图图标（如 `.png`、`.jpg` 作为图标）
- 内联 base64 图片
- 普通文字或 emoji 充当图标

### 为何重要

- 平台与设计器依赖统一图标体系（IconSetter、图标库），文字/emoji/位图无法被设计器统一管理和换肤。
- SVG 可缩放、可着色，与主题变量配合更好，无障碍与多分辨率表现更稳定。

### 如何落实

- 组件内部若需展示图标，使用：
  - `<svg>` + `<use>` 引用图标库或已注册的 symbol；或
  - 通过 IconSetter / 图标名称从统一图标库渲染。
- 组件**面板图标**（api.ts 中 `@Component({ icon: '...' })`）的选用规则见 SKILL.md「内置组件 icon 设置」；自定义面板图标见 **component/icon.md**（如 assets 下的 .svg）。
- 禁止使用 Unicode 字符、emoji 或图片 URL 作为组件内部图标。

### 验收要点

- [ ] 组件内部所有图标均为 SVG 或通过 IconSetter/图标库渲染。
- [ ] 未使用位图、base64 图片或文字/emoji 充当图标。

---

## 6. Web Worker（Vite）

### 规则说明

在 Vite 中处理 **Web Worker**（含第三方库内置 worker）时，避免继续沿用「CDN 链接 / Webpack entry / 手写复制 `*.min.js`」等旧习惯，优先用构建器解析出的 **稳定 URL 或 Worker 构造**。

### 为何重要

- Worker 脚本路径若写死或依赖外链，在换环境、换版本或生产资源哈希变化时易出现 404 或与主包版本不一致。
- 由 Vite 解析并打包的 worker 与主应用同源发布，利于缓存与可复现构建；SSR 场景若误在服务端初始化 `Worker`，会导致运行时报错。

### 如何落实

**原则**

- **统一由 Vite 解析 worker 资源**：使用 `?url` 得到 worker 脚本 URL，或按需使用 `?worker` / `new URL(..., import.meta.url)` 等 [Vite 文档](https://vitejs.dev/guide/features.html#web-workers) 推荐写法。
- **前置初始化**：设置 `workerSrc`、`new Worker(...)` 等逻辑放在**实际消费方模块的顶部**（该文件内任何 `async` 业务逻辑执行之前），避免首次调用时 worker 尚未就绪。
- **SSR**：若该模块会在 SSR 阶段执行，对 `Worker` / `window` 相关代码加环境守卫，仅在浏览器侧初始化。

**第三方示例：`pdfjs-dist`**

将 worker 脚本作为 URL 模块导入，并赋给官方全局配置（路径以当前安装的 `pdfjs-dist` 版本为准）：

```typescript
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
```

自研 worker 可类似使用 `import MyWorker from './my.worker?url'` 再 `new Worker(MyWorker, { type: 'module' })`（是否 `module` 以浏览器与打包目标为准）。

### 验收要点

- [ ] Worker 脚本通过 Vite 推荐方式（如 `?url` / `?worker` / `import.meta.url`）引入，未依赖手写 CDN、复制 min 文件或仅适用于 Webpack 的 entry 配置。
- [ ] `workerSrc` 或 `new Worker` 在实际使用异步逻辑之前完成；若存在 SSR，浏览器 API 仅在客户端执行。

---

## 相关文档索引

| 规则 | 参考文档 |
|------|----------|
| 展示类默认值 | 各组件 spec、api.ts 默认值约定 |
| 表单 value 双向绑定 | **component/platform/form.md** |
| HTML 属性穿透 | 本文档 §3；插槽若涉及 EmptySlot 见 **component/platform/slot.md**、**component/ide/container.md** |
| UI 样式 / 主题变量 | **platform/theme-variables-ant-design.md** 等 theme-variables-*.md |
| 图标 | **component/icon.md**（面板图标）；SKILL.md「内置组件 icon 设置」 |
| Web Worker（Vite） | 本文档 §6；[Vite - Web Workers](https://vitejs.dev/guide/features.html#web-workers) |

计划与验收时可将上述六条与 **plan-template.md** 中「五、验收检查清单」的「组件实现规则」小节一起逐条核对。
