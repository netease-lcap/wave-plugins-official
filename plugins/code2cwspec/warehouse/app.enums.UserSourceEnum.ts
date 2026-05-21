@Enum({
    title: '用户来源',
    directory: 'permission_center(权限中心)',
})
export class UserSourceEnum extends BaseEnum<String> {
    static readonly 'Normal' = new UserSourceEnum('Normal', '普通登录');
    static readonly 'OpenId' = new UserSourceEnum('OpenId', 'OpenId');
}