# 权限中心-用户管理页（userManagement）

- **生成时间**：2026-03-02
- **实现依据**：本任务会已加载用户管理页官方示例全文，**直接以该示例的 CRUD 关键流程、关键细节与示例代码为准**。

<attention>
实现时必须包含：用户 CRUD、用户名唯一性校验、删除确认与映射清理；删除/编辑/创建的关键步骤与表单·表格·弹窗配置均以官方示例为准，禁止省略或自行简化。
</attention>

## 用户管理页（userManagement）

### 功能概述

用户管理页是权限中心的核心功能模块，用于对系统用户进行全生命周期管理。提供用户的新增、编辑、删除和列表查询，支持按用户名筛选；表格展示用户名、手机号、所属部门等，弹窗表单完成创建与编辑，表单含用户名（必填）、密码（新增时必填）、手机号、邮箱等，具备完整校验。

### 页面签名

```naturalts path="app.frontendTypes.pc.frontends.pc.views.permissionCenter.views.userManagement.tsx"
$View({
    title: "用户管理",
    crumb: "用户管理",
    auth: true,
    authDescription: "用户管理",
    isIndex: true,
})
export declare function userManagement();
```

无输入参数。

### 验收列表

- 系统应以分页表格展示用户列表，含用户名、手机号、部门、操作列，支持按用户名筛选【服务端逻辑-获取用户表格视图（LcapGetUserTableView）】【实体-用户（LcapUser）】
- 系统应通过弹窗表单支持创建用户，含用户名（必填）、密码（必填 8–12 位）、手机号、邮箱等，创建时用户名为可编辑【服务端逻辑-创建普通用户（LcapCreateNormalUser）】【实体-用户（LcapUser）】
- 系统应通过弹窗表单支持编辑用户，预填充当前数据，用户名为禁用，密码仅在创建时显示【服务端逻辑-更新普通用户（LcapUpdateNormalUser）】【实体-用户（LcapUser）】
- 系统应支持删除用户，删除前需确认，删除时同步删除用户-部门等映射，成功后刷新列表【服务端逻辑-无】【实体-用户（LcapUser）】
- 系统应在表单提交前完成必填与用户名唯一性等校验，操作成功后给出明确提示并刷新列表【服务端逻辑-获取用户名列表（LcapGetUserNameList）等】【实体-无】

### 依赖的枚举、实体

- **数据建模-实体-用户（LcapUser）**：plan/data-model/权限中心-实体-用户（LcapUser）.md

### 特殊组件

<!-- normalized -->
- 无特殊组件
