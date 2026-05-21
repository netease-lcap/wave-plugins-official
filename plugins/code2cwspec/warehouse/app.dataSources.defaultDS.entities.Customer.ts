@Entity({
    title: '客户',
    description: '记录客户的基本信息，包括客户名称、联系人、联系方式、客户状态及所属销售等信息',
    directory: 'customer_management(客户管理)',
})
export class Customer {
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
        title: '客户名称',
        description: '客户的企业名称或个人姓名',
        required: true,
        dbType: VARCHAR(100),
    })
    customerName: String = "";

    @EntityProperty({
        title: '联系人',
        description: '客户的联系人姓名',
        required: true,
        dbType: VARCHAR(50),
    })
    contactPerson: String = "";

    @EntityProperty({
        title: '手机号',
        description: '客户的联系电话，11位手机号格式',
        required: true,
        dbType: VARCHAR(11),
    })
    phoneNumber: String = "";

    @EntityProperty({
        title: '邮箱',
        description: '客户的电子邮箱地址',
        dbType: VARCHAR(100),
    })
    email: String = "";

    @EntityProperty({
        title: '公司地址',
        description: '客户的公司地址或办公地址',
        dbType: VARCHAR(255),
    })
    companyAddress: String = "";

    @EntityProperty({
        title: '客户状态',
        description: '客户当前的状态分类',
        required: true,
    })
    customerStatus: app.enums.CustomerStatus = app.enums.CustomerStatus['POTENTIAL'];

    @EntityProperty({
        title: '来源',
        description: '客户信息的来源渠道',
        dbType: VARCHAR(50),
    })
    source: String = "";

    @EntityProperty({
        title: '最后跟进时间',
        description: '销售人员最后一次跟进该客户的时间',
    })
    lastFollowUpTime: DateTime;

    @EntityProperty({
        title: '所属销售',
        description: '负责该客户的销售人员',
    })
    @EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('CASCADE')
    ownerId: String;

    @EntityProperty({
        title: '进入公海时间',
        description: '客户进入公海客户池的时间，用于记录客户资源重新分配的时间点',
    })
    enteredPublicSeaTime: DateTime;
}
export const CustomerEntity = createEntity<Customer>();
