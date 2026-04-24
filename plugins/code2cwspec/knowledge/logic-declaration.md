# 逻辑类型定义

本文档描述生成逻辑类型定义的流程与注意事项，我们使用 NASL（NaturalTS）+ 表格的格式来描述逻辑类型定义，必须严格遵守规则的前提下遵守以下流程生成。

## NASL book 知识

本项目全部使用一种新的语言和框架叫 NASL，NaturalTS 是它的 TS 表示，可以认为 NaturalTS = NASL。

<%= parts['spec-1-3.nasl--basic-concepts.md'] %>

<%= parts['spec-1-1.nasl--types.md'] %>

### NASL 关键字

<%= parts['spec-1-0.nasl--keywords.md'] %>

<%= parts['spec-4-1.logic--signature-best-practices.md'] %>

<%= parts['spec-4-2.logic--load-examples.md'] %>

<%= parts['spec-4-3.logic--save-examples.md'] %>

<%= parts['spec-4-4.logic--complete-example.md'] %>

### $Logic 装饰器参数（服务端逻辑）

<%= parts['spec-4-5.logic--decorator-params-server.md'] %>

#### 输出示例

注意：上面这个示例是完整的，下面说明一下输出结构：

## [加载学生列表_给表格使用]（loadStudentForTable）

### 功能概述

[详细说明服务端逻辑包含的业务功能]

### 逻辑签名

```naturalts path="app.logics.loadStudentForTable.ts"
$Logic({
    description: '从数据库中获取学生列表',
    directory: 'school_management(学校管理)',
    returnDescription: '学生列表分页结果'
})
export declare function loadStudentForTable(
  /** 页码，从 1 开始 */
  page: Integer,
  /** 每页条数 */
  size: Integer,
  /** 排序字段 */
  sort: String,
  /** 排序方向，asc 或 desc */
  order: String,
  /** 过滤条件 */
  filter: app.dataSources.defaultDS.entities.Student
): {
  /** 学生列表，每项包含学生和学校信息 */
  list: List<{ student: app.dataSources.defaultDS.entities.Student, school: app.dataSources.defaultDS.entities.School }>;
  /** 总条数 */
  total: Integer
};
```

格式规则：
- **参数和返回类型属性都需要写注释**：每个参数/属性前加 `/** 描述 */`，注释紧贴参数，换多行书写格式
- **returnDescription** 描述返回值整体含义，写在 `$Logic` 装饰器中
- 表格中的"描述"列内容与代码注释保持一致

| 输入参数 | 标题 | 数据类型 | 描述 |
| --- | --- | --- | --- |
| page | 页码 | Integer | 页码 |
| size | 每页条数 | Integer | 每页条数 |
| sort | 排序字段 | String | 排序字段 |
| order | 排序顺序 | String | 排序顺序 |
| filter | 过滤条件 | app.dataSources.defaultDS.entities.Student | 过滤条件 |

| 返回值字段 | 标题 | 数据类型 | 描述 |
| --- | --- | --- | --- |
| list | 学生列表 | List<{ student: app.dataSources.defaultDS.entities.Student, school: app.dataSources.defaultDS.entities.School }> | 学生列表，列表项为两层结构，顶层为一个匿名数据结构，第二层包含学生实体和学校实体 |
| total | 总条数 | Integer | 总条数 |

## 真实示例

好，现在进一步举个示例。

### 逻辑设计

设计一个商品下单的逻辑，商品下单需要选择商品和数量，商品和数量需要从数据库中获取。
...

### 输出

## [创建商品订单]（createOrder）

### 功能概述

[详细说明服务端逻辑包含的业务功能]

### 逻辑签名

```naturalts path="app.logics.createOrder.ts"
$Logic({
    description: '创建商品订单',
    directory: 'order_management(订单管理)',
    returnDescription: '创建成功的订单信息'
})
export declare function createOrder(input: {
  /** 订单表单 */
  orderForm: app.dataSources.defaultDS.entities.OrderForm;
  /** 订单商品项列表 */
  productOrderItems: List<app.dataSources.defaultDS.entities.OrderProductItem>;
}): app.dataSources.defaultDS.entities.OrderForm;
```

| 输入参数 | 标题 | 数据类型 | 描述 |
| --- | --- | --- | --- |
| input | 输入参数 | { orderForm: app.dataSources.defaultDS.entities.OrderForm, productOrderItems: List<app.dataSources.defaultDS.entities.OrderProductItem> } | 输入参数，包含订单表单和商品订单项列表 |

| 返回值整体 | 标题 | 数据类型 | 描述 |
| --- | --- | --- | --- |
| result | 创建结果 | app.dataSources.defaultDS.entities.OrderForm | 补充了 id 的订单表单 |

或者不需要匿名数据结构的示例：

```naturalts path="app.logics.createOrder.ts"
$Logic({
    description: '创建商品订单',
    directory: 'order_management(订单管理)',
    returnDescription: '创建成功的订单信息'
})
export declare function createOrder(
  /** 订单表单 */
  orderForm: app.dataSources.defaultDS.entities.OrderForm,
  /** 订单商品项列表 */
  productOrderItems: List<app.dataSources.defaultDS.entities.OrderProductItem>
): app.dataSources.defaultDS.entities.OrderForm;
```

| 输入参数 | 标题 | 数据类型 | 描述 |
| --- | --- | --- | --- |
| orderForm | 订单表单 | app.dataSources.defaultDS.entities.OrderForm | 订单表单 |
| productOrderItems | 商品订单项 | List<app.dataSources.defaultDS.entities.OrderProductItem> | 商品订单项列表，每个商品订单项包含商品 ID 和数量 |

| 返回值整体 | 标题 | 数据类型 | 描述 |
| --- | --- | --- | --- |
| result | 创建结果 | app.dataSources.defaultDS.entities.OrderForm | 补充了 id 的订单表单 |


<attention>
- 如果逻辑的主要功能是分页查询，输出参数类型定义必须为 `{ list: List<{...}>, total: Integer }`。
- 逻辑是一个同步方法，接收指定结构的业务参数，返回业务指定数据结构，不要考虑逻辑报错异常返回的情况；
- 返回类型中无需表示异常信息，逻辑体内会自动捕获，提示给用户；尽量少写 success, errorMessage 等字段，除非必要。
- 禁止生成任何逻辑内部的实际业务代码。
- 入参和返回类型尽量复用已存在的实体或数据结构，不要重复定义。
- 逻辑的入参和返回尽量用多参数，其次用匿名数据结构。具名的数据结构除非已存在或者容易复用，否则不要使用。但匿名数据结构的层级不要太深，尽量不要超过3层。
- 禁止使用 union 类型
- 禁止使用 `a: String | null`，推荐使用 `a?: String`

- 单实体的 create, update, delete, batchCreate, batchUpdate, batchDelete 不需要引用服务端逻辑，引用实体本身就行
- 复杂的 create, update, delete, batchCreate, batchUpdate, batchDelete 操作需要引用一个服务端逻辑 app.logics.createSchoolAndStudents.ts
- 最后可以思考一些可能需要补充的服务端逻辑，比如复用场景等，如 app.logics.getCurrentStudentInfo.ts
- 返回值如果为匿名数据结构，则表格可以针对每个字段详细描述，否则只描述整体返回值（一般叫 result）。
</attention>