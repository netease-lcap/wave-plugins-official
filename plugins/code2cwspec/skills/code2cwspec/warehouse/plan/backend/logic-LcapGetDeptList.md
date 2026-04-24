# 权限中心-获取部门列表（LcapGetDeptList）

## 获取部门列表（LcapGetDeptList）

### 功能概述

该服务端逻辑用于获取系统中所有部门列表，返回包装为 `List<{ lcapDepartment: LcapDepartment }>` 的结构，按创建时间与ID排序。部门管理页用于树形结构数据源、根部门识别、上级部门选择器、添加用户/设置主管等场景的部门下拉或树数据。

### 功能要点

- **全量部门**：查询部门实体，返回所有部门记录，不做分页，适用于树形展示与下拉选择。
- **排序**：按 createdTime、id 升序，保证树形展示顺序稳定。
- **根部门识别**：前端可通过 parentDeptId 不在列表 deptId 集合中或为空来识别根部门（如 selectDept 初始化）。

### 逻辑签名

```naturalts path="app.logics.LcapGetDeptList.ts"
$Logic({
    description: '获取所有部门列表',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetDeptList(): List<{ lcapDepartment: app.dataSources.defaultDS.entities.LcapDepartment }>;
```

### 被前端调用

- **部门管理页（departmentManagement）**：deptInit、treeLoad、getDeptIdAndNameList、parentDepts、userDept、editUser、addUser 前的部门列表等，均依赖本逻辑。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
