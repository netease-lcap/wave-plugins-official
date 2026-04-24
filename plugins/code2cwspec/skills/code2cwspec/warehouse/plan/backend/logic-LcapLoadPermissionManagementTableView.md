# 权限中心-加载权限管理表格视图数据（LcapLoadPermissionManagementTableView）

## 加载权限管理表格视图数据（LcapLoadPermissionManagementTableView）

### 功能概述

该服务端逻辑用于权限管理页面的表格数据源，支持按权限名称筛选、分页。返回结构中包含权限实体及关联的角色列表（roleList），用于表格中展示「权限角色」列及编辑/删除按钮的权限控制（editable），满足权限管理页的列表与操作需求。

### 功能要点

- **分页**：支持 page、size，与前端表格分页组件配合；结果用 `nasl.util.CreateListPage` 组装。
- **条件过滤**：接收 filter，仅按**权限名称**模糊匹配（`LIKE(LcapPermission.name, filter.name)`），与查询区联动。
- **关联角色列表**：Permission LEFT_JOIN RolePerMapping LEFT_JOIN Role 后，按**权限 name** 分组得到每权限的角色列表，再与分页后的权限列表组装；返回每条权限及其 roleList。

### 实现约束（必读，避免表格数据加载异常）

- **分组与查找必须用权限 name，禁止用 id**：`perAndRoleMap` 的 key 必须为 `item.lcapPermission.name`（即 `ListGroupBy(search, item => item.lcapPermission.name)`），取角色时用 `nasl.util.MapGet(perAndRoleMap, item.lcapPermission.name)`。若用 `id` 分组/查找，当 id 为空、undefined 或类型与 Integer 不一致时，MapGet 取不到值，会导致 roleList 异常、表格「权限角色」列或操作列展示错误。
- **禁止链式调用**：不可在 `ListTransform`、`MapGet` 等返回值上再调用 `.filter()`、`.map()` 等（NASL 运行时报「不支持连续调用」）。取 roleList 时直接写 `nasl.util.ListTransform(nasl.util.MapGet(perAndRoleMap, item.lcapPermission.name), item1 => item1.lcapRole)`，不要写 `...MapGet(...).filter(...)` 或 `...ListTransform(...).filter(...)`；按 name 分组且分页条件一致时 MapGet 必有 key，无需兜底。
- **空结果（else 分支）**：与官方示例一致，写 `result = nasl.util.CreateListPage([{ permission: new app.dataSources.defaultDS.entities.LcapPermission(), roleList: [new app.dataSources.defaultDS.entities.LcapRole()] }], 0);`。禁止写 `nasl.util.NewList<...>([])` 或仅 `CreateListPage([], 0)`。
- **分页结果**：使用 `nasl.util.CreateListPage(list, total)` 返回，不要手写 `{ list, total }`。
- **WHERE 条件**：仅按 `filter.name` 筛选（`LIKE(LcapPermission.name, filter.name)`），与官方实现一致；不要求按 description 筛选。
- **返回类型**：使用匿名结构即可，`list` 每项为 `{ permission: LcapPermission, roleList: List<LcapRole> }`。

### 逻辑签名

```naturalts path="app.logics.LcapLoadPermissionManagementTableView.ts"
$Logic({
    description: '查询功能权限列表',
    directory: 'permission_center(权限中心)'
})
export declare function LcapLoadPermissionManagementTableView(filter: app.dataSources.defaultDS.entities.LcapPermission, page: Integer, size: Integer): { list: List<{ permission: app.dataSources.defaultDS.entities.LcapPermission, roleList: List<app.dataSources.defaultDS.entities.LcapRole> }>, total: Integer };
```

### 被前端调用

- **权限管理页（permissionManagement）**：表格的 dataSource 使用本逻辑，传入 filter 与当前分页，展示权限列表及权限角色、操作列。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-权限**：[权限中心-实体-权限（LcapPermission）](plan/data-model/entity-LcapPermission.md)
- **数据建模-实体-角色**：[权限中心-实体-角色（LcapRole）](plan/data-model/entity-LcapRole.md)
- **数据建模-实体-角色与权限映射**：[权限中心-实体-角色与权限映射（LcapRolePerMapping）](plan/data-model/entity-LcapRolePerMapping.md)

<!-- PENDING -->
