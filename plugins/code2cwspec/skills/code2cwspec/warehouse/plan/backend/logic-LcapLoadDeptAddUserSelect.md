# 权限中心-加载部门添加用户选择列表（LcapLoadDeptAddUserSelect）

## 加载部门添加用户选择列表（LcapLoadDeptAddUserSelect）

### 功能概述

该服务端逻辑用于部门管理页「添加用户」弹窗的候选用户列表，支持分页。根据部门ID查询尚未加入该部门的用户（或排除已在该部门的用户），返回 `{ list: List<{ lcapUser }>, total }`，供前端作为可选用户表格或选择器数据源。

### 功能要点

- **排除已添加用户**：查询用户时排除已在指定部门下的用户，避免重复添加。
- **分页**：支持 page、size，适用于用户量较大的系统。
- **第二参数**：可为占位或扩展过滤条件（如关键字）。

### 逻辑签名

```naturalts path="app.logics.LcapLoadDeptAddUserSelect.ts"
$Logic({
    description: '部门添加用户弹窗的候选用户列表，支持分页',
    directory: 'permission_center(权限中心)'
})
export declare function LcapLoadDeptAddUserSelect(page: Integer, size: Integer, deptId: String, search: String): { list: List<{ lcapUser: app.dataSources.defaultDS.entities.LcapUser }>, total: Integer };
```

### 被前端调用

- **部门管理页（departmentManagement）**：打开添加用户弹窗时调用 addUser()，将返回结果赋给 addUsers，作为可选用户列表数据源。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)
- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)

<!-- PENDING -->
