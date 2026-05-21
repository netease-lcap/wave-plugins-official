@Entity({
    title: '权限',
    directory: 'permission_center(权限中心)',
})
export class LcapPermission {
    @EntityProperty({
        title: '主键',
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
        title: '唯一标识',
    })
    uuid: String;

    @EntityProperty({
        title: '权限名称',
        required: true,
    })
    name: String;

    @EntityProperty({
        title: '权限编码',
        description: '权限的唯一编码标识，用于程序中识别权限',
    })
    code: String;

    @EntityProperty({
        title: '权限描述',
    })
    description: String = "";
}
export const LcapPermissionEntity = createEntity<LcapPermission>();
