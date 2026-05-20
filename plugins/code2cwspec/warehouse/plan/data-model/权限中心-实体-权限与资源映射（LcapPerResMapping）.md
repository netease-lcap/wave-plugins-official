# 权限中心-实体-权限与资源映射（LcapPerResMapping）

## 权限与资源映射（LcapPerResMapping）

权限与资源映射实体是权限中心子域中的核心关联实体，用于建立权限与资源之间的多对多映射关系。该实体通过permissionId和resourceId字段分别关联权限和资源，实现细粒度的权限控制。当系统需要为特定权限分配可访问的资源时，会在该实体中创建对应的映射记录。这种设计使得权限管理更加灵活，支持动态调整权限所对应的资源范围，同时保证了数据的一致性和完整性。该实体还包含标准的审计字段，如创建时间、更新时间、创建者和更新者，便于追踪权限资源配置的历史变更。

```naturalts path="app.dataSources.defaultDS.entities.LcapPerResMapping.ts"
@Entity({
    title: "权限与资源映射",
    directory: "permission_center(权限中心)"
})
export class LcapPerResMapping {
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
        title: "权限ID",
        required: true
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapPermission['id']>('CASCADE')
    permissionId: Integer;

    @EntityProperty({
        title: "资源ID",
        required: true
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapResource['id']>('CASCADE')
    resourceId: Integer;
}
export const LcapPerResMappingEntity = createEntity<LcapPerResMapping>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 |
| --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） |
| createdTime | 创建时间 | DateTime | 非空 | （自动生成） |
| updatedTime | 更新时间 | DateTime | 非空 | （自动生成） |
| createdBy | 创建者 | String | 非空 | （自动生成） |
| updatedBy | 更新者 | String | 非空 | （自动生成） |
| permissionId | 权限ID | Integer | 非空、外键关联实体 LcapPermission | |
| resourceId | 资源ID | Integer | 非空、外键关联实体 LcapResource | |

### 依赖的枚举和实体

- **数据建模-实体-权限**：plan/data-model/权限中心-实体-权限（LcapPermission）.md
  - 【外键关联实体 LcapPermission】
- **数据建模-实体-资源**：plan/data-model/权限中心-实体-资源（LcapResource）.md
  - 【外键关联实体 LcapResource】