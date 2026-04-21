---
name: lcap-extension-component
description: 指导 CodeWave/LCAP 扩展组件的接入开发，包括 api.ts 配置、页面设计器 ideusage 适配、block.stories 区块示例。Use when developing LCAP extension components, writing api.ts, configuring IDE page designer adaptation, or working with CodeWave View Component API.
---

# LCAP 扩展组件开发指南

## 适用场景

- 接入扩展组件到 CodeWave 智能开发平台
- 编写 api.ts 组件配置
- 配置页面设计器（IDE）适配
- 编写 block.stories 拖拽初始代码

## 必要配置文件

| 配置 | 说明 |
|------|------|
| **api.ts** | 组件配置面板生成、属性/事件/插槽/方法描述 |
| **block.stories.{js\|tsx}** | 拖拽到画布后的初始代码示例 |
| **ideusage** | 页面设计器画布适配配置 |

## 组件实现规则

实现扩展组件时需同时满足以下六条规则。**计划阶段必须将规则转化为具体的配置参数（如具体的变量映射、具体的默认值结构）**，实现阶段严格按计划执行，自检与验收时逐条核对：

1. **展示类属性必有默认值**：与展示直接相关的属性（如 `data`、`options`、`config` 等）必须设置合理默认值，确保未传入或传入空数据时也能正常渲染、不报错、不白屏。
2. **表单类组件 value 双向绑定**：表单类组件的“值”属性须支持双向绑定，内部变更时通过事件回写父组件，详见 `component/platform/form.md`。
3. **默认 HTML 属性穿透**：组件根节点须支持 `style`、`class`、`data-*` 透传，不得拦截或丢弃。
4. **UI 样式规范**：优先使用对应 UI 框架的全局主题变量（见 `platform/theme-variables-*.md`），禁止写死颜色/间距等魔法值。
5. **图标规范**：组件内部图标须基于 **SVG**（`<svg>`/`<use>`）或 IconSetter/图标库，禁止使用位图、base64 或文字/emoji 充当图标。
6. **Web Worker（Vite）**：若使用 Worker（含第三方库内置 worker），须由 Vite 解析资源（如 `?url` / `?worker`），前置初始化并做好 SSR 守卫；详见 `component/implementation-rules.md` §6。

**详细说明、实现要点与验收清单**见 **component/implementation-rules.md**。

## 工作流护栏（强烈建议遵守）

为避免“脚本权限、CSS Modules 定位、浮点断言精度、E2E strict mode、Storybook 事件绑定”等常见疏漏，建议在计划与实现阶段同时遵守：

- **component/workflow-guardrails.md**

## 组件架构设计（复杂组件适用）

**涉及复杂布局、第三方渲染库（如图表、PDF、富文本）或强依赖容器尺寸的组件**，在计划阶段须明确以下三要素；简单原子组件（如按钮、文本）可简述或不填。

- **尺寸与布局策略 (Sizing)**：明确组件是**容器驱动**（由外部决定大小）还是**内容驱动**（由内容撑开）；定义初始化自适应逻辑（填满容器、等比例缩放或固定宽高）。
- **三方库集成审计 (Library Audit)**：预判库是否会注入内联 `style` 及覆盖方案；明确库在 **Mounted** 还是 **Updated** 时渲染，是否需要 `nextTick` 或 `ResizeObserver`。
- **测试分层**：逻辑与状态用 **Unit** 验证；涉及 **DOM 尺寸、滚动、弹窗、三方库渲染** 的功能**必须**有 **E2E** 用例，验收可观测的 DOM 状态（如 `clientWidth`、可见性等）。


## api.ts 核心结构

```typescript
/// <reference types="@nasl/types" />
namespace nasl.ui {
  @ExtensionComponent({ ideusage: { idetype: "element" } })
  @Component({ title: '按钮', icon: 'button', description: '...', group: 'Display' })
  export class ElButton extends ViewComponent { /* 可访问属性、@Method 方法 */ }

  export class ElButtonOptions extends ViewComponentOptions {
    @Prop({ group: '主要属性', title: 'Size', setter: { concept: 'InputSetter' } })
    size: nasl.core.String;
    @Event({ title: '点击', description: '...' })
    onClick: (event: { clientX: nasl.core.Integer; /* ... */ }) => void;
    @Slot({ title: 'default', description: '内容' })
    slotDefault: () => Array<nasl.ui.ViewComponent>;
  }
}
```

### 内置组件 icon 设置

`@Component({ icon: '...' })` 中的 `icon` 用于页面设计器组件面板与画布上的图标展示。**仅支持从平台内置组件图标中选择**，取值必须为下列之一（字符串，kebab-case）：

```ts
'absolute-layout', 'affix', 'alert', 'anchor', 'anchor-item', 'anchor-link',
  'backtop', 'badge', 'button', 'calendar', 'card', 'carousel', 'carousel-item',
  'cascade-select', 'checkboxes', 'col', 'collapse', 'collapse-item', 'crumb',
  'date-picker', 'descriptions', 'descriptions-item', 'dialog', 'divider',
  'drawer', 'dropdown-new', 'forcom', 'form', 'icon', 'iframe', 'image', 'input',
  'label', 'linear-layout', 'linear-progress', 'loading', 'modal', 'multi-layout',
  'multi-layout-item', 'navbar-multi', 'number', 'notification', 'option',
  'option-group', 'pageheader', 'pagination', 'popover', 'radio', 'radios', 'rate',
  'result', 'row', 'Scrollbar', 'select', 'slider', 'steps', 'switch', 'table-view',
  'tabs', 'text', 'TimeSelect', 'time-picker', 'timeline', 'timeline-item', 'toast',
  'tooltip', 'transfer', 'tree-view', 'tree-view-new', 'uploader', 'watermark'
```

**选用规则**：

- 按扩展组件的**语义/形态**选择最接近的内置图标（如自定义「统计卡片」→ `card`，自定义「选择器」→ `select`），保证设计器内图标风格统一。
- 若**无合适匹配**（如全新类型的图表、定制控件），可不设置 `icon`，平台会使用默认占位图标；**禁止**使用上述列表之外的字符串，否则可能不展示或报错。

### NASL 类型（必须使用）

- **允许**：仅使用平台内置类型
  - 基础：`nasl.core.Boolean`、`Integer`、`Decimal`、`String`、`Date`、`Time`、`DateTime`
  - 集合：`nasl.collection.List<T>`、`Map<K,V>`，其中 `T`、`K`、`V` 也须为上述基础类型或内联对象类型
  - 对象形态：使用**内联对象类型**，字段类型为 `nasl.core.*`
- **禁止**：`Object`、`Function`、`any`；**禁止自定义类型**（如在 namespace 内 `export class FunnelDataItem extends Base` 等），属性/事件/方法参数/插槽参数的类型均不可使用自定义类名。

**错误示例**（自定义类型）：

```ts
// 禁止：自定义 class 作为类型
export class FunnelDataItem extends Base { ... }
export class FunnelItemStyle extends Base { ... }
data: nasl.collection.List<FunnelDataItem>;
itemStyle: FunnelItemStyle = { ... };
onFunnelItemClick: (event: { ... FunnelDataItem ... }) => void;
slotTooltip: (current: { ... }) => Array<...>;  // current 中也不可用自定义类型
```

**正确示例**（内联对象 + 仅 nasl.core / nasl.collection）：

```ts
data: nasl.collection.List<{ name: nasl.core.String; value: nasl.core.Decimal }> = [];

itemStyle: {
  color: nasl.core.String;
  borderColor: nasl.core.String;
  borderWidth: nasl.core.Integer;
} = { color: '#5470c6', borderColor: '#fff', borderWidth: 2 };

// 事件、插槽参数同理：用内联对象 + nasl.core.*，勿用 FunnelDataItem 等自定义类型
onFunnelItemClick: (event: { index: nasl.core.Integer; name: nasl.core.String; value: nasl.core.Decimal; percentage: nasl.core.Decimal }) => void;
```

### 属性 Setter

| concept | 说明 | 适用类型 |
|---------|------|----------|
| InputSetter | 输入框（默认） | any |
| SwitchSetter | 开关 | Boolean |
| EnumSelectSetter | 枚举选择 | 字符串枚举 |
| CapsulesSetter | 胶囊 | 字符串枚举 |
| NumberInputSetter | 数字输入 | Integer/Decimal |
| IconSetter | 图标 | String |
| ImageSetter | 图片 | String |
| PropertySelectSetter | 属性选择 | String |
| AnonymousFunctionSetter | 匿名函数 | (...args) => any |

### 事件规范

- 事件名：以 `on` 开头小驼峰，如 `onClick`、`onRowClick`
- **合法标识符**：api.ts 中事件须为普通属性名，**禁止**使用引号字符串键或含 `:` 的键名。例如与 Vue `update:modelValue` 对应时，不得写成 `'onUpdate:modelValue'`，应写为 `onUpdateModelValue`。
- 参数：有且仅有一个 `event` 对象；多参数合并为 `onSelect: (event: { value, item }) => void`
- 返回：`void`

### 插槽规范

- 属性名：`slotDefault`（默认）、`slotHeader`（具名）
- 作用域插槽：`slotItem: (current: Current<T>) => Array<ViewComponent>`

## ideusage：页面设计器适配 (api.ts)

通过 `@ExtensionComponent({ ideusage: { ... } })` 配置。组件类型 `idetype` 与**是否需插槽**的对应关系如下，生成 api.ts 时须严格按此处理，不得误删插槽：

| idetype | 说明 | 插槽 |
|---------|------|------|
| **element** | 原子组件（如 button、text、input），不可插入子节点 | **不需要插槽**，api.ts 中不定义 Slots |
| **container** | 可插入子节点的容器 | **需要插槽**，至少 slotDefault 等 |
| **modal** | 弹窗类（dialog、modal 等） | **需要插槽**（内容区、标题等），按 spec 定义 |
| **drawer** | 抽屉组件 | **需要插槽**（内容区等），按 spec 定义 |
| **messager** | 消息弹出 | **需要插槽**，按 spec 定义 |
| **popover** | 弹出层类（popover、dropdown 等） | **需要插槽**（内容区、触发区等），按 spec 定义 |
| router | 路由 | 按 spec |
| board | 自由布局 | 按 spec |

**插槽约定**：仅 **element** 类型在 api.ts 中不定义 Slots；**container、modal、drawer、messager、popover** 类型均需根据 spec 在 api.ts 中保留并定义相应插槽，生成或修改 api.ts 时不得删除这些类型的 Slots。**若 spec 或 api.ts 中已定义插槽，则 idetype 不得为 element**，须按组件形态选用 container / modal / drawer / messager / popover，否则设计器与插槽定义矛盾。

### element 常用配置

<!-- idetype=element：不需要插槽，等 -->

```typescript
ideusage: {
  idetype: "element",
  editable: "text",           // 可双击编辑的属性
  textholder: "text",         // 显示文本的属性
  useFxOrEg: { property: "text" },  // 表达式与示例切换
  iconEditor: true,
  events: { click: true }
}
```

### container 常用配置

<!-- idetype=container：需要插槽，至少 slotDefault 等 -->

```typescript
ideusage: {
  idetype: "container",
  disableSlotAutoFill: ["cover"],   // 禁止自动插入的插槽
  structured: true,                 // 通过"+"添加子组件
  childAccept: "target.tag === 'TableColumn'",
  parentAccept: "target.tag === 'Table'",
  dataSource: {
    display: 3,
    loopElem: "> label[class^='u-radios_radio']:not([data-nodepath])",
    dismiss: "!this.getAttribute('dataSource') && this.getDefaultElements().length > 0"
  }
}
```

### modal/drawer/messager 必须配置

- `selector`: `{ expression: "this.getElement(el => el.slotTarget === 'body')", cssSelector: "div[class^='u-modal_dialog']" }`
- `cacheOpenKey`: 控制显隐的属性名，如 `"visible"` 或 `"open"`

### 表达式 API（用于 parentAccept、childAccept、containerDirection 等）

- `target.tag`：目标组件 tag
- `this.getAttribute('attr')?.value`：当前属性值
- `this.getElement(el => el.slotTarget === 'title')`：查找子元素
- `this.getParent()`、`this.elementsLength()`、`this.getAncestor(tag)`

## block.stories

拖拽到画布后的**初始代码**，必须满足：

- **仅允许静态属性**：所有 props 的值必须直接写在模板/JSX 里，为字面量或内联的静态结构（如数组、对象字面量）。
- **禁止绑定变量**：不得使用 `setup()`、`data()`、`ref`、`reactive` 等把数据存成变量再绑定到模板；属性一律用内联字面量。
- **禁止绑定事件**：不得在 block.stories 的模板/JSX 中写 `@click`、`onClick`、`v-on` 等事件绑定。

**错误示例**（使用 setup/变量，导致拖入画布后无法还原）：

```javascript
export const Default = {
  name: '基本用法',
  render: () => ({
    components: { 'funnel-chart': Component },
    setup() {
      const data = [
        { name: '未触达客户', value: 1000 },
        { name: '已触达客户', value: 800 },
        // ...
      ];
      return { data };
    },
    template: '<funnel-chart :data="data" height="400px" width="600px"></funnel-chart>',
  }),
};
```

**正确示例**（属性全部内联字面量，无 setup、无变量、无事件）：

```javascript
export const Default = {
  name: '基本用法',
  render: () => ({
    components: { 'funnel-chart': Component },
    template: '<funnel-chart :data="[{ name: \'未触达客户\', value: 1000 }, { name: \'已触达客户\', value: 800 }, { name: \'意向客户\', value: 600 }, { name: \'成交客户\', value: 400 }, { name: \'复购客户\', value: 200 }]" height="400px" width="600px"></funnel-chart>',
  }),
};
```

简单组件可直接写死字符串/无绑定：

```javascript
// block.stories.js (Vue2)
export const Default = {
  name: '默认按钮',
  render: () => ({ template: '<u-button text="确定"></u-button>' }),
};
// block.stories.tsx (React)
export const Default = { name: '主要按钮', render: () => <Button type="primary" children="确定" /> };
```

## Playwright e2e 测试规范

e2e 测试须与 spec 验收标准一一对应，且**必须**满足以下三点，否则视为不合格：

### 1. 基于 example.stories 各功能 demo

- 在**组件目录下** **`stories/example.stories.{js|tsx|jsx}`** 中为 spec 的**每个功能**各添加一个 demo story（命名清晰，如 `Default`、`WithTooltip`、`ClickToSelect` 等），用于展示该功能并供 e2e 使用。
- **Playwright e2e 测试应针对 example.stories 中的这些功能 story 运行**：通过 Storybook iframe URL 访问对应 demo，**storyId 遵循 Storybook 规则**：`<stories 的 kind 名（kebab-case）>--<story 导出名（kebab-case）>`，例如 `funnel-chart-example--default`、`funnel-chart-example--with-tooltip`；完整 URL 形如 `/iframe.html?id=<storyId>&viewMode=story`。e2e 在该页面上执行操作并断言，每个功能既有可手动查看的 demo，又有自动化覆盖。

### 2. 监控控制台与页面报错

每个 e2e 用例运行期间，**必须监听**浏览器控制台（`console`）与页面错误（`pageerror`），一旦出现报错则**将该用例标记为失败**，不得忽略。

- 使用 `page.on('console', msg => ...)` 监听 `console.error` / `console.warn`，出现则收集并在用例末尾 `expect(consoleErrors).toHaveLength(0)` 或等效断言。
- 使用 `page.on('pageerror', err => ...)` 监听页面未捕获异常，出现则令用例失败。

### 3. 每个用例必须有对应断言

每个 `test(...)` 必须包含**明确的断言**（`expect(...)`），用于验证该条对应的验收标准是否达成；禁止“只执行操作、不断言结果”或“仅确保不崩溃”的用例。

- 渲染类：断言目标 DOM/Canvas 存在、可见、数量或关键内容正确。
- 交互类：执行点击/输入等后，断言界面状态或事件结果（如某元素出现、文案变化、请求发出等）。
- 若有事件回调（如 onClick），可通过注入 spy 或检查 DOM 变化等方式断言已触发且结果符合预期。

## 注意事项

- **透传与插槽**：组件需将 `data-*` 透传到根 DOM；插槽需同时支持 `EmptySlot` 与普通 HTML 内容。
- **属性分组**：`@Prop({ group: '...' })` 的 `group` 仅支持以下取值：数据属性、主要属性、交互属性、状态属性、样式属性、工具属性。
- **block.stories 数量**：`block.stories.{js|jsx|tsx}` 中**仅保留一个** story（拖拽到画布用）。若有多个示例或本地调试用例，请写在 `example.stories.{js|jsx|tsx}` 中，勿在 block.stories 中新增。
- **example.stories 功能 demo**：在组件目录下 `stories/example.stories.{js|tsx|jsx}` 中为 **spec 的每个功能** 各添加一个 demo story（可与验收标准一一对应），用于本地调试、验收对照与 Playwright e2e。

完整规范见本 skill 目录：`.wave/skills/lcap-extension-component/component/`

### 核心必备

| 文档 | 说明 |
|------|------|
| `api.md` | api.ts 编写、属性/事件/插槽/方法描述 |
| `block.md` | block.stories 区块示例 |
| `nasl-view-component.md` | View Component API 书写规范 |

### 页面设计器（ideusage）

| 文档 | 说明 |
|------|------|
| `ide.md` | 页面设计器适配总览 |
| `ide/index.md` | ideusage 配置索引 |
| `ide/element.md` | element 原子组件 |
| `ide/container.md` | container 容器组件 |
| `ide/modal.md` | modal 弹窗 |
| `ide/popover.md` | popover 弹出框 |
| `ide/expression.md` | 表达式 API（parentAccept、childAccept 等）|

### 平台能力（platform）

| 文档 | 说明 |
|------|------|
| `platform/slot.md` | 插槽 @Slot 配置：默认/具名插槽、snippets、emptyBackground，书写规范同 block |
| `platform/event.md` | 事件 @Event 约定：合法属性名（禁止带 `:` 的引号键如 `'onUpdate:modelValue'`，用 `onUpdateModelValue`）、仅单 event 参数、on 前缀小驼峰、多参数合并为 event 对象、返回 void |
| `platform/child.md` | 父子组件约束：子组件不上面板，通过父组件「+」添加，snippets 与 emptyBackground 配置 |
| `platform/form.md` | 表单能力：值双向绑定（sync/update:value）、表单校验；表单项组件必读 |
| `platform/link.md` | 链接跳转：hrefAndTo 属性、link/destination 及点击跳转实现 |
| `platform/function.md` | 函数类型属性（AnonymousFunctionSetter）：行样式、格式化等，bindOpen 与 Current 参数 |
| `platform/data-source.md` | 数据源 dataSource：绑定后端、数据类型与字段映射、reload 方法 |
| `platform/accessibility.md` | 可访问性：属性可读/可写、sync:state 同步状态（当前仅 Vue） |

### 可选扩展

| 文档 | 说明 |
|------|------|
| `icon.md` | IDE组件面板中显示图标配置 |
| `i18n.md` | 国际化能力适配 |
| `theme.md` | IDE样式配置方案 |
| `platform/theme-variables-ant-design.md` | Ant Design 主题变量（React） |
| `platform/theme-variables-element-plus.md` | Element Plus 主题变量（Vue3） |
| `platform/theme-variables-element-ui.md` | Element UI 主题变量，旧版（Vue2） |
| `platform/theme-variables-cloud-ui.md` | Cloud UI 主题变量（Vue2） |
| `platform/theme-variables-mobile-ui.md` | Mobile UI 主题变量（Vue2 移动端） |
