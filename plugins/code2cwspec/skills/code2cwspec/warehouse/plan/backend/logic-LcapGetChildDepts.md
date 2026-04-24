# 权限中心-获取子部门列表（LcapGetChildDepts）

## 获取子部门列表（LcapGetChildDepts）

### 功能概述

该服务端逻辑根据父部门 `deptId` 查询直接子部门，返回 `{ list, total }`。

### 功能要点

- **按父部门查询**：在 `LcapDepartment` 中按 `parentDeptId == deptId` 筛选直接子部门。
- **返回结构**：`{ list: List<LcapDepartment>, total: Integer }`。

### 逻辑签名

```naturalts path="app.logics.LcapGetChildDepts.ts"
$Logic({
    description: '根据父部门ID查询直接子部门列表',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetChildDepts(deptId: String): { list: List<app.dataSources.defaultDS.entities.LcapDepartment>, total: Integer };
```

### 被前端调用

- **部门管理页（departmentManagement）**：getDeptIdAndNameList 中根据当前操作上下文（根部门或当前部门父级）获取同级部门列表；树形组件展开时获取子部门列表。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
