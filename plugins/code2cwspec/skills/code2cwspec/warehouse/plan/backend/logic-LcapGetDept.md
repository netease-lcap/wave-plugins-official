# 权限中心-根据部门标识获取部门（LcapGetDept）

## 根据部门标识获取部门（LcapGetDept）

### 功能概述

该服务端逻辑用于根据部门标识（deptId）查询单条部门完整信息，返回部门实体。部门管理页在删除部门后重新选择部门、树节点点击、搜索结果点击部门时，需根据 deptId 获取完整部门对象以更新 selectDept。

### 功能要点

- **按 deptId 精确查询**：在 LcapDepartment 实体中按 deptId 查询唯一部门记录。
- **返回完整实体**：返回单个 LcapDepartment，包含 id、deptId、name、parentDeptId 等字段，供前端更新 selectDept 与 selectDeptIdTemp。

### 逻辑签名

```naturalts path="app.logics.LcapGetDept.ts"
$Logic({
    description: '根据部门标识获取部门完整信息',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetDept(deptId: String): app.dataSources.defaultDS.entities.LcapDepartment;
```

### 被前端调用

- **部门管理页（departmentManagement）**：删除部门后根据 deleteParentId 重新选择部门；树节点或搜索结果点击部门时，根据选中 deptId 获取部门并刷新用户表格。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
