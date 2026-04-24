# 权限中心-加载角色可添加用户列表（LcapLoadAddRoleUserTableView）

## 加载角色可添加用户列表（LcapLoadAddRoleUserTableView）

### 功能概述

该服务端逻辑用于角色管理页「为角色添加成员」弹窗：入参 `userIds` 在函数体内会按当前 `roleId` 重新赋值为已在该角色下的用户 ID 列表，再查询不在此列表中的用户，返回 `List<{ lcapUser }>`。

### 功能要点

- **入参 userIds 会被重写**：先查出该 `roleId` 下已有映射的 `userId`，再用于 `NOT IN` 过滤候选用户。
- **返回列表**：`List<{ lcapUser: app.dataSources.defaultDS.entities.LcapUser }>`，供弹窗列表展示。

### 逻辑签名

```naturalts path="app.logics.LcapLoadAddRoleUserTableView.ts"
$Logic({
    description: '为角色管理页面的“添加用户”弹窗提供候选用户列表数据',
    directory: 'permission_center(权限中心)'
})
export declare function LcapLoadAddRoleUserTableView(userIds: List<String>, roleId: Integer): List<{ lcapUser: app.dataSources.defaultDS.entities.LcapUser }>;
```

### 被前端调用

- **角色管理页（roleManagement）**：在点击「添加用户」按钮打开弹窗时调用，根据当前角色和已添加用户ID列表加载可选用户集合，用于在弹窗中展示可以添加到该角色的用户列表。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->

