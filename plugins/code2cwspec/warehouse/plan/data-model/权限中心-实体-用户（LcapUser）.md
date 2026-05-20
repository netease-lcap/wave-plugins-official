# 权限中心-实体-用户（LcapUser）

## 用户（LcapUser）

用户是权限中心的核心业务对象，用于存储和管理系统用户的基本信息，包括用户ID、用户名、密码、联系方式、状态等关键属性。该实体支持多种登录方式（普通登录和第三方登录），通过用户状态和用户来源枚举来区分不同类型的用户账户。用户与角色、部门等其他权限建立关联关系，为系统的认证、授权和权限管理提供基础数据支持，确保用户身份的唯一性和安全性，同时支持用户信息的完整生命周期管理。

```naturalts path="app.dataSources.defaultDS.entities.LcapUser.ts"
/* 用户 */
export class LcapUser {
    /* 主键 */
    id: Integer;
    createdTime: DateTime;
    updatedTime: DateTime;
    createdBy: String;
    updatedBy: String;
    /* 用户ID */
    userId: String;
    /* 用户名 */
    userName: String;
    /* 用户密码 */
    userPassword: String;
    /* 手机号 */
    phone: String;
    /* 邮箱 */
    email: String;
    /* 昵称 */
    displayName: String;
    /* 状态 */
    status: app.enums.UserStatusEnum;
    /* 用户来源 */
    source: app.enums.UserSourceEnum;
    /* 直属主管 */
    directLeaderId: String;
}
export const LcapUserEntity = createEntity<LcapUser>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） |
| --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 |
| createdTime | 创建时间 | DateTime | 非空 |
| updatedTime | 更新时间 | DateTime | 非空 |
| createdBy | 创建人 | String | 非空 |
| updatedBy | 更新人 | String | 非空 |
| userId | 用户ID | String | 非空、唯一索引 |
| userName | 用户名 | String | 非空 |
| userPassword | 用户密码 | String | 可为空 |
| phone | 手机号 | String | 可为空 |
| email | 邮箱 | String | 可为空 |
| displayName | 昵称 | String | 可为空 |
| status | 状态 | app.enums.UserStatusEnum | 非空、默认值为正常状态 |
| source | 用户来源 | app.enums.UserSourceEnum | 非空、默认值为普通登录 |
| directLeaderId | 直属主管 | String | 可为空 |

### 依赖的枚举和实体

- **数据建模-枚举-用户状态**：plan/data-model/数据建模-枚举.md
- **数据建模-枚举-用户来源**：plan/data-model/数据建模-枚举.md