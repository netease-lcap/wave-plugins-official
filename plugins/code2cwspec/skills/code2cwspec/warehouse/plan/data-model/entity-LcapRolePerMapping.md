# 权限中心-实体-角色与权限映射（LcapRolePerMapping）

## 角色与权限映射（LcapRolePerMapping）

角色与权限映射实体用于建立角色与权限之间的多对多关联关系，实现灵活的权限分配机制。该实体记录了每个角色所拥有的具体权限，支持为角色动态分配和移除权限，是权限中心模块的核心关联表。通过该实体，系统能够精确控制不同角色对系统资源的访问权限，确保系统的安全性和数据隔离性。该实体与角色（LcapRole）和权限（LcapPermission）建立外键关联，确保数据的完整性和一致性。

```naturalts path="app.dataSources.defaultDS.entities.LcapRolePerMapping.ts"
@Entity({
    title: "角色与权限映射",
    directory: "permission_center(权限中心)"
})
export class LcapRolePerMapping {
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
        title: "角色ID",
        required: true
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapRole['id']>('CASCADE')
    roleId: Integer;

    @EntityProperty({
        title: "权限ID",
        required: true
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapPermission['id']>('CASCADE')
    permissionId: Integer;
}
export const LcapRolePerMappingEntity = createEntity<LcapRolePerMapping>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 |
| --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） |
| createdTime | 创建时间 | DateTime | 非空 | （自动生成） |
| updatedTime | 更新时间 | DateTime | 非空 | （自动生成） |
| createdBy | 创建者 | String | 非空 | （自动生成） |
| updatedBy | 更新者 | String | 非空 | （自动生成） |
| roleId | 角色ID | Integer | 非空、外键关联实体 LcapRole | |
| permissionId | 权限ID | Integer | 非空、外键关联实体 LcapPermission | |

### 依赖的枚举和实体

- **数据建模-实体-角色**：plan/data-model/entity-LcapRole.md
  - 【外键关联实体 LcapRole】
- **数据建模-实体-权限**：plan/data-model/entity-LcapPermission.md
  - 【外键关联实体 LcapPermission】

  <!-- PENDING -->