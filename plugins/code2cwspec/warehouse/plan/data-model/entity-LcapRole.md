# 权限中心-实体-角色（LcapRole）

## 角色（LcapRole）

角色是权限中心的核心组成部分，用于定义系统中的各种角色及其权限配置。该实体支持角色的创建、编辑、启用/禁用等管理操作，通过角色与权限的映射关系实现细粒度的权限控制。角色包含角色的基本信息如名称、描述、状态等，并与用户、权限建立关联关系，形成完整的RBAC（基于角色的访问控制）权限模型，确保系统安全性和数据隔离性。

```naturalts path="app.dataSources.defaultDS.entities.LcapRole.ts"
@Entity({
    title: "角色",
    directory: "permission_center(权限中心)"
})
export class LcapRole {
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
        title: "角色名称",
        required: true
    })
    name: String;

    @EntityProperty({
        title: "角色描述"
    })
    description: String;

    @EntityProperty({
        title: "角色状态",
        description: "可配置 true 启用，false 禁用"
    })
    roleStatus: Boolean = true;

    @EntityProperty({
        title: "是否可编辑",
        description: "系统字段，web新增为可编辑true，ide新增为不可编辑false"
    })
    editable: Boolean = true;
}
export const LcapRoleEntity = createEntity<LcapRole>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 |
| --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） |
| createdTime | 创建时间 | DateTime | 可为空 | （自动生成） |
| updatedTime | 更新时间 | DateTime | 可为空 | （自动生成） |
| createdBy | 创建者 | String | 可为空 | （自动生成） |
| updatedBy | 更新者 | String | 可为空 | （自动生成） |
| uuid | 唯一标识 | String | 可为空 | |
| name | 角色名称 | String | 非空 | |
| description | 角色描述 | String | 可为空 | |
| roleStatus | 角色状态 | Boolean | 可为空、默认 true | |
| editable | 是否可编辑 | Boolean | 可为空、默认 true | |

### 依赖的枚举和实体

- **数据建模-实体-用户**：plan/data-model/entity-LcapUser.md
- **数据建模-实体-权限**：plan/data-model/entity-LcapPermission.md
- **数据建模-实体-用户与角色映射**：plan/data-model/entity-LcapUserRoleMapping.md
- **数据建模-实体-角色与权限映射**：plan/data-model/entity-LcapRolePerMapping.md

<!-- PENDING -->
