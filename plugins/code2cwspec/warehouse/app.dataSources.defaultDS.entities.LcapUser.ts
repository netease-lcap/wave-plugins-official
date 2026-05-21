@Entity({
    title: '用户',
    directory: 'permission_center(权限中心)',
})
export class LcapUser {
    @EntityProperty({
        title: '主键',
        required: true,
        primaryKey: true,
        generationRule: 'auto',
    })
    id: Integer;

    @EntityProperty({
        title: '创建时间',
        generationRule: 'auto',
    })
    createdTime: DateTime;

    @EntityProperty({
        title: '更新时间',
        generationRule: 'auto',
    })
    updatedTime: DateTime;

    @EntityProperty({
        title: '创建者',
        generationRule: 'auto',
    })
    createdBy: String;

    @EntityProperty({
        title: '更新者',
        generationRule: 'auto',
    })
    updatedBy: String;

    @EntityProperty({
        title: '用户ID',
        description: '第三方登录方式唯一id；普通登录使用userName+source作为userId',
        required: true,
    })
    userId: String;

    @EntityProperty({
        title: '用户名',
        description: '普通登录用户名，类似账号的概念',
        required: true,
    })
    userName: String;

    @EntityProperty({
        title: '登录密码',
        description: '普通登录密码，密码建议加密存储。第三方登录不会存储密码',
    })
    password: String;

    @EntityProperty({
        title: '手机号',
    })
    phone: String;

    @EntityProperty({
        title: '邮箱',
    })
    email: String;

    @EntityProperty({
        title: '昵称',
        description: '展示的名称',
    })
    displayName: String;

    @EntityProperty({
        title: '状态',
        description: '标识当前用户的状态',
    })
    status: app.enums.UserStatusEnum = app.enums.UserStatusEnum['Normal'];

    @EntityProperty({
        title: '用户来源',
        description: '当前条用户数据来自哪个用户源，如普通登录、微信登录',
        required: true,
    })
    source: app.enums.UserSourceEnum = app.enums.UserSourceEnum['Normal'];

    @EntityProperty({
        title: '直属主管',
        description: '用户的直属主管，关联到其他用户的userId',
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('PROTECT')
    directLeaderId: String;

    @EntityProperty({
        title: '部门标识',
        description: '用户所属部门的唯一标识',
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapDepartment['deptId']>('PROTECT')
    deptId: String;
}
export const LcapUserEntity = createEntity<LcapUser>();
