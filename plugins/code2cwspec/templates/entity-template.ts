@Entity({
    title: '[实体中文名称]',
    description: '[实体功能描述]',
    directory: '[module_en(模块中文)]',
})
export class [EntityName] {
    // ===== 系统审计字段（每个实体必须包含）=====
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

    // ===== 业务字段 =====
    // String 字段示例
    @EntityProperty({
        title: '[字段中文名]',
        description: '[字段描述]',
        required: true,
        dbType: VARCHAR(100),
    })
    [fieldName]: String = "";

    // 枚举字段示例
    @EntityProperty({
        title: '[字段中文名]',
        required: true,
    })
    [fieldName]: app.enums.[EnumName] = app.enums.[EnumName]['[DEFAULT_VALUE]'];

    // Decimal 字段示例
    @EntityProperty({
        title: '[字段中文名]',
        description: '[字段描述]',
        dbType: DECIMAL(10, 2),
        required: true,
        rules: [min(0)],
    })
    [fieldName]: Decimal = 0;

    // ===== 外键关联字段 =====
    // FK 到 LcapUser 示例
    @EntityProperty({
        title: '[所属销售/负责人等]',
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('CASCADE')
    [ownerId]: String;

    // FK 到其他业务实体示例
    @EntityProperty({
        title: '[关联实体中文名]',
    })
    @EntityRelation<app.dataSources.defaultDS.entities.[TargetEntity]['id']>('PROTECT')
    [entityId]: Integer;
}
export const [EntityName]Entity = createEntity<[EntityName]>();
