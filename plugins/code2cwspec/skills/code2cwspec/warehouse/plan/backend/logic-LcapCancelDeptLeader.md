# 权限中心-取消部门负责人（LcapCancelDeptLeader）

## 取消部门负责人（LcapCancelDeptLeader）

### 功能概述

该服务端逻辑用于取消指定部门的当前负责人。根据部门ID与用户ID，将该用户在用户-部门映射中的 isDeptLeader 置为 0（非负责人），与 LcapSetDeptLeader 配合完成「设置/取消」部门主管的完整流程。

### 功能要点

- **精确定位**：按 deptId 与 userId 唯一确定一条用户-部门映射，仅更新该条的 isDeptLeader。
- **与设置主管对称**：设置主管时会将原主管取消；取消主管时仅更新指定用户，不涉及其他人。

### 逻辑签名

```naturalts path="app.logics.LcapCancelDeptLeader.ts"
$Logic({
    description: '取消指定部门的负责人',
    directory: 'permission_center(权限中心)'
})
export declare function LcapCancelDeptLeader(deptId: String, userId: String);
```

### 被前端调用

- **部门管理页（departmentManagement）**：在设置部门主管确认弹窗中，用户选择「取消主管」时调用，传入 selectDept.deptId 与 currentUser.userId，成功后 userReload()。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)

<!-- PENDING -->
