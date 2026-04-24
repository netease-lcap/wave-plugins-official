# 权限中心-更新部门（LcapUpdateDepartment）

## 更新部门（LcapUpdateDepartment）

### 功能概述

该服务端逻辑用于部门管理页编辑部门时更新部门信息，并在部门标识（deptId）或父部门变更时级联更新子部门及用户-部门映射，保证组织架构数据一致性。接收当前部门实体、原 deptId、原 parentDeptId，执行更新及必要的级联处理。

### 功能要点

- **防止循环引用**：若将父部门设为当前部门的子部门则形成循环，逻辑内需将 parentDeptId 回退或校验并拒绝。
- **级联更新子部门**：若 deptId 变更，需更新所有直接/间接子部门的 parentDeptId 为新的 deptId。
- **级联更新用户-部门映射**：同一批子部门下的用户-部门映射中的 deptId 需同步更新。
- **事务性**：更新与级联应在同一事务中完成，保证原子性。

### 逻辑签名

```naturalts path="app.logics.LcapUpdateDepartment.ts"
$Logic({
    description: '编辑部门，处理部门标识或父部门变更时的级联更新',
    directory: 'permission_center(权限中心)'
})
export declare function LcapUpdateDepartment(department: app.dataSources.defaultDS.entities.LcapDepartment, oldDeptId: String, oldParentDeptId: String);
```

### 被前端调用

- **部门管理页（departmentManagement）**：编辑部门提交时调用，传入 inputDept 与 selectDept.deptId、selectDept.parentDeptId；成功后更新 selectDept、刷新树与用户表格。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)
- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)

<!-- PENDING -->
