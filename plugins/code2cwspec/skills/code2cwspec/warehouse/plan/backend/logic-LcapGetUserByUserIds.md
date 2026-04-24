# 权限中心-根据用户ID列表获取用户信息（LcapGetUserByUserIds）

## 根据用户ID列表获取用户信息（LcapGetUserByUserIds）

### 功能概述

该服务端逻辑用于在角色管理页面中，根据一组用户ID批量查询对应的用户详细信息，常用于「添加用户」场景下在选择完成后拉取完整的用户数据。通过一次性查询用户实体 `LcapUser`，返回包含用户名、用户来源等关键字段的结果列表，便于后续批量创建用户角色映射记录。

### 功能要点

- **批量查询支持**：接收 `userIds: List<String>`，使用 `IN` 条件在用户实体中进行批量查询，避免循环单条查询带来的性能问题。
- **返回完整用户信息**：返回的结果应包含用户的唯一标识、用户名、用户来源等关键字段，为前端在创建映射时写入 `userId`、`userName`、`source` 等字段提供数据基础。
- **顺序与去重处理**：对输入ID列表进行去重后再查询，必要时可按照输入顺序或指定字段排序返回，确保结果集可预测且稳定。

### 逻辑签名

```naturalts path="app.logics.LcapGetUserByUserIds.ts"
$Logic({
    description: '根据一组用户ID批量获取用户详细信息',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetUserByUserIds(userIds: List<String>): List<app.dataSources.defaultDS.entities.LcapUser>;
```

### 被前端调用

- **角色管理页（roleManagement）**：在「添加用户」场景下，前端从弹窗中选择若干用户ID后调用该逻辑，获取完整的用户实体信息，并基于返回结果批量创建 `LcapUserRoleMapping` 记录。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->

