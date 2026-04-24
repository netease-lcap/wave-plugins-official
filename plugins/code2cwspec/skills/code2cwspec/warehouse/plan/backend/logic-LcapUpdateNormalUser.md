# 权限中心-更新普通用户（LcapUpdateNormalUser）

## 更新普通用户（LcapUpdateNormalUser）

### 功能概述

该服务端逻辑用于更新系统中普通用户的基本信息或登录密码，支持两种调用场景：**编辑基本信息**（手机号、邮箱、昵称、用户状态、直属主管等）与**修改密码**（独立对话框）。该逻辑支持权限中心的用户管理功能，确保用户信息的准确性和完整性；修改密码时须使用 `nasl.auth.encryptPassword` 加密后写入，不允许明文落库。

### 功能要点

- **双场景区分**：通过第二参数 `isUpdate` 区分。`isUpdate === true` 时仅更新基本信息（手机号、邮箱、昵称、用户状态、直属主管等），不更新密码；`isUpdate === false` 且密码长度在 8–12 位时仅更新密码（先加密再更新），否则仅更新基本信息。不允许修改用户名和用户ID等关键标识字段。
- **用户信息更新**：更新操作可记录操作人和更新时间；对手机号、邮箱等可做格式校验；支持用户状态切换（正常/禁用）。

### 逻辑签名

```naturalts path="app.logics.LcapUpdateNormalUser.ts"
$Logic({
    description: '修改普通用户信息（基本信息或密码）',
    directory: 'permission_center(权限中心)',
})
export declare function LcapUpdateNormalUser(user: app.dataSources.defaultDS.entities.LcapUser, isUpdate: Boolean): Boolean;
```

### 被前端调用

- **用户管理页（userManagement）**：
  - **编辑**：管理员点击「编辑」并提交编辑表单时，调用 `LcapUpdateNormalUser(inputCopy, true)`，仅更新基本信息。
  - **修改密码**：在独立对话框中填写新密码并确认后，调用 `LcapUpdateNormalUser(input, false)`，仅更新密码（入参中 `user.password` 为新密码明文，长度须 8–12 位）。

### 依赖的枚举、实体、数据结构

- **数据建模-枚举-用户状态**：[数据建模-枚举](plan/data-model/enums.md)
- **数据建模-枚举-用户来源**：[数据建模-枚举](plan/data-model/enums.md)
- **数据建模-实体-用户**：[数据建模-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->