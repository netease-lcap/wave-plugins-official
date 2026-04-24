# 权限中心-创建普通用户（LcapCreateNormalUser）

## 创建普通用户（LcapCreateNormalUser）

### 功能概述

创建普通用户服务端逻辑用于在权限中心系统中新增用户账户，支持用户名、密码、手机号、邮箱等基本信息的录入，并自动处理用户ID生成、密码加密、默认部门分配等关键业务流程。该逻辑确保新创建的用户具有完整的身份信息和基础权限配置。

### 功能要点

- **用户信息验证与处理**：接收包含用户名、密码、手机号、邮箱等字段的用户作为输入参数，对必填字段进行验证，确保用户名的唯一性和密码的合规性（8-12位长度）。系统会自动生成唯一的用户ID，如果未提供则基于用户名和用户来源生成；同时对用户密码进行加密处理后存储，确保用户账户的安全性。
- **用户创建与默认配置**：将处理后的用户信息保存到用户表中，自动设置用户状态为"正常"、用户来源为"普通登录"，并记录创建时间和操作人信息。新创建的用户将获得系统默认的基础权限配置，确保能够正常登录和使用系统基本功能。
- **部门关联与分配**：在用户创建成功后，自动查询系统中的部门列表，将新用户分配到根部门（通常是组织架构的顶级部门），并建立用户与部门的映射关系。这种默认的部门分配机制确保了用户在系统中具有明确的组织归属，为后续的权限管理和业务流程提供基础支持。

### 逻辑签名

```naturalts path="app.logics.LcapCreateNormalUser.ts"
$Logic({
    description: '创建普通用户，支持用户名、密码、手机号、邮箱等基本信息的录入',
    directory: 'permission_center(权限中心)',
})
export declare function LcapCreateNormalUser(user: app.dataSources.defaultDS.entities.LcapUser): Boolean;
```

### 被前端调用

- **用户管理页（userManagement）**：在用户管理页面中，系统管理员点击"创建用户"按钮后，弹出创建用户表单对话框，填写用户名、密码（8-12位）、手机号、邮箱等信息后提交表单，前端调用此服务端逻辑创建新用户，并在创建成功后刷新用户列表显示最新数据。

### 依赖的枚举、实体、数据结构

- **数据建模-枚举-用户状态**：[数据建模-枚举](plan/data-model/enums.md)
- **数据建模-枚举-用户来源**：[数据建模-枚举](plan/data-model/enums.md)
- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)
- **数据建模-实体-用户与部门映射**：[权限中心-实体-用户与部门映射（LcapUserDeptMapping）](plan/data-model/entity-LcapUserDeptMapping.md)
- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->