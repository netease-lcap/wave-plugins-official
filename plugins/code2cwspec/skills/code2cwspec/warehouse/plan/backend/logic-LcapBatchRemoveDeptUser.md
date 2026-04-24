# 权限中心-批量移除部门用户（LcapBatchRemoveDeptUser）

## 批量移除部门用户（LcapBatchRemoveDeptUser）

### 功能概述

该服务端逻辑用于从指定部门中批量移除用户。移除时将这些用户从当前部门的映射中删除，并可根据业务策略将其归入根部门（避免用户无部门）。返回操作结果信息（如成功无提示或错误信息字符串），供前端提示与刷新部门成员表格。

### 功能要点

- **按部门与用户ID批量删除映射**：在 LcapUserDeptMapping 中删除 (deptId, userId) 匹配的记录。
- **归入根部门**：若业务要求用户至少归属一个部门，则移除后可为用户创建或更新为根部门映射。
- **返回值**：成功可返回空或固定码；失败返回错误信息（如「本部门所选用户已不存在」），前端据此提示并关闭确认框。

### 逻辑签名

```naturalts path="app.logics.LcapBatchRemoveDeptUser.ts"
$Logic({
    description: '批量从部门移除成员，移除后可按策略归入根部门',
    directory: 'permission_center(权限中心)'
})
export declare function LcapBatchRemoveDeptUser(userIds: List<String>, deptId: String): String;
```

### 被前端调用

- **部门管理页（departmentManagement）**：移除部门用户确认后调用，传入 userIds 与 selectDept.deptId；根据返回信息提示并执行 userReload()。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)
- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
