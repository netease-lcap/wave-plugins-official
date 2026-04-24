# 权限中心-加载部门设置主管选择列表（LcapLoadDeptSetLeaderSelect）

## 加载部门设置主管选择列表（LcapLoadDeptSetLeaderSelect）

### 功能概述

该服务端逻辑用于部门管理页「设置部门主管」弹窗中的可选人员列表。根据部门ID查询该部门下的成员（用户-部门映射+用户），返回 `List<{ lcapUserDeptMapping, lcapUser }>`，供前端作为主管候选列表展示与选择；可选第二参数用于扩展过滤（如占位）。

### 功能要点

- **按部门ID查询成员**：仅返回当前部门下的用户列表，确保主管只能从本部门成员中选择。
- **数据结构**：与部门成员表格一致，便于复用展示（如显示当前是否为主管）。

### 逻辑签名

```naturalts path="app.logics.LcapLoadDeptSetLeaderSelect.ts"
$Logic({
    description: '部门设置主管弹窗的可选人员列表',
    directory: 'permission_center(权限中心)'
})
export declare function LcapLoadDeptSetLeaderSelect(deptId: String, filter: String): List<{ lcapUserDeptMapping: app.dataSources.defaultDS.entities.LcapUserDeptMapping, lcapUser: app.dataSources.defaultDS.entities.LcapUser }>;
```

### 被前端调用

- **部门管理页（departmentManagement）**：打开设置部门主管弹窗时调用 setLeaderSelect()，将结果赋给 setLeaders，作为主管选择器数据源。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)
- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->
