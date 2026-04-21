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

    /* Brand Colors */
    --brand-primary-lightest: #eaf2ff;
    --brand-primary-lighter: #bbd4ff;
    --brand-primary-light: #5c98ff;
    --brand-primary: #337eff;
    --brand-logo-color: var(--brand-primary);
    --brand-primary-dark: #1168ff;
    --brand-primary-darker: #004bcc;
    --brand-primary-darkest: #003eaa;
    --brand-primary-disabled: #bbd4ff;
    --brand-primary-opacity-20:#337eff33;

    --brand-success-lightest: #e9f8f1;
    --brand-success-lighter: #b0efd0;
    --brand-success-light: #2ed581;
    --brand-success: #26BD71;
    --brand-success-dark: #22a864;
    --brand-success-darker: #197e4b;
    --brand-success-darkest: #15693f;

    --brand-normal-lightest: #f2f9eb;
    --brand-normal-lighter: #d8eec4;
    --brand-normal-light: #97d362;
    --brand-normal: #8acd4e;
    --brand-normal-dark: #7ac437;
    --brand-normal-darker: #5b932a;
    --brand-normal-darkest: #4c7b23;

    --brand-problem-lightest: #fffae8;
    --brand-problem-lighter: #ffeca2;
    --brand-problem-light: #ffda45;
    --brand-problem: #ffd52e;
    --brand-problem-dark: #ffce0c;
    --brand-problem-darker: #c9a000;
    --brand-problem-darkest: #a78600;

    --brand-warning-lightest: #fef7e8;
    --brand-warning-lighter: #ffb21a;
    --brand-warning-light: #ffb82a;
    --brand-warning: #FFB21A;
    --brand-warning-dark: #f0a000;
    --brand-warning-darker: #b47800;
    --brand-warning-darkest: #966400;

    --brand-error-lightest: #feecee;
    --brand-error-lighter: #fab6bc;
    --brand-error-light: #f56d79;
    --brand-error: #F24957;
    --brand-error-dark: #f02d33;
    --brand-error-darker: #c70f14;
    --brand-error-darkest: #a60c11;

    --brand-danger-lightest: #ffeded;
    --brand-danger-lighter: #ffc8c8;
    --brand-danger-light: #ff6c6c;
    --brand-danger: #F24957;
    --brand-danger-dark: #ff3434;
    --brand-danger-darker: #e60000;
    --brand-danger-darkest: #c00000;
    --brand-danger-opacity-20: #f2495733;
    --brand-danger-disabled: #fbc2c7;


    --brand-assist-lightest: #faf2ff;
    --brand-assist-lighter: #efd9ff;
    --brand-assist-light: #d599ff;
    --brand-assist: #d08cff;
    --brand-assist-dark: #be60ff;
    --brand-assist-darker: #9a08ff;
    --brand-assist-darkest: #8200db;

    --brand-disabled-light: #ededed; /* 选择且禁用的背景 */
    --brand-disabled: #ebebeb; /* 输入框、选择框的禁用背景 */
    --brand-disabled-dark: #999; /* 禁用文本的颜色 */
    --brand-disabled-darker: #9d9d9d; /* 禁用文本的颜色 */

    /* Gray Colors */
    --color-white: white;
    --color-black: black;
    --gray-darkest: #333;
    --gray-darker: #666;
    --gray-dark: #999;
    --gray-base: #aaa;
    --gray-light: #ccc;
    --gray-lighter: #ddd;
    --gray-lightest: #eee;

    /* Component Base Colors */
    --background-color-default: white; /* body 默认的背景 */
    --background-color-default-inverse: #17181f; /* body 默认的背景 */
    --background-color-lightest: #f4f4f4;
    --background-color-lighter: #f4f6f9; /* 选择框的 hover 颜色 */
    --background-color-lighter-inverse: #33353d; /* 选择框的 hover 颜色 */
    --background-color-light: #f4f6f9; /* 表格等组件标题栏颜色 */
    --background-color-base: #ededed; /* 标签、薯条等组件默认颜色 */
    --background-color-base-inverse: #33353d; /* 标签、薯条等组件默认颜色 */
    --background-color-dark: #e3e8f0;
    --background-color-dark-inverse: #2e3038;
    --background-color-darker: #d8dfea;
    --background-color-disabled: var(--el-color-background-5);
    --background-color-hover: #f5f5f5;
    --background-color-disabled-light: #F7F8FA;
    --color-lighter: #ccc; /* Placeholder 字体颜色 */
    --color-light: #999999; /* 次级字体颜色 */
    --color-base: #333333; /* 默认字体颜色 */
    --color-base-inverse: white; /* 默认字体颜色 */
    --color-dark: #363a41; /* 默认字体颜色 */
    --border-color-light: #dee4ed; /* 面板等容器类型的边框颜色 */
    --border-color-base: #e5e5e5; /* 输入框等小组件的边框颜色 */
    --border-color-base-inverse: #212123; /* 输入框等小组件的边框颜色 */
    --border-color-dark: #E3E4E5; /* 按钮等小组件的边框颜色 */
    --border-color-darker: #e0e0e0;

    --font-first-color: #222222; /* 一级字色 */
    --font-second-color: #666666; /* 二级字色 */
    --font-third-color: #999999; /* 三级字色 */
    --font-third-color-opacity-15: #99999926;
    --font-third-color-opacity-60: #99999999;
    --font-fourth-color: #333333; /* 三级字色 */
    --font-disabled-color: #CCCCCC; /* 禁用字色 */
    --font-disabled-color-opacity-50: #CCCCCC80;

    /* Space Dimensions */
    --space-shrink: -1px;
    --space-mini: 4px;
    --space-base: 16px;
    --space-small: 10px;
    --space-medium: 24px;
    --space-large: 30px;
    --space-huge: 40px;

    /* Component Base Dimensions */
    --border-width-base: 1px;
    --width-mini: 80px;
    --width-small: 120px;
    --width-base: 240px; /* 以输入框、选择框为基准的尺寸 */
    --width-medium: 280px;
    --width-large: 440px;
    --width-huge: 580px;
    --height-mini: 22px;
    --height-small: 28px;
    --height-normal: 32px;
    --height-base: 32px; /* 以输入框、选择框为基准的尺寸 */
    --height-medium: 34px;
    --height-large: 38px;
    --height-huge: 42px;
    --border-radius-mini: 2px;
    --border-radius-base: 4px;
    --border-radius-medium: 5px;
    --border-radius-large: 4px;

    /* Fonts */
    /* stylelint-disable value-keyword-case */
    --font-family-zh-CN: BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Tahoma, Arial, 'Noto Sans', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', -apple-system;
    --font-family-code: menlo, consolas, monaco, monospace;
    --tab-size: 4;
    --line-height-base: 1.6;
    --font-size-base: 14px;
    --font-size-small: calc(var(--font-size-base) * (12 / 14));
    --font-size-large: calc(var(--font-size-base) * (16 / 14));
    --font-size-huge: calc(var(--font-size-base) * (24 / 14));
    --font-weight-lighter: lighter;
    --font-weight-light: 300;
    --font-weight-normal: 400;
    --font-weight-bold: 700;
    --font-weight-bolder: bolder;

    --box-shadow-base: 0 0 4px rgba(3, 3, 3, .1);
    --box-shadow-small: 0px 2px 12px rgba(0, 0, 0, 0.06);
    --box-shadow-small-hover: 0px 2px 16px rgba(0, 0, 0, 0.12);
    --box-shadow-large: 0px 2px 15px rgba(64, 69, 78, 0.15);
    --box-shadow-form-item-base: 0 0 0 2px var(--brand-primary-opacity-20);

    /* Z-Index */
    --z-index-loading: 9000;
    --z-index-toast: 8000;
    --z-index-tooltip: 7010;
    --z-index-popper: 7000;
    --z-index-modal: 7000;
    --z-index-plugin: 2000;
    --z-index-layout: 100;
    --z-index-base: 1;

    /* Component Action Hints */
    --cursor-pointer: pointer;
    --cursor-not-allowed: not-allowed;
    --focus-outline: none;

    /* Transition Duration */
    --transition-duration-none: 0s;
    --transition-duration-base: 0.2s;
    --transition-duration-fast: 0.1s;
    --transition-duration-slow: 0.3s;
    --transition-duration-slower: 0.5s;
    --transition-collapse-base: var(--transition-duration-base) height ease-in-out, var(--transition-duration-base) padding-top ease-in-out, var(--transition-duration-base) padding-bottom ease-in-out;

    /**
     * ========================
     *   排版
     * ========================
     */

    --hr-border-color: var(--border-color-base);
    --blockquote-padding: 8px 16px;
    --ulol-padding-left: 20px;
    --pre-font-size: var(--code-font-size);
    --pre-font-family: var(--font-family-code);
    --pre-padding-y: 5px;
    --pre-padding-x: 10px;
    --code-margin-x: 2px;
    --code-padding-y: 3px;
    --code-padding-x: 3px;
    --code-background: var(--background-color-lighter);
    --code-color: #e0276e;
    --code-font-size: var(--font-size-small);

    --kbd-padding-y: 2px;
    --kbd-padding-x: 4px;
    --kbd-font-size: var(--font-size-small);
    --kbd-background: var(--background-color-base);
    --kbd-border-width: var(--border-width-base);
    --kbd-border-color: var(--border-color-dark);
    --kbd-border-radius: var(--border-radius-base);
    --kbd-box-shadow: 0 1px 1px rgba(0,0,0,.2), 0 2px 0 0 rgba(255,255,255,.7) inset;

    --scrollbar-size: 4px;
    --scrollbar-background: rgba(0, 0, 0, 0.15);
    --scrollbar-background-inverse: rgba(0, 0, 0, 0.15);
    --scrollbar-background-hover: rgba(0, 0, 0, 0.25);
    --scrollbar-background-hover-inverse: rgba(0, 0, 0, 0.25);
    --scrollbar-border-radius: 3px;
    --scrollbar-border-color: transparent;
    --scrollbar-border-width: 4px;
}
```

## 在 `.storybook/preview.js` 文件中导入全局变量

```js
import './vars.css';

// ......
```

完成后就可以在组件中使用以上的全局 css 变量