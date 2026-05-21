@Entity({
    title: '部门',
    directory: 'permission_center(权限中心)',
})
export class LcapDepartment {
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
        title: '部门名称',
    })
    name: String;

    @EntityProperty({
        title: '部门标识',
    })
    deptId: String;

    @EntityProperty({
        title: '父部门标识',
    })
    parentDeptId: String;
}
export const LcapDepartmentEntity = createEntity<LcapDepartment>();
