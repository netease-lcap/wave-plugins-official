# 权限中心-获取权限名称列表（LcapGetPermissionNameList）

## 获取权限名称列表（LcapGetPermissionNameList）

### 功能概述

该服务端逻辑用于在权限创建和编辑过程中获取现有权限名称列表，配合前端表单验证实现权限名称的唯一性校验。通过按名称模糊匹配查询权限实体，并返回去重后的权限名称集合，前端可基于该集合使用 `nasl.validation.unique` 进行校验，避免重复权限名称的出现。

### 功能要点

- **全量名称 + 编辑兼容**：查询全量权限名并转小写；若传入 `permissionName` 且已在列表中则加入原值，再配合前端 `unique` 校验。
- **结果去重与清洗**：对查询结果中的权限名称进行去重和清洗，确保返回的列表中不存在空值或重复项。
- **编辑场景兼容**：在编辑权限时，前端会先移除当前权限的旧名称再进行唯一性校验，因此该逻辑返回的列表中允许包含当前权限名称，由前端在校验前排除。

### 逻辑签名

```naturalts path="app.logics.LcapGetPermissionNameList.ts"
$Logic({
    description: '获取现有权限名称列表，用于权限名称唯一性校验',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetPermissionNameList(permissionName: String): List<String>;
```

### 被前端调用

- **权限管理页（permissionManagement）**：在创建和编辑权限时调用 getPermissionNameList()，结合前端表单规则 `nasl.validation.unique(permissionNameList)` 实现权限名称的唯一性校验。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-权限**：[权限中心-实体-权限（LcapPermission）](plan/data-model/entity-LcapPermission.md)

<!-- PENDING -->
