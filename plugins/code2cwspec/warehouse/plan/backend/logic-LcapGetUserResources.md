# 权限中心-获取用户资源（LcapGetUserResources）

## 获取用户资源（LcapGetUserResources）

### 功能概述

该服务端逻辑用于获取指定用户所拥有的所有资源权限信息。通过四表联查的方式，从用户角色映射表开始，依次关联角色权限映射表、权限资源映射表和资源表，最终获取用户通过其所属角色间接获得的所有系统资源。该逻辑是实现基于角色的访问控制（RBAC）模型的核心功能之一，为前端权限验证和资源展示提供数据支持。

### 功能要点

- **用户资源权限查询**：根据用户ID查询该用户通过角色分配所获得的所有系统资源权限，实现完整的权限继承链路。该功能通过四表联查（用户-角色-权限-资源）确保获取到用户所有的间接资源权限，避免权限遗漏。
- **数据去重处理**：由于用户可能通过多个角色获得相同的资源权限，逻辑内部会对查询结果进行去重处理，确保返回的资源列表中每个资源名称只出现一次，提高数据的准确性和前端处理效率。
- **空值安全处理**：当传入的用户ID为空或无效时，逻辑会安全地返回空的资源列表，而不是抛出异常，保证系统的健壮性和稳定性。
- **资源信息结构化**：返回的资源信息包含资源名称和资源类型两个关键字段，便于前端根据不同类型的资源进行差异化展示和处理，支持灵活的权限管理界面设计。

### 逻辑签名

```naturalts path="app.logics.LcapGetUserResources.ts"
$Logic({
    description: '获取指定用户所拥有的所有资源权限信息',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetUserResources(userId: String): List<app.structures.LcapGetResourceResult>;
```

### 被前端调用

- **角色管理页（roleManagement）**：在角色管理页面中，当需要验证当前用户是否有权限访问特定功能或资源时，会调用此逻辑获取用户的完整资源权限列表，用于前端的权限控制和菜单显示。
- **权限管理页（permissionManagement）**：在权限管理页面中，用于展示当前用户可操作的资源范围，帮助管理员了解用户的实际权限边界。
- **用户管理页（userManagement）**：在用户详情查看时，用于展示该用户通过角色分配获得的所有资源权限，便于管理员进行权限审计。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-用户与角色映射**：plan/data-model/entity-LcapUserRoleMapping.md
- **数据建模-实体-角色与权限映射**：plan/data-model/entity-LcapRolePerMapping.md
- **数据建模-实体-权限与资源映射**：plan/data-model/entity-LcapPerResMapping.md
- **数据建模-实体-资源**：plan/data-model/entity-LcapResource.md
- **数据建模-数据结构-用户资源数据体**：plan/data-model/structure-LcapGetResourceResult.md

<!-- PENDING -->