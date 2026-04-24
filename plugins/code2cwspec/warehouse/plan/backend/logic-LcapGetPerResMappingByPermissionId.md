# 权限中心-根据权限ID获取权限资源映射列表（LcapGetPerResMappingByPermissionId）

## 根据权限ID获取权限资源映射列表（LcapGetPerResMappingByPermissionId）

### 功能概述

该服务端逻辑用于根据权限ID查询该权限对应的权限-资源映射记录列表，返回包含 `lcapPerResMapping` 的列表。权限管理页在编辑权限时使用该逻辑获取旧关联的映射ID列表（permissionOldIdList），在提交时先创建新关联再批量删除这些旧映射，避免数据不一致。

### 功能要点

- **按权限ID精确查询**：在 LcapPerResMapping 实体中按 permissionId 查询所有映射记录。
- **返回映射实体**：每条记录以 `{ lcapPerResMapping }` 形式返回，前端可提取 id 组成 permissionOldIdList 用于 batchDelete。
- **编辑流程支撑**：配合 LcapGetPermissionResourceRelated、LcapPermissionEntity.update 与 LcapPerResMappingEntity.batchCreate/batchDelete，完成权限编辑时的资源关联更新。

### 逻辑签名

```naturalts path="app.logics.LcapGetPerResMappingByPermissionId.ts"
$Logic({
    description: '根据权限ID查询权限-资源映射记录列表',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetPerResMappingByPermissionId(permissionId: Integer): List<{ lcapPerResMapping: app.dataSources.defaultDS.entities.LcapPerResMapping }>;
```

### 被前端调用

- **权限管理页（permissionManagement）**：编辑权限打开弹窗时，获取 permissionOldIdList，提交时在创建新关联后批量删除这些旧映射。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-权限与资源映射**：[权限中心-实体-权限与资源映射（LcapPerResMapping）](plan/data-model/entity-LcapPerResMapping.md)

<!-- PENDING -->
