# 权限中心-实体-部门（LcapDepartment）

## 部门（LcapDepartment）

部门是权限中心子域的核心组成部分，用于管理系统中组织架构的部门信息。该实体存储部门的基本信息，包括部门名称、部门唯一标识和父部门标识，支持构建多层级的组织架构树。通过部门，系统能够实现基于部门的权限分配、用户归属管理和组织架构可视化，为系统提供完整的组织架构支撑。部门与用户通过用户与部门映射实体关联，确保每个用户都能准确归属到相应的部门，实现精细化的权限控制和数据隔离。

```naturalts path="app.dataSources.defaultDS.entities.LcapDepartment.ts"
@Entity({
    title: "部门",
    directory: "permission_center(权限中心)"
})
export class LcapDepartment {
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
        title: "部门名称"
    })
    name: String;

    @EntityProperty({
        title: "部门标识"
    })
    deptId: String;

    @EntityProperty({
        title: "父部门标识"
    })
    parentDeptId: String;

    __IndexList() {
        return [{ deptIdIndex: [this.deptId] }];
    }
}
export const LcapDepartmentEntity = createEntity<LcapDepartment>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） | 默认值 |
| --- | --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 | （自动生成） |
| createdTime | 创建时间 | DateTime | 可为空 | （自动生成） |
| updatedTime | 更新时间 | DateTime | 可为空 | （自动生成） |
| createdBy | 创建人 | String | 可为空 | （自动生成） |
| updatedBy | 更新人 | String | 可为空 | （自动生成） |
| name | 部门名称 | String | 可为空 | |
| deptId | 部门标识 | String | 可为空、唯一索引 | |
| parentDeptId | 父部门标识 | String | 可为空 | |

### 依赖的枚举和实体

- **数据建模-实体-用户与部门映射**：plan/data-model/entity-LcapUserDeptMapping.md

<!-- PENDING -->
