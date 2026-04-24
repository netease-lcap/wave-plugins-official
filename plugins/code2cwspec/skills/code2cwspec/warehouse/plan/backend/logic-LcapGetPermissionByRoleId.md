# 权限中心-根据角色ID获取权限（LcapGetPermissionByRoleId）

## 根据角色ID获取权限（LcapGetPermissionByRoleId）

### 功能概述

该服务端逻辑根据角色主键 `roleId` 查询角色与权限映射，再按 `page`、`size` 对权限实体列表分页，返回 `{ list, total }`。

### 功能要点

- **映射到权限实体**：先查 `LcapRolePerMapping` 得到该角色的 `permissionId` 列表，再查 `LcapPermission` 得到权限实体列表。
- **分页**：对权限列表使用 `PAGINATE`（或等价分页），返回 `list: List<LcapPermission>` 与 `total`。
- **空角色或无映射**：返回空列表且 `total` 为 0。

### 逻辑签名

```naturalts path="app.logics.LcapGetPermissionByRoleId.ts"
$Logic({
    description: '根据指定的角色ID查询并返回该角色所拥有的所有权限信息，包括权限的基本信息和关联的资源信息',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetPermissionByRoleId(roleId: Integer, page: Integer, size: Integer): { list: List<app.dataSources.defaultDS.entities.LcapPermission>, total: Integer };
```

### 被前端调用

- **角色管理页（roleManagement）**：在角色管理页面中，当用户点击"分配权限"链接时，系统会调用此服务端逻辑获取当前角色已分配的权限信息，用于在权限分配界面中预填充已选权限，同时支持用户查看和修改角色的权限配置。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-角色**：[权限中心-实体-角色（LcapRole）](plan/data-model/entity-LcapRole.md)
- **数据建模-实体-权限**：[权限中心-实体-权限（LcapPermission）](plan/data-model/entity-LcapPermission.md)
- **数据建模-实体-角色与权限映射**：[权限中心-实体-角色与权限映射（LcapRolePerMapping）](plan/data-model/entity-LcapRolePerMapping.md)

<!-- PENDING -->