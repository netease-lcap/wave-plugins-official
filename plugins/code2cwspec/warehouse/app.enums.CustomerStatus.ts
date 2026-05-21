@Enum({
    title: '客户状态',
    directory: 'customer_management(客户管理)',
})
export class CustomerStatus extends BaseEnum<String> {
    static readonly 'POTENTIAL' = new CustomerStatus('POTENTIAL', '潜在客户');
    static readonly 'INTENTIONAL' = new CustomerStatus('INTENTIONAL', '意向客户');
    static readonly 'CLOSED_WON' = new CustomerStatus('CLOSED_WON', '成交客户');
    static readonly 'LOST' = new CustomerStatus('LOST', '流失客户');
}