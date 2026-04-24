# 权限中心-获取用户名列表（LcapGetUserNameList）

## 获取用户名列表（LcapGetUserNameList）

### 功能概述

该服务端逻辑用于在用户创建和编辑过程中获取现有用户名列表，配合前端表单验证实现用户名的唯一性校验。实现上查询全部用户名称、转小写后，若传入 userName 且已在列表中则加入原值（编辑场景），再去重返回；前端可基于该集合使用 `nasl.validation.unique` 进行校验。

### 功能要点

- **全量用户名 + 转小写**：查询 `LcapUser` 实体获取全部用户名字段，统一转为小写便于比对。
- **编辑场景兼容**：若传入 userName 且其小写已存在于列表中，则将该 userName 原值加入列表，便于前端在编辑时排除当前用户后再做唯一性校验。
- **去重返回**：对结果做 `ListDistinct`，确保返回列表无重复，供前端直接用于 `nasl.validation.unique(userNameList)`。

### 逻辑签名

```naturalts path="app.logics.LcapGetUserNameList.ts"
$Logic({
    description: '获取现有用户名列表，用于用户名唯一性校验',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetUserNameList(userName: String): List<String>;
```

### 被前端调用

- **用户管理页（userManagement）**：在创建和编辑用户时调用，用于获取当前系统中已存在的用户名列表，结合前端表单规则 `nasl.validation.unique(userNameList)` 实现用户名的唯一性校验，避免重复创建同名用户。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->
