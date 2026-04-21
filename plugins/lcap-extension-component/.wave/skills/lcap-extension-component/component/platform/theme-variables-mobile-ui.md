# 使用 CloudUI 全局主题变量

## 复制变量文件

创建文件 `.storybook/vars.css`, 内容如下:

```css

:root {
  /**
   * ========================
   *   Global Variables
   * ========================
   */
  --van-space-baset: 16px;

  /* Brand Colors */
  --van-brand-primary: #337eff;
  --van-brand-success: #26bd71;
  --van-brand-problem: #ffb21a;
  --van-brand-warning: #ffb21a;
  --van-brand-error: #f24957;
  --van-brand-disabled: #ebebeb;

  /* Component Base Colors */
  --van-component-text-color: #333;
  --van-component-active-color: #f2f3f5;
  --van-component-active-opacity: 0.7;
  --van-component-disabled-opacity: 0.5;
  --van-component-background-color: #f7f8fa;
  --van-component-background-color-light: #fafafa;
  --van-component-text-link-color: #576b95;

  /* Font */
  --van-font-color: #333;
  --van-font-size-xs: 10px;
  --van-font-size-sm: 12px;
  --van-font-size-md: 14px;
  --van-font-size-lg: 16px;
  --van-font-weight-bold: 500;
  --van-line-height-xs: 14px;
  --van-line-height-sm: 18px;
  --van-line-height-md: 20px;
  --van-line-height-lg: 22px;
  --van-base-font-family: blinkmacsystemfont, 'Helvetica Neue',
    helvetica, segoe ui, arial, roboto, 'PingFang SC', 'miui',
    'Hiragino Sans GB', 'Microsoft Yahei', sans-serif, -apple-system;
  --van-price-integer-font-family: avenir-heavy, pingfang sc, helvetica neue,
    arial, sans-serif;

  /* Border Color */
  --van-border-color: #e5e5e5;
  --van-border-width-base: 1px;
  --van-border-radius-sm: 2px;
  --van-border-radius-md: 4px;
  --van-border-radius-lg: 8px;
  --van-border-radius-max: 16px;

  /* Padding */
  --van-padding-base: 6px;
  --van-padding-xs: calc(var(--van-padding-base) * 2);
  --van-padding-sm: calc(var(--van-padding-base) * 3);
  --van-padding-md: calc(var(--van-padding-base) * 4);
  --van-padding-lg: calc(var(--van-padding-base) * 6);
  --van-padding-xl: calc(var(--van-padding-base) * 8);

  --van-space-base: var(
    --van-space-baset
  ); /* @desc 布局内各元素之间的外间距, 如：1px */ /* @prefix van */
  --van-space-shrink: -1px;
  --van-space-mini: 4px;
  --van-space-small: 10px;
  --van-space-large: 30px;
}
```

## 在 `.storybook/preview.js` 文件中导入全局变量

```js
import './vars.css';

// ......
```

完成后就可以在组件中使用以上的全局 css 变量