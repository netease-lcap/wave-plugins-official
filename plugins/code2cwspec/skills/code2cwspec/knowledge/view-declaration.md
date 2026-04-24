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
    auth: false,
    isIndex: false,
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

解释一下：
- 页面声明为一个函数，不需要返回类型（void 都不用写）。
- 禁止生成任何页面内部的实际业务代码。
- 入参和返回类型尽量复用已存在的实体或数据结构，不要重复定义。
- 入参和返回尽量用多参数，其次用匿名数据结构。具名的数据结构除非已存在或者容易复用，否则不要使用。但匿名数据结构的层级不要太深，尽量不要超过3层。
- 禁止使用 union 类型
- 禁止使用 `a: String | null`，推荐使用 `a?: String`

关于依赖：
- 一个页面中，数据查询都需要引用一个服务端逻辑，包括表格的数据查询、选择框的数据查询等，如 app.logics.loadStudentForTable.ts
- 单实体的 create, update, delete, batchCreate, batchUpdate, batchDelete 不需要引用服务端逻辑，依赖实体本身就行，如 app.dataSources.defaultDS.entities.StudentEntity.create(input) 依赖 app.dataSources.defaultDS.entities.Student.ts 就行（在文档中不用写）
- 复杂的 create, update, delete, batchCreate, batchUpdate, batchDelete 操作需要引用一个服务端逻辑，如 app.logics.createSchoolAndStudents.ts
- 最后可以思考一些可能需要补充的服务端逻辑，比如复用场景等，如 app.logics.getCurrentStudentInfo.ts

下面是针对逻辑 signature 的补充说明：
- 如果逻辑的主要功能是分页查询，输出参数类型定义必须为 `{ list: List<{...}>, total: Integer }`。
- 逻辑是一个同步方法，接收指定结构的业务参数，返回业务指定数据结构，不要考虑逻辑报错异常返回的情况；
- 返回类型中无需表示异常信息，逻辑体内会自动捕获，提示给用户；尽量少写 success, errorMessage 等字段，除非必要。
- 禁止生成任何逻辑内部的实际业务代码。
- 入参和返回类型尽量复用已存在的实体或数据结构，不要重复定义。
- 逻辑的入参和返回尽量用多参数，其次用匿名数据结构。具名的数据结构除非已存在或者容易复用，否则不要使用。但匿名数据结构的层级不要太深，尽量不要超过3层。

## 真实示例

好，现在进一步举个示例。

### 页面设计

设计一个商品订单列表页面，页面中需要展示商品订单列表，并支持分页、排序、筛选等功能。
...

### 当前文件

plan/
├── data-model/
│   ├── index.md
│   ├── enums.md
│   ├── entity-Product.md
│   ├── entity-OrderForm.md
│   ├── entity-OrderProductItem.md
├── backend/
│   ├── index.md
│   ├── logic-loadOrderFormList.md
├── frontend/
│   ├── view-OrderForm.md
src/
├── app.dataSources.defaultDS.entities.Product.ts
├── app.dataSources.defaultDS.entities.OrderForm.ts
├── app.enums.OrderStatus.ts

### 输出

## [商品订单列表页]（orderForm）

### 功能概述

[详细说明功能页面实现的业务功能]

```naturalts path="app.frontendTypes.pc.frontends.pc.views.dashboard.views.orderForm.tsx"
$View({
    title: "商品订单列表页",
    crumb: "商品订单列表页",
    auth: false,
    isIndex: false,
})
export declare function orderForm();
```

无输入参数。
