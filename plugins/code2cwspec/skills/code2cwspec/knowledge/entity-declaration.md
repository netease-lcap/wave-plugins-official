# 实体类型定义

本文档描述生成实体类型定义的流程与注意事项，我们使用 NASL（NaturalTS）+ 表格的格式来描述实体类型定义，必须严格遵守规则的前提下遵守以下流程生成。

## 关键规则

- 禁止使用 union 类型
- 禁止使用 `import` 引用任何代码模块
- 禁止生成 mock 数据，禁止生成任何 mock 相关的代码
- 禁止使用 `a: String | null`，推荐使用 `a?: String`
- 实体属性 id, xxxId 这类标识必须使用 `Integer` 类型
- 实体必须包含以下属性：id（Integer）、createdTime（DateTime）、updatedTime（DateTime）、createdBy（String）、updatedBy（String）；
- 实体名称额外不能与常用数据库的关键字冲突，如 select, where, join 等等，也能不叫 cursor, analyze, check, decimal, explain, match, natural, user, view, cost 等等。实体属性不受这一条限制。
- 枚举属性严格遵循示例中的 特别注意 格式
- 实体属性严格遵循示例中的 特别注意 格式
- 必须仔细思考实体对应的业务功能，生成每个实体属性都要有规范需求文档的明确要求，禁止虚构任何规范需求文档没有提到的实体属性。
<%= parts['sub-attention-1-1-entities.md'] %>

### 文件夹标签

实体装饰器 `@Entity` 支持 directory 字段用于文件夹标签：

<%= parts['spec-6-1.directory.md'] %>

## Markdown 表格格式规范

**严格遵守以下表格格式规则，避免生成格式错误的表格：**

1. **表头行必须在最前面**，紧跟在空行之后
2. **分隔符行必须紧跟在表头行之后**，格式为 `| --- | --- | --- | --- |`
3. **所有行的列数必须完全一致**，包括表头、分隔符和数据行
4. **禁止在表格中间插入表头行或分隔符行**
5. **每一行必须以 `|` 开头，以 `|` 结尾**
6. **列与列之间用 `|` 分隔，前后各有一个空格**

**正确的表格格式示例：**
```
| 字段名 | 标题 | 数据类型 | 字段特性 | 默认值 | 存储类型（可选） | 限制规则（可选） |
| --- | --- | --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） | | |
| name | 名称 | String | 非空 | | | |
```

**常见错误（禁止）：**
- ❌ 表头和分隔符位置颠倒或在中间出现
- ❌ 不同行的列数不一致（如某行有5列，某行有4列）
- ❌ 分隔符行出现在数据行中间
- ❌ 缺少行首或行尾的 `|` 符号

## 工作流程

### 一、阅读并充分理解以下知识文档

**NASL 基础类型**：（nasl-book/K002-nasl--types.md）
**NASL 实体、数据结构和枚举及相关示例**：（nasl-book/K003-nasl--enums-entities-structures.md）

### 二、完整阅读充分理解 数据建模-枚举（data-model/enums.md）

这里包含实体中所有需要用到的 枚举。

### 三、理解实体类型定义通用格式

以下为通用的输出示例，这里需要说明以下几点：
- 尽管这里没有添加说明注释，但是实际生成每个属性添加注释，注释包含实体属性的中文名称、详细的功能描述；
- `Product`、`Order` 等实体名称和 `name`、`totalAmount` 等属性名称需要根据实际业务需要进行修改；
- 总是生成两种格式：NASL（NaturalTS）格式 + 方便阅读的表格格式；
- 代码块一定要标注 naturalts 和 path。
- **表格格式必须严格遵守上述 Markdown 表格格式规范，确保列数一致、表头在最前、分隔符紧跟表头**

特别注意：生成 实体类型定义 后，必须思考是否严格遵守上述所有关键规则。如果生成的 实体类型定义 没有严格遵守上述所有关键规则，必须重新生成，直到严格遵守上述所有关键规则

## 商品（Product）

(...一段关于该实体的详细描述...)

```naturalts path="app.dataSources.defaultDS.entities.Product.ts"
<%= parts['sub-examples-1-1-entities-product.md'] %>
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 | 存储类型（可选） | 限制规则（可选） |
| --- | --- | --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） | | |
| createdTime | 创建时间 | DateTime | 非空 | （自动生成） | | |
| updatedTime | 更新时间 | DateTime | 非空 | （自动生成） | | |
| createdBy | 创建人 | String | 非空 | （自动生成） | | |
| updatedBy | 更新人 | String | 非空 | （自动生成） | | |
| name | 商品名称 | String | 非空 | | VARCHAR(50) | |
| description | 商品描述 | String | | '' | TEXT | |
| price | 售价 | Decimal | 非空 | 0 | DECIMAL(10, 2) | min(0) |
| stock | 库存数量 | Integer | | 0 | | min(0), max(999999) |
| isOnSale | 是否上架 | Boolean | 非空 | false | | |

## 订单（Order）

(...一段关于该实体的详细描述...)

```naturalts path="app.dataSources.defaultDS.entities.Order.ts"
<%= parts['sub-examples-1-2-entities-order.md'] %>
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 | 存储类型（可选） | 限制规则（可选） |
| --- | --- | --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） | | |
| createdTime | 创建时间 | DateTime | 非空 | （自动生成） | | |
| updatedTime | 更新时间 | DateTime | 非空 | （自动生成） | | |
| createdBy | 创建人 | String | 非空 | （自动生成） | | |
| updatedBy | 更新人 | String | 非空 | （自动生成） | | |
| orderNo | 订单编号 | String | 非空 | | VARCHAR(64) | |
| productId | 商品 | Integer | 非空、外键关联实体 Product（PROTECT） | | | |
| quantity | 购买数量 | Integer | 非空 | 1 | | min(1), max(9999) |
| totalAmount | 订单金额 | Decimal | 非空 | 0 | DECIMAL(12, 2) | min(0) |
| status | 订单状态 | app.enums.OrderStatus | 非空 | OrderStatus['PENDING'] | | |
| isPaid | 是否已支付 | Boolean | 非空 | false | | |
| remark | 备注 | String | | '' | | |

## 表格生成检查清单

**生成每个实体的表格时，必须逐项检查以下条件：**

- [ ] **表头行在最前面** - 第一行必须是列标题（字段名、标题、数据类型、字段特性、默认值、存储类型（可选）、限制规则（可选））
- [ ] **分隔符行紧跟表头** - 第二行必须是 `| --- | --- | --- | --- | --- | --- | --- |`（7列对应7个分隔符）
- [ ] **列数完全一致** - 所有行（包括表头、分隔符、数据行）的列数必须相同（7列）
- [ ] **行首行尾都有竖线** - 每一行都以 `|` 开头，以 `|` 结尾
- [ ] **列间距正确** - 每个 `|` 前后各有一个空格：`| 内容 |`
- [ ] **禁止中间插入表头** - 不允许在数据行中间出现表头行或分隔符行
- [ ] **禁止列数变化** - 不允许某行有8列，另一行有7列的情况
- [ ] **所有必需字段都包含** - id、createdTime、updatedTime、createdBy、updatedBy 必须在表格中
- [ ] **字段顺序合理** - 系统字段（id、createdTime等）在前，业务字段在后
