# 权限中心-加载角色可添加权限列表（LcapLoadAddRolePermissionTableView）

## 加载角色可添加权限列表（LcapLoadAddRolePermissionTableView）

### 功能概述

该服务端逻辑用于角色管理页面中「添加权限」弹窗的候选权限列表数据。逻辑会根据当前角色已绑定的权限ID列表和角色ID，过滤掉已绑定权限，仅返回可为该角色新增的权限记录，支持分页、排序与筛选，为前端弹窗权限选择表格提供数据支撑。

### 功能要点

- **排除已绑定权限**：入参 `permissionIdList` 在函数体内会按当前 `roleId` 重写为已绑定权限 ID，再用于排除查询。
- **角色上下文过滤**：结合当前角色ID，可以按业务规则限制可选权限范围，例如根据角色类型或数据权限策略决定可分配的权限集合。
- **分页与排序支持**：支持页码、每页条数以及排序字段/方向的组合查询，保证在权限数量较多时仍具备良好的查询与浏览体验。
- **数据结构标准化**：通常返回 `{ list: List<{ lcapPermission: app.dataSources.defaultDS.entities.LcapPermission }>, total: Integer }`，供前端用于渲染表格与勾选。

### 逻辑签名

```naturalts path="app.logics.LcapLoadAddRolePermissionTableView.ts"
$Logic({
    description: '为角色管理页面的“添加权限”弹窗提供候选权限列表数据',
    directory: 'permission_center(权限中心)'
})
export declare function LcapLoadAddRolePermissionTableView(page: Integer, size: Integer, sort: String, order: String, permissionIdList: List<Integer>, roleId: Integer): { list: List<{ lcapPermission: app.dataSources.defaultDS.entities.LcapPermission }>, total: Integer };
```

### 被前端调用

- **角色管理页（roleManagement）**：在点击「添加权限」按钮打开弹窗时调用，结合当前角色和已绑定权限ID列表加载可选权限集合，用于在弹窗中展示可以新增到该角色的权限列表。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-权限**：[权限中心-实体-权限（LcapPermission）](plan/data-model/entity-LcapPermission.md)

<!-- PENDING -->

