# 权限中心-实体-权限（LcapPermission）

## 权限（LcapPermission）

权限是权限中心子域的核心组成部分，用于存储和管理系统中的权限信息。该实体包含权限的唯一标识、名称、描述等基本信息，支持权限的创建、更新、查询和删除操作。权限与角色通过角色与权限映射实体关联，实现基于角色的访问控制（RBAC），确保系统资源的安全访问和操作授权。权限还与资源关联，定义了具体的操作权限范围，为系统的精细化权限管理提供数据基础。

```naturalts path="app.dataSources.defaultDS.entities.LcapPermission.ts"
@Entity({
    title: "权限",
    directory: "permission_center(权限中心)"
})
export class LcapPermission {
    @EntityProperty({
        title: "主键",
        primaryKey: true
    })
    id: Integer;

    @EntityProperty({
        title: "创建时间"
    })
    createdTime: DateTime;

    @EntityProperty({
        title: "更新时间"
    })
    updatedTime: DateTime;

    @EntityProperty({
        title: "创建者"
    })
    createdBy: String;

    @EntityProperty({
        title: "更新者"
    })
    updatedBy: String;

    @EntityProperty({
        title: "唯一标识"
    })
    uuid: String;

    @EntityProperty({
        title: "权限名称",
        required: true
    })
    name: String;

    @EntityProperty({
        title: "权限描述"
    })
    description: String;
}
export const LcapPermissionEntity = createEntity<LcapPermission>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 |
| --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） |
| createdTime | 创建时间 | DateTime | 可为空 | （自动生成） |
| updatedTime | 更新时间 | DateTime | 可为空 | （自动生成） |
| createdBy | 创建者 | String | 可为空 | （自动生成） |
| updatedBy | 更新者 | String | 可为空 | （自动生成） |
| uuid | 唯一标识 | String | 可为空 | |
| name | 权限名称 | String | 非空 | |
| description | 权限描述 | String | 可为空 | |

### 依赖的枚举和实体

- **权限中心-实体-角色**：plan/data-model/权限中心-实体-角色（LcapRole）.md
- **权限中心-实体-资源**：plan/data-model/权限中心-实体-资源（LcapResource）.md
- **权限中心-实体-角色与权限映射**：plan/data-model/权限中心-实体-角色与权限映射（LcapRolePerMapping）.md
- **权限中心-实体-权限与资源映射**：plan/data-model/权限中心-实体-权限与资源映射（LcapPerResMapping）.md
