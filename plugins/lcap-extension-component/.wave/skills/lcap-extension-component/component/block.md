---
outline: deep
---
<script setup>
import { VTCodeGroup, VTCodeGroupTab } from '../../.vitepress/components'
</script>

# 区块示例说明

## 1. 功能说明

区块示例是拖拽组件到画布后**默认生成的初始代码**。在 `block.stories.js` / `block.stories.tsx` 中定义，作为画布上组件的初始形态。例如：拖拽按钮组件到画布后，生成的代码中按钮的 `text` 属性为 `"确定"`。

依赖库中创建组件后，默认会生成一个区块示例；该示例必须**仅含静态内容**，以便设计器可靠还原、不依赖运行时变量或事件。

## 2. 文件与结构

在 **block.stories.js**（Vue2）/ **block.stories.tsx**（React）中定义，每个区块为一个 Story 对象，必须包含 `name`、`render`。

<VTCodeGroup>
  <VTCodeGroupTab label="Vue2">

  **block.stories.js**
  ```javascript
  export const Default = {
    name: '默认按钮',
    render: () => ({
      template: '<u-button text="确定"></u-button>',
    }),
  };
  ```

  </VTCodeGroupTab>
  <VTCodeGroupTab label="React">

  **block.stories.tsx**
  ```jsx
  export const Default = {
    name: '主要按钮',
    render: () => <Button type="primary" children="确定" />,
  };
  ```

  </VTCodeGroupTab>
</VTCodeGroup>

Vue2 下会使用 `render` 返回对象中的 `template`。

## 3. 书写规范（必须遵守）

block.stories 用于画布初始代码，**必须满足**以下三条，否则拖入画布后无法正确还原：

| 规则 | 说明 |
|------|------|
| **仅允许静态属性** | 所有 props 的值必须直接写在模板/JSX 里，为字面量或内联的静态结构（如数组、对象字面量）。 |
| **禁止绑定变量** | 不得使用 `setup()`、`data()`、`ref`、`reactive` 等把数据存成变量再绑定到模板；属性一律用内联字面量。 |
| **禁止绑定事件** | 不得在模板/JSX 中写 `@click`、`onClick`、`v-on` 等事件绑定。 |

### 3.1 错误示例（禁止）

使用变量或事件会导致设计器无法还原、或行为不一致。

<VTCodeGroup>
  <VTCodeGroupTab label="Vue2">

  ```javascript
  // 错误：使用 data() 和 @click
  export const Default = {
    name: '默认',
    render: () => ({
      data() {
        return { text: '确定' };
      },
      methods: { handleClick() {} },
      template: '<u-button :text="text" @click="handleClick"></u-button>',
    }),
  };
  ```

  ```javascript
  // 错误：使用 setup() 和变量绑定
  export const Default = {
    name: '基本用法',
    render: () => ({
      components: { 'funnel-chart': Component },
      setup() {
        const data = [
          { name: '未触达客户', value: 1000 },
          { name: '已触达客户', value: 800 },
        ];
        return { data };
      },
      template: '<funnel-chart :data="data" height="400px"></funnel-chart>',
    }),
  };
  ```

  </VTCodeGroupTab>
  <VTCodeGroupTab label="React">

  ```jsx
  // 错误：使用变量和 onClick
  export const Default = {
    name: '主要按钮',
    render: () => {
      const text = '确定';
      const handleClick = () => {};
      return <Button type="primary" children={text} onClick={handleClick} />;
    },
  };
  ```

  </VTCodeGroupTab>
</VTCodeGroup>

### 3.2 正确示例

**简单组件**：属性直接写死为字面量。

<VTCodeGroup>
  <VTCodeGroupTab label="Vue2">

  ```javascript
  export const Default = {
    name: '默认按钮',
    render: () => ({
      template: '<u-button text="确定"></u-button>',
    }),
  };
  ```

  </VTCodeGroupTab>
  <VTCodeGroupTab label="React">

  ```jsx
  export const Default = {
    name: '主要按钮',
    render: () => <Button type="primary" children="确定" />,
  };
  ```

  </VTCodeGroupTab>
</VTCodeGroup>

**需传数组/对象时**：在模板/JSX 中**内联字面量**，不通过变量绑定。

```javascript
// Vue2：data 为内联数组字面量
export const Default = {
  name: '基本用法',
  render: () => ({
    components: { 'funnel-chart': Component },
    template: '<funnel-chart :data="[{ name: \'未触达客户\', value: 1000 }, { name: \'已触达客户\', value: 800 }, { name: \'意向客户\', value: 600 }]" height="400px" width="600px"></funnel-chart>',
  }),
};
```

### 3.3 story 数量

**block.stories 中仅保留一个 story**（通常为 `Default`），供拖拽到画布使用。若需多个示例或本地调试用例，请写在 **example.stories.{js|tsx|jsx}** 中，勿在 block.stories 中新增多个 story。
