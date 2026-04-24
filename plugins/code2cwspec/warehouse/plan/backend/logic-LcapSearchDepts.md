# 权限中心-部门名称搜索（LcapSearchDepts）

## 部门名称搜索（LcapSearchDepts）

### 功能概述

该服务端逻辑用于按部门名称模糊搜索部门列表，返回 `{ list: List<LcapDepartment>, total: Integer }`。部门管理页顶部搜索框有值时调用，与 LcapSearchDeptUsers 一起构成「部门+用户」联合搜索结果，供用户快速定位部门或用户。

### 功能要点

- **名称模糊匹配**：在 LcapDepartment 实体上按 name 进行 LIKE 模糊查询。
- **返回分页结构**：返回 list 与 total，与前端 searchDeptList 赋值及展示一致。

### 逻辑签名

```naturalts path="app.logics.LcapSearchDepts.ts"
$Logic({
    description: '部门名称搜索',
    directory: 'permission_center(权限中心)'
})
export declare function LcapSearchDepts(name: String): { list: List<app.dataSources.defaultDS.entities.LcapDepartment>, total: Integer };
```

### 被前端调用

- **部门管理页（departmentManagement）**：searchDeptUser() 中当 search 有值时，将结果赋给 searchDeptList，在搜索结果区域展示部门列表，点击后调用 LcapGetDept 更新 selectDept。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
