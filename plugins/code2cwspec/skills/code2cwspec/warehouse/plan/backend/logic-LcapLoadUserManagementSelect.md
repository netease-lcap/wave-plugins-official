# 权限中心-加载用户管理直属主管选择列表（LcapLoadUserManagementSelect）

## 加载用户管理直属主管选择列表（LcapLoadUserManagementSelect）

### 功能概述

该服务端逻辑用于用户管理页面中创建/编辑用户表单的「直属主管」下拉选择器数据源。根据当前用户ID（编辑时传入，创建时可为空）返回可选的主管用户列表，支持分页与过滤，便于前端渲染为下拉选项。通常排除当前用户自身，避免将本人设为主管。

### 功能要点

- **可选主管列表**：查询用户实体或用户部门映射，返回可作为直属主管的用户集合，供前端 ElFormSelect 等组件使用。
- **编辑场景上下文**：编辑时传入当前用户ID，可排除该用户或按业务规则过滤可选主管；创建时第二参数可为 null。
- **数据结构**：返回 `List<{ lcapUser: app.dataSources.defaultDS.entities.LcapUser }>`，便于前端使用 `textField`/`valueField` 绑定显示名与值。

### 逻辑签名

```naturalts path="app.logics.LcapLoadUserManagementSelect.ts"
$Logic({
    description: '用户管理页创建/编辑表单的直属主管选择列表',
    directory: 'permission_center(权限中心)'
})
export declare function LcapLoadUserManagementSelect(userId: String, name: String): List<{ lcapUser: app.dataSources.defaultDS.entities.LcapUser }>;
```

### 被前端调用

- **用户管理页（userManagement）**：在打开创建用户或编辑用户弹窗时调用，用于加载「直属主管」下拉框的选项列表；编辑时传入当前用户ID以过滤或排除本人。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)

<!-- PENDING -->
