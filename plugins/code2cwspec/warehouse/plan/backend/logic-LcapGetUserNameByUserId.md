# 权限中心-根据用户ID获取用户名（LcapGetUserNameByUserId）

## 根据用户ID获取用户名（LcapGetUserNameByUserId）

### 功能概述

该服务端逻辑用于根据用户ID查询对应用户的用户名（userName），常用于用户管理页表格中展示「直属主管」姓名、列表中的关联用户显示名等场景。通过查询用户实体 `LcapUser` 按 userId 精确匹配并返回用户名，若不存在则返回空字符串。

### 功能要点

- **按用户ID精确查询**：根据传入的 `userId` 在用户表中查询唯一用户，仅返回用户名字段，轻量高效。
- **空值安全**：当 userId 为空或未查到记录时返回空字符串，前端可直接用于展示而不必再判空。
- **辅助展示**：与 LcapGetUserTableView 等逻辑配合，在列表行中展示直属主管姓名（deptUser）等关联信息。

### 逻辑签名

```naturalts path="app.logics.LcapGetUserNameByUserId.ts"
$Logic({
    description: '根据用户ID查询用户名',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetUserNameByUserId(userId: String): String;
```

### 被前端调用

- **用户管理页（userManagement）**：在用户列表表格中展示直属主管姓名时使用；在编辑用户时检查主管是否存在，不存在则清空 `directLeaderId`。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->
