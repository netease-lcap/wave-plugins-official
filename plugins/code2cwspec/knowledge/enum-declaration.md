# 枚举类型定义（TypeScript）

每个枚举一个 `.ts` 文件，文件路径即命名空间：`app.enums.EnumName.ts`

## 格式规范

```typescript
@Enum({
    title: '订单状态',
    directory: 'business_management(业务管理)',
})
export class OrderStatus extends BaseEnum<String> {
    static readonly 'PENDING' = new OrderStatus('PENDING', '待支付');
    static readonly 'PAID' = new OrderStatus('PAID', '已支付');
    static readonly 'SHIPPED' = new OrderStatus('SHIPPED', '已发货');
    static readonly 'CANCELLED' = new OrderStatus('CANCELLED', '已取消');
}
```

## 关键规则

- 枚举名 PascalCase，禁止与 JS/TS/Java/NASL/数据库关键字冲突
- 所有枚举键必须用**单引号**包裹（字符串字面量）
- 键必须等于构造函数的第一个参数
- Integer 枚举构造函数用数字字面量（如 `0`, `-1`），String 枚举用字符串字面量（如 `'PENDING'`）
- 负整数枚举必须通过字符串键访问：`app.enums.SignedStatus['-1']`
- `directory` 格式：`module_en(模块中文)`，小写字母开头，只能包含小写字母/数字/下划线
- 禁止生成权限角色、菜单、用户、部门、组织架构相关枚举
- 每个文件只需 `export`，不需要 `import`（已支持自动 import）

## 补充枚举的检查清单

扫描所有实体属性，识别真正需要枚举表达的有限、离散、固定值属性：

1. 属性值范围有限且语义稳定（如：是/否、启用/禁用、待审/已审/已驳回）
2. 属性值代表明确的业务分类或业务状态（如：订单类型、审核状态）
3. 属性值会在多个地方被复用、判断或比较
4. 使用枚举能显著提升一致性，而非把普通数字硬编码成枚举

## 严格收缩规则

- 凡是"是否/是否启用/是否上架"等二值判断，统一复用同一个"是/否"枚举（YesNo），禁止为每个场景重复生成
- 纯数字、数量、编号、分值、排序值、阈值、百分比、金额、次数等数值型内容，禁止生成枚举
- 商品分类、标签、名称、描述、备注、地址、型号、来源等开放集合内容，禁止生成枚举
- 如果某个业务概念已存在对应实体，或本应建模为实体，禁止再创建同名枚举
- 如果某个概念需要独立维护、支持扩展新增、被多个对象通过外键引用，必须建模为实体，禁止收缩成枚举
- 值集合相同或近似的重复枚举，必须合并复用
- 生成策略：优先批量生成最小充分枚举集，先复用已有共享枚举，再补充核心业务枚举

## 示例

### String 枚举：订单状态（`app.enums.OrderStatus.ts`）

```typescript
@Enum({
    title: '订单状态',
    directory: 'business_management(业务管理)',
})
export class OrderStatus extends BaseEnum<String> {
    static readonly 'PENDING' = new OrderStatus('PENDING', '待支付');
    static readonly 'PAID' = new OrderStatus('PAID', '已支付');
    static readonly 'SHIPPED' = new OrderStatus('SHIPPED', '已发货');
    static readonly 'CANCELLED' = new OrderStatus('CANCELLED', '已取消');
}
```

### Integer 枚举：商品分类（`app.enums.ProductCategory.ts`）

```typescript
@Enum({
    title: '商品分类',
    directory: 'business_management(业务管理)',
})
export class ProductCategory extends BaseEnum<Integer> {
    static readonly '0' = new ProductCategory(0, '电子产品');
    static readonly '1' = new ProductCategory(1, '服装');
    static readonly '2' = new ProductCategory(2, '食品');
}
```

### String 枚举：任务优先级（`app.enums.TaskPriority.ts`）

```typescript
@Enum({
    title: '任务优先级',
    directory: 'task_management(任务管理)',
})
export class TaskPriority extends BaseEnum<String> {
    static readonly '001' = new TaskPriority('001', '高');
    static readonly '002' = new TaskPriority('002', '中');
    static readonly '003' = new TaskPriority('003', '低');
}
```

### Integer 枚举（含负值）：执行结果（`app.enums.SignedStatus.ts`）

```typescript
@Enum({
    title: '执行结果',
    directory: 'common(通用)',
})
export class SignedStatus extends BaseEnum<Integer> {
    static readonly '-1' = new SignedStatus(-1, '失败');
    static readonly '0' = new SignedStatus(0, '未知');
    static readonly '1' = new SignedStatus(1, '成功');
}
```

### 是/否枚举（`app.enums.YesNo.ts`）— 二值判断统一复用

```typescript
@Enum({
    title: '是/否',
    directory: 'common(通用)',
})
export class YesNo extends BaseEnum<String> {
    static readonly 'YES' = new YesNo('YES', '是');
    static readonly 'NO' = new YesNo('NO', '否');
}
```

### 内置枚举：用户状态（`app.enums.UserStatusEnum.ts`）

```typescript
@Enum({
    title: '用户状态',
    directory: 'permission_center(权限中心)',
})
export class UserStatusEnum extends BaseEnum<String> {
    static readonly 'Normal' = new UserStatusEnum('Normal', '正常');
    static readonly 'Forbidden' = new UserStatusEnum('Forbidden', '禁用');
}
```

### 内置枚举：用户来源（`app.enums.UserSourceEnum.ts`）

```typescript
@Enum({
    title: '用户来源',
    directory: 'permission_center(权限中心)',
})
export class UserSourceEnum extends BaseEnum<String> {
    static readonly 'Normal' = new UserSourceEnum('Normal', '普通登录');
    static readonly 'OpenId' = new UserSourceEnum('OpenId', 'OpenId');
}
```
