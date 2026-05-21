@Enum({
    title: '用户状态',
    directory: 'permission_center(权限中心)',
})
export class UserStatusEnum extends BaseEnum<String> {
    static readonly 'Normal' = new UserStatusEnum('Normal', '正常');
    static readonly 'Forbidden' = new UserStatusEnum('Forbidden', '禁用');
}