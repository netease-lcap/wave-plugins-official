# 权限中心-获取角色名称列表（LcapGetRoleNameList）

## 获取角色名称列表（LcapGetRoleNameList）

### 功能概述

该服务端逻辑用于角色名称唯一性校验：查询全部 `LcapRole.name` 并去重返回；前端配合 `nasl.validation.unique` 与编辑时的 `Remove` 使用。

### 功能要点

- **全量**：从 `LcapRole` 实体查询全部记录，仅映射 `name` 字段。
- **去重**：`nasl.util.ListDistinct` 后返回。

### 逻辑签名

```naturalts path="app.logics.LcapGetRoleNameList.ts"
$Logic({
    description: '获取所有的角色名称',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetRoleNameList(): List<String>;
```

### 被前端调用

- **角色管理页（roleManagement）**：在创建和编辑角色时调用，用于获取当前系统中已存在的角色名称列表，结合前端表单规则 `nasl.validation.unique(roleNameList)` 实现角色名称的唯一性校验，避免重复创建同名角色。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-角色**：[权限中心-实体-角色（LcapRole）](plan/data-model/entity-LcapRole.md)

<!-- PENDING -->
