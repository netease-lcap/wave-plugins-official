# 权限中心-加载用户角色映射表格视图数据（LcapLoadUserRoleMappingTableView）

## 加载用户角色映射表格视图数据（LcapLoadUserRoleMappingTableView）

### 功能概述

该服务端逻辑用于为角色管理页面中的「人员管理」Tab 提供表格视图数据。通过按角色ID查询用户与角色映射实体 `LcapUserRoleMapping` 及关联的角色实体 `LcapRole`，返回包含角色成员列表和总记录数的分页数据结构，支持前端按当前选中角色展示其已关联的用户信息。

### 功能要点

- **按角色过滤**：根据传入的过滤条件中的 `roleId` 字段，仅查询指定角色下的用户角色映射记录，确保表格中展示的都是当前选中角色的成员。
- **分页与排序支持**：支持常规的分页查询和排序参数（`page`、`size`、`sort`、`order`），保证在角色成员较多的场景下仍能高效加载和浏览。
- **结果结构标准化**：返回的数据结构为 `{ list, total }`，其中 `list` 元素为 `{ lcapUserRoleMapping, lcapRole }` 形式，既包含关联关系，又保留角色基础信息，便于前端后续扩展展示。
- **辅助前端状态维护**：前端在加载该逻辑返回结果后，会提取 `userId` 列表维护到 `alreadyAddRoleUserIdList`，用于在「添加用户」弹窗中排除已添加用户。

### 逻辑签名

```naturalts path="app.logics.LcapLoadUserRoleMappingTableView.ts"
$Logic({
    description: '为角色管理页面提供用户角色映射表格数据，按角色过滤并支持分页',
    directory: 'permission_center(权限中心)'
})
export declare function LcapLoadUserRoleMappingTableView(page: Integer, size: Integer, sort: String, order: String, filter: app.dataSources.defaultDS.entities.LcapUserRoleMapping): { list: List<{ lcapUserRoleMapping: app.dataSources.defaultDS.entities.LcapUserRoleMapping, lcapRole: app.dataSources.defaultDS.entities.LcapRole }>, total: Integer };
```

### 被前端调用

- **角色管理页（roleManagement）**：在「人员管理」Tab 中加载角色成员表格数据时调用，以当前选中角色ID作为过滤条件，展示该角色下已关联的所有用户。前端在每次切换选中角色或执行添加/移除成员操作后，会重新调用该逻辑刷新表格数据。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户与角色映射**：[权限中心-实体-用户与角色映射（LcapUserRoleMapping）](plan/data-model/entity-LcapUserRoleMapping.md)
- **数据建模-实体-角色**：[权限中心-实体-角色（LcapRole）](plan/data-model/entity-LcapRole.md)

<!-- PENDING -->

