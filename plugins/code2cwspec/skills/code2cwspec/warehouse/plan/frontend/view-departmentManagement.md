# 权限中心-部门管理页（departmentManagement）

- **生成时间**：2026-03-02
- **实现依据**：本任务会已加载部门管理页官方示例全文，**直接以该示例的 CRUD 关键流程、关键细节与示例代码为准**。

<attention>
实现时必须包含：部门 CRUD、树形展示、部门成员管理、部门/成员搜索；删除/编辑/创建、添加子部门、添加与移除用户等关键步骤均以官方示例为准，禁止省略或自行简化。
</attention>

## 部门管理页（departmentManagement）

### 功能概述

部门管理页是权限中心的核心功能模块，用于对系统组织架构中的部门进行全生命周期管理。提供部门的新增、编辑、删除与层级化列表（树形）查询，支持部门名称筛选与部门/成员搜索。表格或树展示部门名称、部门标识、父部门等，弹窗完成创建与编辑，表单含部门名称（必填）、部门标识（必填且唯一）、父部门（必填）等，并提供部门成员管理（添加/移除/调整部门、设置主管等）。

### 页面签名

```naturalts path="app.frontendTypes.pc.frontends.pc.views.permissionCenter.views.departmentManagement.tsx"
$View({
    title: "部门管理",
    crumb: "部门管理",
    auth: true,
    authDescription: "部门管理",
    isIndex: false,
})
export declare function departmentManagement();
```

无输入参数。

### 验收列表

- 系统应以树形或层级化表格展示部门列表，含部门名称、部门标识、父部门、操作列，支持按部门名称查询【服务端逻辑-获取部门表格视图（LcapGetDepartmentTableView）等】【实体-部门（LcapDepartment）】
- 系统应通过弹窗表单支持创建、编辑部门，含部门名称（必填）、部门标识（必填且唯一）、父部门（必填，以选择器选择），支持创建根部门与添加子部门【服务端逻辑-创建根部门（LcapCreateRootDept）、创建部门（LcapCreateDepartment）、更新部门（LcapUpdateDepartment）】【实体-部门（LcapDepartment）】
- 系统应支持删除部门，删除前需确认；若含子部门应阻止删除并提示，否则执行删除并刷新列表或树；编辑部门时涉及子部门级联与循环引用校验的须依赖 LcapGetDepts、LcapGetSecondParentDept【服务端逻辑-批量删除部门（LcapBatchDeleteDepartment）、获取部门及其所有子部门列表（LcapGetDepts）、获取第二级父部门（LcapGetSecondParentDept）】【实体-部门（LcapDepartment）】
- 系统应支持部门成员管理（添加用户、移除用户、调整用户部门、设置/取消部门主管），与官方示例流程一致【服务端逻辑-批量添加部门用户、批量移除部门用户、批量更新用户部门、设置部门负责人、取消部门负责人等】【实体-无】
- 系统应支持部门与成员搜索，有值时展示搜索结果，无值时恢复树形结构【服务端逻辑-部门名称搜索（LcapSearchDepts）、部门成员搜索（LcapSearchDeptUsers）】【实体-无】
- 系统应在表单提交前完成部门标识与名称唯一性等校验，操作成功后给出明确提示并刷新列表或树【服务端逻辑-获取部门列表（LcapGetDeptList）等】【实体-无】

### 依赖的服务端逻辑

- **领域服务-逻辑-获取部门表格视图**：plan/backend/logic-LcapGetDepartmentTableView.md
- **领域服务-逻辑-创建根部门**：plan/backend/logic-LcapCreateRootDept.md
- **领域服务-逻辑-批量删除部门**：plan/backend/logic-LcapBatchDeleteDepartment.md
- **领域服务-逻辑-批量添加部门用户**：plan/backend/logic-LcapBatchAddDeptUser.md
- **领域服务-逻辑-设置部门负责人**：plan/backend/logic-LcapSetDeptLeader.md
- **领域服务-逻辑-获取部门列表**：plan/backend/logic-LcapGetDeptList.md
- **领域服务-逻辑-根据部门标识获取部门**：plan/backend/logic-LcapGetDept.md
- **领域服务-逻辑-获取部门用户列表**：plan/backend/logic-LcapGetDeptUsers.md
- **领域服务-逻辑-获取子部门列表**：plan/backend/logic-LcapGetChildDepts.md
- **领域服务-逻辑-获取部门及其所有子部门列表**：plan/backend/logic-LcapGetDepts.md
- **领域服务-逻辑-获取第二级父部门**：plan/backend/logic-LcapGetSecondParentDept.md
- **领域服务-逻辑-部门名称搜索**：plan/backend/logic-LcapSearchDepts.md
- **领域服务-逻辑-部门成员搜索**：plan/backend/logic-LcapSearchDeptUsers.md
- **领域服务-逻辑-创建部门**：plan/backend/logic-LcapCreateDepartment.md
- **领域服务-逻辑-更新部门**：plan/backend/logic-LcapUpdateDepartment.md
- **领域服务-逻辑-加载部门设置主管选择列表**：plan/backend/logic-LcapLoadDeptSetLeaderSelect.md
- **领域服务-逻辑-加载部门添加用户选择列表**：plan/backend/logic-LcapLoadDeptAddUserSelect.md
- **领域服务-逻辑-批量移除部门用户**：plan/backend/logic-LcapBatchRemoveDeptUser.md
- **领域服务-逻辑-取消部门负责人**：plan/backend/logic-LcapCancelDeptLeader.md
- **领域服务-逻辑-批量更新用户部门**：plan/backend/logic-LcapBatchUpdateDeptUser.md

### 特殊组件

无特殊组件。

<!-- PENDING -->
