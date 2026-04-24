# 权限中心-根据角色与权限关系删除映射（LcapGetMappingDeleteByRoleIdAndPermissionId）

## 根据角色与权限关系删除映射（LcapGetMappingDeleteByRoleIdAndPermissionId）

### 功能概述

该服务端逻辑用于在角色管理页面中根据指定的角色ID和权限ID删除二者之间的映射关系。通过在 `LcapRolePerMapping` 实体中定位对应记录并执行删除操作，实现从指定角色中移除某个权限，为「移除权限」操作提供后端支持。

### 功能要点

- **精确定位映射记录**：根据传入的 `roleId` 与 `permissionId` 组合查询角色与权限映射表，仅删除匹配的映射记录，避免误删其他角色或权限的关联关系。
- **兼容软删/物理删策略**：逻辑内部可根据实体设计选择软删除或物理删除方式，保证与平台统一的删除策略一致。

### 逻辑签名

```naturalts path="app.logics.LcapGetMappingDeleteByRoleIdAndPermissionId.ts"
$Logic({
    description: '根据角色ID与权限ID删除角色与权限映射关系',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetMappingDeleteByRoleIdAndPermissionId(roleId: Integer, permissionId: Integer);
```

### 被前端调用

- **角色管理页（roleManagement）**：在「移除权限」操作中调用，根据当前选中角色ID与待移除权限ID删除映射记录。前端在调用成功后，需要清空本地 `removePermission` 对象并刷新权限表格，以反映最新权限配置。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-角色与权限映射**：[权限中心-实体-角色与权限映射（LcapRolePerMapping）](plan/data-model/entity-LcapRolePerMapping.md)

<!-- PENDING -->

