# 权限中心-实体-用户与角色映射（LcapUserRoleMapping）

## 用户与角色映射（LcapUserRoleMapping）

用户与角色映射实体用于建立用户与角色之间的多对多关联关系，实现灵活的权限分配机制。该实体记录了用户ID与角色ID的对应关系，支持为单个用户分配多个角色，同时也支持单个角色被多个用户共享。通过该映射关系，系统能够准确识别用户所拥有的所有角色，从而进行细粒度的权限控制和访问验证。实体还包含用户名和用户来源信息，便于在权限管理界面中显示用户的基本信息，提升管理效率。

```naturalts path="app.dataSources.defaultDS.entities.LcapUserRoleMapping.ts"
@Entity({
    title: "用户与角色映射",
    directory: "permission_center(权限中心)"
})
export class LcapUserRoleMapping {
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
        title: "用户唯一ID",
        required: true
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('CASCADE')
    userId: String;

    @EntityProperty({
        title: "角色唯一ID",
        required: true
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapRole['id']>('CASCADE')
    roleId: Integer;

    @EntityProperty({
        title: "用户名"
    })
    userName: String;

    @EntityProperty({
        title: "用户来源"
    })
    source: String;
}
export const LcapUserRoleMappingEntity = createEntity<LcapUserRoleMapping>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 |
| --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） |
| createdTime | 创建时间 | DateTime | 可为空 | （自动生成） |
| updatedTime | 更新时间 | DateTime | 可为空 | （自动生成） |
| createdBy | 创建人 | String | 可为空 | （自动生成） |
| updatedBy | 更新人 | String | 可为空 | （自动生成） |
| userId | 用户唯一ID | String | 非空、外键关联实体 LcapUser（CASCADE） | |
| roleId | 角色唯一ID | Integer | 非空、外键关联实体 LcapRole（CASCADE） | |
| userName | 用户名 | String | 可为空 | |
| source | 用户来源 | String | 可为空 | |

### 依赖的枚举和实体

- **数据建模-实体-用户**：plan/data-model/权限中心-实体-用户（LcapUser）.md
  - 【外键关联实体 LcapUser】
- **数据建模-实体-角色**：plan/data-model/权限中心-实体-角色（LcapRole）.md
  - 【外键关联实体 LcapRole】
