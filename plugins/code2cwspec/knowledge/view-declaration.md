# 页面类型定义

本文档描述生成页面类型定义的流程与注意事项，我们使用 NASL（NaturalTS）+ 表格的格式来描述页面类型定义，必须严格遵守规则的前提下遵守以下流程生成。


## NASL book 知识

本项目全部使用一种新的语言和框架叫 NASL，NaturalTS 是它的 TS 表示，可以认为 NaturalTS = NASL。

<%= parts['spec-1-3.nasl--basic-concepts.md'] %>

<%= parts['spec-1-1.nasl--types.md'] %>

### NASL 关键字

<%= parts['spec-1-0.nasl--keywords.md'] %>

<%= parts['spec-4-1.logic--signature-best-practices.md'] %>

<%= parts['spec-4-2.logic--load-examples.md'] %>

<%= parts['spec-4-3.logic--save-examples.md'] %>

### NASL 完整示例

<%= parts['example-1-5-quickstart--types.md'] %>

<%= parts['example-1-6-quickstart--crud.md'] %>

### 页面逻辑和变量装饰器

<%= parts['spec-4-5.logic--decorator-params-view.md'] %>

#### 输出示例

注意：上面这个示例是完整的，下面说明一下输出结构：

## [学生管理]（student）

### 功能概述

[详细说明功能页面实现的业务功能]

```naturalts path="app.frontendTypes.pc.frontends.pc.views.dashboard.views.student.tsx"
$View({
    title: "学生管理",
    crumb: "学生管理",
    auth: true,
    authDescription: "学生管理",
    isIndex: true,
})
export declare function student({
  param1,
}: {
  /** 参数1描述 */
  param1: String;
});
```

格式规则：
- **参数展开解构格式**：值解构侧（`{ param1, }`）只列出参数名；注释写在类型签名侧（`}: {` 块内），每个参数前加 `/** 描述 */`
- **无输入参数**：当页面无参数时，在函数签名后添加 `无输入参数。`

解释一下：
- 页面声明为一个函数，不需要返回类型（void 都不用写）。
- 禁止生成任何页面内部的实际业务代码。
- 入参和返回类型尽量复用已存在的实体或数据结构，不要重复定义。
- 入参和返回尽量用多参数，其次用匿名数据结构。具名的数据结构除非已存在或者容易复用，否则不要使用。但匿名数据结构的层级不要太深，尽量不要超过3层。
- 禁止使用 union 类型
- 禁止使用 `a: String | null`，推荐使用 `a?: String`

### $View() 装饰器选项

- **title**（必填）：页面标题
- **crumb**：面包屑文字
- **auth**：是否需要权限控制。登录页设为 `false`，CRUD 管理页设为 `true`
- **authDescription**：权限描述。当 `auth: true` 时必须填写
- **isIndex**：是否为默认子页面。CRUD 管理页通常设为 `true`，登录页设为 `false`

典型签名：
- 登录页：`$View({ title: "登录页", auth: false, isIndex: false })`
- CRUD 管理页：`$View({ title: "用户管理", crumb: "用户管理", auth: true, authDescription: "用户管理", isIndex: true })`
- 普通页面：`$View({ title: "客户列表", crumb: "客户列表" })`

### 依赖的枚举、实体

页面必须列出依赖的枚举和实体：
- **数据建模-枚举-[依赖枚举中文名称]**：[数据建模-枚举-[依赖枚举中文名称]（plan/data-model/数据建模-枚举.md）的路径]
- **数据建模-实体-[依赖实体中文名称]**：[数据建模-实体-[依赖实体中文名称]（plan/data-model/[子域]-实体-[依赖实体中文名称]（[依赖实体英文名称]）.md）的路径]

### 特殊组件

仅限二维码、地图、pdf 预览、视频播放器、富文本编辑器等非标准 UI。无特殊组件时使用：
```
<!-- normalized -->

- 无特殊组件
```

## 真实示例

好，现在进一步举个示例。

### 页面设计

设计一个商品订单列表页面，页面中需要展示商品订单列表，并支持分页、排序、筛选等功能。
...

### 当前文件

plan/
├── data-model/
│   ├── 数据建模设计.md
│   ├── 数据建模-枚举.md
│   ├── 商品管理-实体-商品（Product）.md
│   ├── 订单管理-实体-订单（OrderForm）.md
│   ├── 订单管理-实体-订单商品项（OrderProductItem）.md
├── frontend/
│   ├── 业务模块设计.md
│   ├── 订单管理-商品订单列表页（orderForm）.md

### 输出

## [商品订单列表页]（orderForm）

### 功能概述

[详细说明功能页面实现的业务功能]

```naturalts path="app.frontendTypes.pc.frontends.pc.views.dashboard.views.orderForm.tsx"
$View({
    title: "商品订单列表页",
    crumb: "商品订单列表页",
    auth: true,
    authDescription: "商品订单列表页",
    isIndex: true,
})
export declare function orderForm();
```

无输入参数。

### 依赖的枚举、实体

- **数据建模-枚举-订单状态**：plan/data-model/数据建模-枚举.md
- **数据建模-实体-订单**：plan/data-model/订单管理-实体-订单（OrderForm）.md
- **数据建模-实体-商品**：plan/data-model/商品管理-实体-商品（Product）.md

### 特殊组件
<!-- normalized -->

- 无特殊组件
