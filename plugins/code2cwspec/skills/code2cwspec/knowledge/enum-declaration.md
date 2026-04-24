# 枚举类型定义

本文档描述生成枚举类型定义的流程与注意事项，我们使用 NASL（NaturalTS）+ 表格的格式来描述枚举类型定义，必须严格遵守规则的前提下遵守以下流程生成。

## 规则

- 禁止使用 union 类型
- 禁止使用 `a: string | null`，推荐使用 `a?: string`

### 文件夹标签

枚举装饰器 `@Enum` 支持 directory 字段用于文件夹标签：

<%= parts['spec-6-1.directory.md'] %>

## 流程

### 一、阅读并充分理解以下知识文档

**NASL 基础类型**：（nasl-book/K002-nasl--types.md）
**NASL 实体、数据结构和枚举及相关示例**：（nasl-book/K003-nasl--enums-entities-structures.md）

### 二、理解枚举类型定义通用格式

以下为通用的输出示例，这里需要说明以下几点：
- `OrderStatus`、`PENDING` 等名称需要根据实际业务需要进行修改；
- 总是生成两种格式：NASL（NaturalTS）格式 + 方便阅读的表格格式；
- 代码块一定要标注 naturalts 和 path。

## 订单状态（OrderStatus）

(...一段关于该枚举的详细描述...)

```naturalts path="app.enums.OrderStatus.ts"
<%= parts['sub-examples-2-2-enums-order-status.md'] %>
```

| 枚举值 | 标题 |
| --- | --- |
| PENDING | 待支付 |
| PAID | 已支付 |
| SHIPPED | 已发货 |
| CANCELLED | 已取消 |

## 任务优先级（TaskPriority）

(...一段关于该枚举的详细描述...)

```naturalts path="app.enums.TaskPriority.ts"
<%= parts['sub-examples-2-4-enums-task-priority.md'] %>
```

| 枚举值 | 标题 |
| --- | --- |
| '001' | 高 |
| '002' | 中 |
| '003' | 低 |
