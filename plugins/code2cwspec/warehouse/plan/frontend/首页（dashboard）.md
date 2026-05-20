# 通用业务模块-总览页（dashboard）

## 总览页（dashboard）

### 功能概述

总览页是通用业务模块的顶层路由承载页面，主要用于展示模块内导航菜单，并作为子页面内容的统一容器。用户可通过导航菜单进入当前模块下真实存在的功能页面，而总览页本身不直接承担具体业务表单、数据处理或复杂交互逻辑，只负责提供稳定的页面框架，并通过路由视图加载当前访问的子功能页面。

### 页面签名

```naturalts path="app.frontendTypes.pc.frontends.pc.views.dashboard.tsx"
$View({
    title: "总览页",
    crumb: "总览页",
})
export declare function dashboard();
```

无输入参数。

### 依赖的枚举、实体

无依赖的枚举、实体。

### 特殊组件

<!-- normalized -->
- 无特殊组件
