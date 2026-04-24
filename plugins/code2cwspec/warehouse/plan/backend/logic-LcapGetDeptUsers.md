# 权限中心-获取部门用户列表（LcapGetDeptUsers）

## 获取部门用户列表（LcapGetDeptUsers）

### 功能概述

该服务端逻辑用于获取指定部门下的成员列表，支持分页，返回包含用户-部门映射与用户实体的列表及总条数。部门管理页右侧「部门成员」表格使用本逻辑作为数据源，展示当前选中部门下的用户及是否部门主管等信息。

### 功能要点

- **按部门ID列表查询**：接收部门ID列表（通常为当前选中部门单元素列表），查询 LcapUserDeptMapping 并关联 LcapUser，得到该部门下的成员。
- **分页**：支持 page、size，返回 `{ list, total }`，与表格分页组件配合。
- **结果结构**：list 元素为 `{ lcapUserDeptMapping, lcapUser }`，便于展示用户名、主管标签等。

### 逻辑签名

```naturalts path="app.logics.LcapGetDeptUsers.ts"
$Logic({
    description: '获取指定部门下的成员列表，支持分页',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetDeptUsers(deptIds: List<String>, page: Integer, size: Integer): { list: List<{ lcapUserDeptMapping: app.dataSources.defaultDS.entities.LcapUserDeptMapping, lcapUser: app.dataSources.defaultDS.entities.LcapUser }>, total: Integer };
```

### 被前端调用

- **部门管理页（departmentManagement）**：userReload() 中调用，将当前选中部门ID与表格分页参数传入，刷新部门成员表格。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)
- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->
