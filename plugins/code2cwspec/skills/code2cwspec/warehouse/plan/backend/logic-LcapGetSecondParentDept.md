# 权限中心-获取第二级父部门（LcapGetSecondParentDept）

## 获取第二级父部门（LcapGetSecondParentDept）

### 功能概述

该服务端逻辑从给定部门（deptId）向上递归查找，返回「父部门为 oldDeptId」的那一级部门实体。部门管理页在编辑部门（变更父部门或 deptId）时，用于打破循环引用并正确级联更新子部门与用户-部门映射。

### 功能要点

- **递归向上查找**：根据 deptId 查部门，若当前部门的 parentDeptId 不等于 oldDeptId，则对 parentDeptId 递归调用本逻辑，直至找到 parentDeptId === oldDeptId 的部门并返回。
- **与 LcapGetDepts 配合**：编辑部门级联逻辑中与 LcapGetDepts、LcapUpdateDepartment 等配合使用，详见 KE04 官方示例。

### 逻辑签名

```naturalts path="app.logics.LcapGetSecondParentDept.ts"
$Logic({
    description: '递归获取旧部门开始的第二级父部门',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetSecondParentDept(deptId: String, oldDeptId: String): app.dataSources.defaultDS.entities.LcapDepartment;
```

### 被前端调用

- **部门管理页（departmentManagement）**：编辑部门提交时，由后端 LcapUpdateDepartment 等逻辑内部调用，用于计算级联更新后的父部门；前端不直接调用，但为部门管理核心依赖逻辑，需纳入任务规划与领域服务。详见 nasl-book/KE04-example-permission--auth-and-rbac.md。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
