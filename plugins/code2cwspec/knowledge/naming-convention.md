# 文件命名规范

## 输出文件命名

所有文件输出到 `cwspec/` 目录（扁平结构，无子目录）。

### 实体文件

- 格式：`app.dataSources.defaultDS.entities.EntityName.ts`
- 示例：
  - `app.dataSources.defaultDS.entities.Customer.ts`
  - `app.dataSources.defaultDS.entities.LcapUser.ts`
  - `app.dataSources.defaultDS.entities.PurchaseApplication.ts`

### 枚举文件

- 格式：`app.enums.EnumName.ts`
- 示例：
  - `app.enums.CustomerStatus.ts`
  - `app.enums.UserStatusEnum.ts`
  - `app.enums.YesNo.ts`

### 需求文件

- `spec.md` — 单一需求规格文档
- `menus.md` — 功能模块目录表

### 中间产物

- `research-report.md` — 代码研究报告
- `architecture-plan.md` — 架构设计方案
- `generation-manifest.json` — 生成清单
- `quality-report.md` — 质量验证报告

## directory 字段命名

`@Entity`/`@Enum` 装饰器中的 `directory` 字段用于标记分类：

- 格式：`module_en(模块中文)` 或简单名 `modulename`
- 命名规则：小写字母开头，只能包含小写字母、数字或下划线
- directory 仅起标记作用，不影响文件路径和命名空间

| directory | 说明 |
|---|---|
| `permission_center(权限中心)` | 权限管理相关实体/枚举 |
| `customer_management(客户管理)` | 客户管理相关实体/枚举 |
| `procurement_management(采购管理)` | 采购管理相关实体/枚举 |
| `knowledge_document(知识文档)` | 知识文档相关实体/枚举 |
| `data_reporting(数据报表)` | 数据报表相关实体/枚举 |
| `common(通用)` | 跨模块通用实体/枚举 |

## 实体名与属性名

- 实体名：PascalCase（如 `Customer`, `PurchaseApplication`, `LcapUser`）
- 属性名：camelCase（如 `customerName`, `orderId`, `createdTime`）
- 枚举名：PascalCase（如 `CustomerStatus`, `OrderStatus`, `YesNo`）
- 枚举键：UPPER_SNAKE_CASE 用单引号包裹（如 `'PENDING'`, `'CLOSED_WON'`）
