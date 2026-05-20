# 权限中心-实体-用户与部门映射（LcapUserDeptMapping）

## 用户与部门映射（LcapUserDeptMapping）

用户与部门映射实体是权限中心的核心关联实体，用于建立用户与部门之间的多对多关系。该实体记录了系统中每个用户所属的部门信息，以及用户在部门中的角色标识（如是否为部门主管）。通过此映射关系，系统能够实现基于部门的权限控制、组织架构管理和用户归属查询等功能。实体包含用户ID、部门标识和是否是部门主管等关键属性，支持用户部门分配、部门成员管理等业务场景，确保系统权限管理的准确性和灵活性。

```naturalts path="app.dataSources.defaultDS.entities.LcapUserDeptMapping.ts"
@Entity({
    title: "用户与部门映射",
    directory: "permission_center(权限中心)"
})
export class LcapUserDeptMapping {
    @EntityProperty({
        title: "主键",
        primaryKey: true,
        required: true
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
        title: "用户ID"
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('CASCADE')
    userId: String;

    @EntityProperty({
        title: "部门标识"
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapDepartment['deptId']>('CASCADE')
    deptId: String;

    @EntityProperty({
        title: "是否是部门主管",
        description: "0否 1是"
    })
    isDeptLeader: Integer = 0;
}
export const LcapUserDeptMappingEntity = createEntity<LcapUserDeptMapping>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 |
| --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） |
| createdTime | 创建时间 | DateTime | 可为空 | （自动生成） |
| updatedTime | 更新时间 | DateTime | 可为空 | （自动生成） |
| createdBy | 创建人 | String | 可为空 | （自动生成） |
| updatedBy | 更新人 | String | 可为空 | （自动生成） |
| userId | 用户ID | String | 可为空、外键关联实体 LcapUser（CASCADE） | |
| deptId | 部门标识 | String | 可为空、外键关联实体 LcapDepartment（CASCADE） | |
| isDeptLeader | 是否是部门主管 | Integer | 可为空、默认 0 | |

### 依赖的枚举和实体

- **数据建模-实体-用户**：plan/data-model/权限中心-实体-用户（LcapUser）.md
  - 【外键关联实体 LcapUser】
- **数据建模-实体-部门**：plan/data-model/权限中心-实体-部门（LcapDepartment）.md
  - 【外键关联实体 LcapDepartment】
