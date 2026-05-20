# 权限中心-角色管理页（roleManagement）

- **生成时间**：2026-03-02
- **实现依据**：本任务会已加载角色管理页官方示例全文，**直接以该示例的 CRUD 关键流程、关键细节与示例代码为准**。

<attention>
实现时必须包含：角色 CRUD、角色权限分配、角色成员管理；布局与 Logic 使用方式须与官方示例一致（左侧角色列表 + 右侧详情 Tab），禁止用 FROM/PAGINATE 替代示例中的 Logic。
</attention>

## 角色管理页（roleManagement）

### 功能概述

角色管理页是权限中心的核心功能模块，用于管理系统中角色的全生命周期。提供角色的增删改查、按角色名称筛选、为角色分配权限及管理角色成员。布局为左侧角色列表与右侧详情（人员管理 | 功能权限），表格展示角色名称、角色编码、描述等，弹窗完成新增与编辑，权限分配通过示例中的树形选择等方式实现。

### 页面签名

```naturalts path="app.frontendTypes.pc.frontends.pc.views.permissionCenter.views.roleManagement.tsx"
$View({
    title: "角色管理",
    crumb: "角色管理",
    auth: true,
    authDescription: "角色管理",
    isIndex: true,
})
export declare function roleManagement();
```

无输入参数。

### 验收列表

- 系统应以表格展示角色列表，含角色名称、角色编码、描述、操作列，支持按角色名称筛选与分页【服务端逻辑-获取角色表格数据（LcapLoadRoleManagementTableView）】【实体-角色（LcapRole）】
- 系统应通过表单弹窗支持创建、编辑角色，含角色名称、角色编码、角色描述等必要字段，提交前须完整校验【服务端逻辑-无】【实体-角色（LcapRole）】
- 系统应支持删除角色，删除前需二次确认，并同步清理用户-角色、角色-权限等映射【服务端逻辑-无】【实体-角色（LcapRole）】
- 系统应支持为角色分配权限，通过官方示例中的权限选择界面完成【服务端逻辑-获取角色权限（LcapGetPermissionByRoleId）】【实体-角色与权限映射（LcapRolePerMapping）】
- 系统应支持角色成员管理（添加/移除用户），与官方示例流程一致【服务端逻辑-获取用户资源权限（LcapGetUserResources）等】【实体-无】
- 系统应对所有操作给出明确状态反馈，成功为绿色提示、失败为红色提示【服务端逻辑-无】【实体-无】

### 依赖的枚举、实体

- **数据建模-实体-角色（LcapRole）**：plan/data-model/权限中心-实体-角色（LcapRole）.md
- **数据建模-实体-角色与权限映射（LcapRolePerMapping）**：plan/data-model/权限中心-实体-角色与权限映射（LcapRolePerMapping）.md

### 特殊组件

<!-- normalized -->
- 无特殊组件
