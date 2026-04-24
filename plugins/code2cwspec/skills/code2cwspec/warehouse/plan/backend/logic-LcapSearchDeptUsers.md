# 权限中心-部门成员搜索（LcapSearchDeptUsers）

## 部门成员搜索（LcapSearchDeptUsers）

### 功能概述

该服务端逻辑用于按用户名（或姓名）模糊搜索部门成员，返回包含用户-部门映射与用户实体的列表及总数。部门管理页顶部搜索框有值时与 LcapSearchDepts 一起使用，在搜索结果中展示匹配的用户，点击用户可打开编辑用户/调整部门等操作。

### 功能要点

- **用户名模糊匹配**：通过 LcapUserDeptMapping 关联 LcapUser，按 userName（或 displayName）LIKE 查询。
- **去重**：同一用户可能有多条部门映射时，按用户维度去重，返回 `{ list, total }`。
- **结果结构**：list 元素为 `{ lcapUserDeptMapping, lcapUser }`，便于展示与后续操作。

### 逻辑签名

```naturalts path="app.logics.LcapSearchDeptUsers.ts"
$Logic({
    description: '部门成员搜索',
    directory: 'permission_center(权限中心)'
})
export declare function LcapSearchDeptUsers(name: String): { list: List<{ lcapUserDeptMapping: app.dataSources.defaultDS.entities.LcapUserDeptMapping, lcapUser: app.dataSources.defaultDS.entities.LcapUser }>, total: Integer };
```

### 被前端调用

- **部门管理页（departmentManagement）**：searchDeptUser() 中当 search 有值时，将结果赋给 searchUserList，在搜索结果区域展示用户列表，点击用户可打开编辑/调整部门弹窗。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)
- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->
