# 权限中心-批量更新用户部门（LcapBatchUpdateDeptUser）

## 批量更新用户部门（LcapBatchUpdateDeptUser）

### 功能概述

该服务端逻辑用于将一批用户从原部门调整到目标部门。接收用户ID列表、目标部门ID（deptId）及源部门ID（当前选中部门 oldDeptId），将这些用户在用户-部门映射中的记录从源部门更新为目标部门；若用户仅能属于一个部门则先删后增或直接更新。返回操作结果信息（如错误提示字符串），供前端提示与刷新部门成员表格。

### 功能要点

- **批量调整**：`userIds` 在 `oldDeptId` 下的映射更新为 `deptId`，或按示例删除重复映射。
- **单部门约束**：若业务规定用户只能属于一个部门，需先删除该用户其他部门映射再更新或仅保留一条映射。
- **返回值**：成功可返回空或固定码；失败返回错误信息，前端据此提示。

### 逻辑签名

```naturalts path="app.logics.LcapBatchUpdateDeptUser.ts"
$Logic({
    description: '将一批用户从源部门调整到目标部门',
    directory: 'permission_center(权限中心)'
})
export declare function LcapBatchUpdateDeptUser(userIds: List<String>, deptId: String, oldDeptId: String): String;
```

### 被前端调用

- **部门管理页（departmentManagement）**：调整部门确认后调用，传入勾选用户ID列表或单用户ID、目标部门ID、当前部门ID；根据返回信息提示并执行 userReload()。搜索用户点击后调整部门也使用本逻辑（单用户）。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)
- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
