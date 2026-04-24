# 权限中心-获取未关联的权限资源列表（LcapGetPermissionResourseNotRelated）

## 获取未关联的权限资源列表（LcapGetPermissionResourseNotRelated）

### 功能概述

该服务端逻辑用于权限管理页「新增/编辑权限」弹窗中「添加资源」一侧的候选列表。根据可选参数（如权限ID）查询尚未与该权限关联的资源，返回前端 Transfer 组件所需的 `List<LcapPermissionAndResource>`（含 text、value 等字段），便于用户将未关联资源添加到当前权限。

### 功能要点

- **未关联资源**：查询资源实体并排除已与指定权限（或全部权限）关联的资源，得到可添加的候选列表；返回全部符合条件的未关联资源，不做分页或条数限制。
- **数据结构**：返回结构体列表，包含展示用文本（text）与资源ID（value），与 LcapPermissionAndResource 等结构一致。
- **创建场景**：新增权限时 permissionId 可传空或 0，表示查询所有资源或全局未关联资源；编辑时传入 permissionId 可排除当前权限已关联资源。

### 逻辑签名

```naturalts path="app.logics.LcapGetPermissionResourseNotRelated.ts"
$Logic({
    description: '获取未与权限关联的资源列表，用于权限表单中添加资源',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetPermissionResourseNotRelated(permissionId: Integer): List<app.structures.LcapPermissionAndResource>;
```

### 被前端调用

- **权限管理页（permissionManagement）**：打开新增或编辑权限弹窗时，将返回结果赋给 notAddResouces，作为 Transfer 左侧「添加资源」数据源。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-权限**：[权限中心-实体-权限（LcapPermission）](plan/data-model/entity-LcapPermission.md)
- **数据建模-实体-权限与资源映射**：[权限中心-实体-权限与资源映射（LcapPerResMapping）](plan/data-model/entity-LcapPerResMapping.md)
- **数据结构-LcapPermissionAndResource**：含 text、value 等字段的权限资源展示结构

<!-- PENDING -->
