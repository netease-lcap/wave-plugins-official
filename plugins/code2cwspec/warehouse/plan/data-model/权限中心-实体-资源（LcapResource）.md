# 权限中心-实体-资源（LcapResource）

## 资源（LcapResource）

资源是权限中心子域中的核心数据对象，用于管理系统中所有可被访问和控制的资源信息。该实体存储了资源的基本元数据，包括唯一标识、名称、描述、资源类型和客户端类型等关键属性，为权限分配和资源管理提供基础数据支持。通过与权限的关联映射，实现了细粒度的资源访问控制，确保系统安全性和数据隔离性。资源支持灵活的资源分类和管理，能够适应不同业务场景下的资源管控需求，是构建完整权限体系的重要组成部分。

```naturalts path="app.dataSources.defaultDS.entities.LcapResource.ts"
/* 资源 */
export class LcapResource {
    /* 主键 */
    id: Integer;
    createdTime: DateTime;
    updatedTime: DateTime;
    createdBy: String;
    updatedBy: String;
    /* 唯一标识 */
    uuid: String;
    /* 资源名称 */
    name: String;
    /* 资源描述 */
    description: String;
    /* 资源类型 */
    resourceType: String;
    /* 客户端类型 */
    clientType: String;
}
export const LcapResourceEntity = createEntity<LcapResource>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） |
| --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 |
| createdTime | 创建时间 | DateTime | 非空 |
| updatedTime | 更新时间 | DateTime | 非空 |
| createdBy | 创建者 | String | 非空 |
| updatedBy | 更新者 | String | 非空 |
| uuid | 唯一标识 | String | 非空 |
| name | 资源名称 | String | 非空 |
| description | 资源描述 | String | 非空 |
| resourceType | 资源类型 | String | 非空 |
| clientType | 客户端类型 | String | 非空 |

### 依赖的枚举和实体

- **权限中心-实体-权限**：plan/data-model/权限中心-实体-权限（LcapPermission）.md
- **权限中心-实体-权限与资源映射**：plan/data-model/权限中心-实体-权限与资源映射（LcapPerResMapping）.md