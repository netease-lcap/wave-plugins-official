# 权限中心-获取权限已关联资源列表（LcapGetPermissionResourceRelated）

## 获取权限已关联资源列表（LcapGetPermissionResourceRelated）

### 功能概述

该服务端逻辑用于根据权限ID查询该权限已关联的资源列表，返回结构为 `List<LcapPermissionAndResource>`（含 text、value），供权限管理页编辑权限弹窗中「选中资源」一侧展示及回显已选资源。

### 功能要点

- **按权限ID查询**：根据 permissionId 查询 LcapPerResMapping 及关联资源，组装为前端可用的 text/value 列表。
- **编辑回显**：编辑权限时前端将返回结果转换为资源ID列表（addResouces），用于 Transfer 右侧与提交时创建/更新关联。

### 逻辑签名

```naturalts path="app.logics.LcapGetPermissionResourceRelated.ts"
$Logic({
    description: '根据权限ID查询已关联的资源列表',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetPermissionResourceRelated(permissionId: Integer): List<app.structures.LcapPermissionAndResource>;
```

### 被前端调用

- **权限管理页（permissionManagement）**：编辑权限时，将当前权限已关联资源加载到 addResouces，并用于删除旧关联时获取 permissionOldIdList 的辅助数据。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-权限与资源映射**：[权限中心-实体-权限与资源映射（LcapPerResMapping）](plan/data-model/entity-LcapPerResMapping.md)
- **数据结构-LcapPermissionAndResource**：含 text、value 等字段

<!-- PENDING -->
