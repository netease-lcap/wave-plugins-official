# 权限中心-权限管理页（permissionManagement）

- **生成时间**：2026-03-02
- **实现依据**：本任务会已加载权限管理页官方示例全文，**直接以该示例的 CRUD 关键流程、关键细节与示例代码为准**。

<attention>
实现时必须包含：权限 CRUD、资源关联（Transfer）、按权限名称搜索；删除/编辑/创建的关键步骤与表单·表格·弹窗配置均以官方示例为准，禁止省略或自行简化。
</attention>

## 权限管理页（permissionManagement）

### 功能概述

权限管理页是权限中心子域的核心功能页面，用于管理权限（LcapPermission）的增删改查、权限与资源的关联及按权限名称搜索。表格展示序号、权限名称、权限角色、权限描述与操作列，弹窗表单完成创建与编辑并含关联资源（Transfer），具体流程与配置以官方示例为准。

### 页面签名

```naturalts path="app.frontendTypes.pc.frontends.pc.views.permissionCenter.views.permissionManagement.tsx"
$View({
    title: "权限管理",
    crumb: "权限管理",
    auth: true,
    authDescription: "权限管理",
    isIndex: true,
})
export declare function permissionManagement();
```

无输入参数。

### 验收列表

- 系统应以表格展示权限列表，含序号、权限名称、权限角色、权限描述、操作列，支持按权限名称筛选与分页【服务端逻辑-加载权限管理表格视图数据（LcapLoadPermissionManagementTableView）】【实体-权限（LcapPermission）】
- 系统应通过弹窗表单支持新增/编辑权限，含权限名称（必填且唯一）、描述、关联资源（Transfer）；创建后须设置实体 ID 再建关联，编辑时先建新关联再删旧关联【服务端逻辑-获取权限名称列表、获取未关联/已关联资源等】【实体-权限（LcapPermission）】
- 系统应在删除确认后仅关闭确认框并刷新表格，不关闭编辑弹窗【服务端逻辑-无】【实体-无】

### 依赖的枚举、实体

- **数据建模-实体-权限（LcapPermission）**：plan/data-model/权限中心-实体-权限（LcapPermission）.md

### 特殊组件

<!-- normalized -->
- 无特殊组件
