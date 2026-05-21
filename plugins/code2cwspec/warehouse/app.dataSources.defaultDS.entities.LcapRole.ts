@Entity({
    title: '角色',
    directory: 'permission_center(权限中心)',
})
export class LcapRole {
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
        title: '角色名称',
        required: true,
    })
    name: String;

    @EntityProperty({
        title: '角色描述',
    })
    description: String;

    @EntityProperty({
        title: '角色状态',
        description: '可配置 true 启用，false 禁用',
    })
    roleStatus: Boolean = true;

    @EntityProperty({
        title: '是否可编辑',
        description: '系统字段，web新增为可编辑true，ide新增为不可编辑false',
    })
    editable: Boolean = true;
}
export const LcapRoleEntity = createEntity<LcapRole>();
