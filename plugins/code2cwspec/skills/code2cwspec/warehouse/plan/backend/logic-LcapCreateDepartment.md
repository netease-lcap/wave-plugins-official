# 权限中心-创建部门（LcapCreateDepartment）

## 创建部门（LcapCreateDepartment）

### 功能概述

该服务端逻辑用于在部门管理页中创建新部门（含根部门下的新部门、子部门等）。接收部门实体（含 name、deptId、parentDeptId 等），若 id 为空则执行创建并返回创建后的部门实体，用于刷新树、更新 selectDept 及后续编辑/删除流程。

### 功能要点

- **创建单条部门**：调用 LcapDepartmentEntity.create，生成 id 及审计字段。
- **必填与唯一性**：部门名称、部门标识、父部门标识由前端校验（含 getDeptIdAndNameList 唯一性）；服务端可做二次校验。
- **返回完整实体**：返回创建后的 LcapDepartment，前端用于 selectDept、selectDeptIdTemp 及 treeLoad、userReload。

### 逻辑签名

```naturalts path="app.logics.LcapCreateDepartment.ts"
$Logic({
    description: '创建部门',
    directory: 'permission_center(权限中心)'
})
export declare function LcapCreateDepartment(department: app.dataSources.defaultDS.entities.LcapDepartment): app.dataSources.defaultDS.entities.LcapDepartment;
```

### 被前端调用

- **部门管理页（departmentManagement）**：提交创建部门或添加子部门表单时调用，根据 isUpdateDept 区分；创建后更新 selectDept、刷新树与用户表格。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
