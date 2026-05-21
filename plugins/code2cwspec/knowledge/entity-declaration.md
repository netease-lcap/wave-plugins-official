# 实体类型定义（TypeScript）

每个实体一个 `.ts` 文件，文件路径即命名空间：`app.dataSources.defaultDS.entities.EntityName.ts`

## 基础类型

```typescript
// NASL 基础类型
type String = string;       // 字符串
type Boolean = boolean;     // 布尔
type Integer = number;      // 整数（安全范围: -2^53+1 到 2^53-1）
type Decimal = number;      // 小数
type Date;                  // 日期
type Time;                  // 时间
type DateTime;              // 日期时间
```

实体属性只能使用 NASL 基础类型（String, Boolean, Integer, Decimal, Date, Time, DateTime）和枚举类型，禁止使用 List、Map 或其他复合类型。

## 关键约束

- 每个文件只需 `export`，不需要 `import`（已支持自动 import）
- 实体名 PascalCase，属性名 camelCase
- 实体名禁止与 JS/TS/Java 关键字冲突：package, import, class, constructor 等
- 实体名禁止与 NASL 关键字冲突：app, apps, mod, mods, module, modules, entity, entities, struct, structure, structures, enum, enums, logic, logics, interface, interfaces, view, views, process, processes, role, roles, theme, config, configuration, dep, deps, dependency, dependencies, ext, exts, extension, extensions, com, coms, component, components, viewComponent, viewComponents, processComponent, processComponents, constant, constants, return, returns, variable, variables, case, cases, element, elements, rule, rules, attr, attrs, event, events, slot, slots, method, methods, connector, nasl, core, collection, interface, ui, util, browser, validation, process, annotation, database, dataSource, dataSet, pc, h5, event, logging, i18n, debug, debugger, inspect, auth, experimental, fs, file, path, math, object, system, boolean, string, integer, decimal, date, time, datetime, length, list, map
- 实体名额外禁止与数据库关键字冲突：select, where, join, cursor, analyze, check, decimal, explain, match, natural, user, view, cost 等
- 属性默认值只支持布尔字面量、数字字面量、字符串字面量、枚举值和 null，禁止表达式
- id, createdTime, updatedTime 的默认值会自动生成，禁止手动设置

## @Entity 装饰器

```typescript
@Entity({
    title: '客户',                                          // 实体标题（必填）
    description: '记录客户的基本信息',                       // 描述（必填）
    directory: 'customer_management(客户管理)',               // 目录分类
})
```

- `directory` 格式：简单名 `'newfolder1'` 或带标题 `'permission_center(权限中心)'`
- `directory` 命名规则：小写字母开头，只能包含小写字母、数字或下划线
- `directory` 仅起标记作用，不影响命名空间和文件路径
- **禁止填写** `uuid`、`tableName`、`columnName`（这些由系统自动生成）

## @EntityProperty 装饰器

```typescript
@EntityProperty({
    title: '客户名称',                    // 属性标题（必填）
    description: '客户的企业名称',        // 属性描述
    required: true,
    primaryKey: false,
    generationRule: 'manual',            // 系统字段为 'auto'，业务字段省略或 'manual'
    dbType: VARCHAR(100),
    rules: [min(0), max(100)],
})
customerName: String = "";
```

- `generationRule`：系统字段（id、createdTime、updatedTime、createdBy、updatedBy）必须为 `'auto'`；Lcap* 实体所有属性均为 `'auto'`
- `title` 和 `description` 必须填写
- **禁止填写** `uuid`、`columnName`（这些由系统自动生成）

## @EntityRelation 装饰器（外键关联）

```typescript
@EntityProperty({ title: '所属销售' })
@EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('CASCADE')
ownerId: String;
```

- **必须带泛型类型参数**：`@EntityRelation<app.dataSources.defaultDS.entities.TargetEntity['field']>`
- `deleteRule`：只支持 `'PROTECT'` 或 `'CASCADE'`

## dbType 规范

**Integer**：
| dbType | 说明 |
|---|---|
| _(省略)_ | 默认 bigint，绝大多数场景省略即可 |
| TINYINT | 1字节，范围 -128~127 |
| SMALLINT | 2字节，范围 -32768~32767 |
| INT(11) | 4字节 |

**Decimal**：
| dbType | 说明 |
|---|---|
| DECIMAL(precision, scale) | 固定精度小数，如 DECIMAL(10, 2) |
| DOUBLE | 双精度浮点数 |

> Decimal 属性**必须始终显式写明 dbType**。

**String**：
| dbType | 说明 |
|---|---|
| _(省略)_ | 默认 VARCHAR(255) |
| VARCHAR(n) | 可变长度，自动派生 maxLength(n) |
| CHAR(n) | 固定长度 |
| TEXT | 长文本（~65535字节） |
| LONGTEXT | 超长文本（~4GB） |

**DateTime**：省略默认 DATETIME，也可写 TIMESTAMP

**Boolean、Date、Time、枚举类型禁止设置 dbType。**

## rules 规范

```typescript
rules: [min(0), max(100)]      // Integer/Decimal
rules: [minLength(1)]          // String
```

- Integer/Decimal：只能用 `min(value)` / `max(value)`
- String：只能用 `minLength(value)` / `maxLength(value)`
- Boolean/Date/Time/DateTime/枚举：不支持 rules
- VARCHAR(n) 自动派生 maxLength(n)，不要重复手写
- TEXT/LONGTEXT 不会自动派生，如需限制须手动写 maxLength

## 系统审计字段（每个实体必须包含）

```typescript
@EntityProperty({ title: '主键', primaryKey: true, generationRule: 'auto' })
id: Integer;

@EntityProperty({ title: '创建时间', generationRule: 'auto' })
createdTime: DateTime;

@EntityProperty({ title: '更新时间', generationRule: 'auto' })
updatedTime: DateTime;

@EntityProperty({ title: '创建者', generationRule: 'auto' })
createdBy: String;

@EntityProperty({ title: '更新者', generationRule: 'auto' })
updatedBy: String;
```

## 枚举属性写法

```typescript
@EntityProperty({ title: '客户状态', required: true })
customerStatus: app.enums.CustomerStatus = app.enums.CustomerStatus['POTENTIAL'];
```

## LCAP 内置实体 FK 关联规范（强制）

所有涉及以下业务概念的属性，必须使用对应的 LCAP 内置实体 FK 关联，禁止使用基础类型：

1. **人员属性 → LcapUser**：userId、assigneeId、ownerId、manager、operator、approver 等
   ```typescript
   @EntityProperty({ title: '所属销售' })
   @EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('CASCADE')
   ownerId: String;
   ```
   - **禁止**将 `createdBy`/`updatedBy` 关联到 LcapUser（它们保持 String + generationRule:'auto'）

2. **权限属性 → LcapPermission**：permissionId 等
   ```typescript
   @EntityRelation<app.dataSources.defaultDS.entities.LcapPermission['id']>('CASCADE')
   permissionId: Integer;
   ```

3. **角色属性 → LcapRole**：roleId 等
   ```typescript
   @EntityRelation<app.dataSources.defaultDS.entities.LcapRole['id']>('CASCADE')
   roleId: Integer;
   ```

4. **部门属性 → LcapDepartment**：departmentId、deptId 等
   ```typescript
   @EntityRelation<app.dataSources.defaultDS.entities.LcapDepartment['deptId']>('CASCADE')
   deptId: String;
   ```

**关键原则**：
- 禁止创建 User、Employee、Staff、Role、Permission、Department、Organization 等自定义实体
- 必须通过 FK 关联，不要用 string/integer 存储
- 如果某个属性属于固定取值、分类、状态、布尔语义，必须优先复用已有枚举，禁止退化为 Boolean/String/Integer

## 完整示例

### Product 实体（`app.dataSources.defaultDS.entities.Product.ts`）

```typescript
@Entity({
    title: '商品',
    description: '记录商品的基本信息，包括名称、描述、售价、库存及上架状态',
    directory: 'business_management(业务管理)',
})
export class Product {
    @EntityProperty({ title: '主键', primaryKey: true, generationRule: 'auto' })
    id: Integer;

    @EntityProperty({ title: '创建时间', generationRule: 'auto' })
    createdTime: DateTime;

    @EntityProperty({ title: '更新时间', generationRule: 'auto' })
    updatedTime: DateTime;

    @EntityProperty({ title: '创建者', generationRule: 'auto' })
    createdBy: String;

    @EntityProperty({ title: '更新者', generationRule: 'auto' })
    updatedBy: String;

    @EntityProperty({ title: '商品名称', description: '最多50个字符', dbType: VARCHAR(50), required: true })
    name: String;

    @EntityProperty({ title: '商品描述', description: '长文本，无字数限制', dbType: TEXT })
    description: String = '';

    @EntityProperty({ title: '售价', description: '单位：元，最多两位小数', dbType: DECIMAL(10, 2), required: true, rules: [min(0)] })
    price: Decimal = 0;

    @EntityProperty({ title: '库存数量', rules: [min(0), max(999999)] })
    stock: Integer = 0;

    @EntityProperty({ title: '是否上架', required: true })
    isOnSale: Boolean = false;
}
export const ProductEntity = createEntity<Product>();
```

### Order 实体（含 FK 和枚举）

```typescript
@Entity({
    title: '订单',
    description: '记录订单信息，包含关联商品、数量、金额及订单状态',
    directory: 'business_management(业务管理)',
})
export class Order {
    @EntityProperty({ title: '主键', primaryKey: true, generationRule: 'auto' })
    id: Integer;

    @EntityProperty({ title: '创建时间', generationRule: 'auto' })
    createdTime: DateTime;

    @EntityProperty({ title: '更新时间', generationRule: 'auto' })
    updatedTime: DateTime;

    @EntityProperty({ title: '创建者', generationRule: 'auto' })
    createdBy: String;

    @EntityProperty({ title: '更新者', generationRule: 'auto' })
    updatedBy: String;

    @EntityProperty({ title: '订单编号', dbType: VARCHAR(64), required: true })
    orderNo: String;

    @EntityProperty({ title: '商品' })
    @EntityRelation<app.dataSources.defaultDS.entities.Product['id']>('PROTECT')
    productId: Integer;

    @EntityProperty({ title: '购买数量', required: true, rules: [min(1), max(9999)] })
    quantity: Integer = 1;

    @EntityProperty({ title: '订单金额', description: '单位：元', dbType: DECIMAL(12, 2), required: true, rules: [min(0)] })
    totalAmount: Decimal = 0;

    @EntityProperty({ title: '订单状态', required: true })
    status: app.enums.OrderStatus = app.enums.OrderStatus['PENDING'];

    @EntityProperty({ title: '是否已支付', required: true })
    isPaid: Boolean = false;

    @EntityProperty({ title: '备注' })
    remark: String = '';
}
export const OrderEntity = createEntity<Order>();
```

### Customer 实体（含 LcapUser FK）

```typescript
@Entity({
    title: '客户',
    description: '记录客户的基本信息，包括客户名称、联系人、联系方式、客户状态及所属销售等信息',
    directory: 'customer_management(客户管理)',
})
export class Customer {
    @EntityProperty({ title: '主键', primaryKey: true, generationRule: 'auto' })
    id: Integer;

    @EntityProperty({ title: '创建时间', generationRule: 'auto' })
    createdTime: DateTime;

    @EntityProperty({ title: '更新时间', generationRule: 'auto' })
    updatedTime: DateTime;

    @EntityProperty({ title: '创建者', generationRule: 'auto' })
    createdBy: String;

    @EntityProperty({ title: '更新者', generationRule: 'auto' })
    updatedBy: String;

    @EntityProperty({ title: '客户名称', description: '客户的企业名称或个人姓名', required: true, dbType: VARCHAR(100) })
    customerName: String = "";

    @EntityProperty({ title: '客户状态', description: '客户当前的状态分类', required: true })
    customerStatus: app.enums.CustomerStatus = app.enums.CustomerStatus['POTENTIAL'];

    @EntityProperty({ title: '所属销售', description: '负责该客户的销售人员' })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('CASCADE')
    ownerId: String;
}
export const CustomerEntity = createEntity<Customer>();
```
