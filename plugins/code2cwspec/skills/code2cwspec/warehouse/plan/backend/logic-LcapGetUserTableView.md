# 权限中心-获取用户表格视图数据（LcapGetUserTableView）

## 获取用户表格视图数据（LcapGetUserTableView）

### 功能概述

该服务端逻辑用于获取用户管理页面的表格视图数据，支持分页查询和条件筛选。通过多表联查获取用户基本信息、所属部门以及直属主管等完整信息，并对敏感字段（如密码）进行安全处理，确保返回给前端的数据既完整又安全。该逻辑是用户管理功能的核心数据支撑，为系统管理员提供用户列表的展示和管理能力。

### 功能要点

- **分页查询支持**：实现标准的分页查询功能，接收页码和每页条数参数，返回指定页面的用户数据，支持大数据量下的高效浏览。
- **多表联查整合**：通过左外连接关联用户表、用户部门映射表和部门表，一次性获取用户的完整信息，包括用户名、手机号、邮箱、状态、所属部门等关键字段。
- **模糊搜索筛选**：支持按用户名（包括显示名称）和手机号进行模糊匹配查询，提高用户查找的灵活性和准确性。
- **敏感数据保护**：在返回结果中自动将用户密码字段设置为空值，确保敏感信息不会泄露到前端界面。
- **直属主管信息**：通过调用其他逻辑获取用户直属主管的姓名信息，完善用户组织关系的展示。
- **数据结构转换**：将原始数据库查询结果转换为内联行类型 `{ user, userDept, dept, deptUser }`，便于前端直接使用。

### 逻辑签名

```naturalts path="app.logics.LcapGetUserTableView.ts"
$Logic({
    description: '用户管理页面数据表格数据源',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetUserTableView(page: Integer, size: Integer, filter: app.dataSources.defaultDS.entities.LcapUser): { list: List<{ user: app.dataSources.defaultDS.entities.LcapUser, userDept: app.dataSources.defaultDS.entities.LcapUserDeptMapping, dept: app.dataSources.defaultDS.entities.LcapDepartment, deptUser: String }>, total: Integer };
```

### 被前端调用

- **用户管理页（userManagement）**：用户管理页面通过此逻辑获取用户列表数据，用于表格展示。页面支持按用户名模糊搜索，并以分页形式展示用户信息，包括用户名、手机号、所属部门等字段，同时在操作列提供编辑和删除功能。

### 依赖的枚举、实体、数据结构

- **数据建模-枚举-用户状态**：plan/data-model/enums.md
- **数据建模-枚举-用户来源**：plan/data-model/enums.md
- **数据建模-实体-用户**：plan/data-model/entity-LcapUser.md
- **数据建模-实体-用户与部门映射**：plan/data-model/entity-LcapUserDeptMapping.md
- **数据建模-实体-部门**：plan/data-model/entity-LcapDepartment.md

<!-- PENDING -->