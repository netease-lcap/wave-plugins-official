@Enum({
    title: '[枚举中文名称]',
    directory: '[module_en(模块中文)]',
})
export class [EnumName] extends BaseEnum<String> {
    static readonly '[VALUE_1]' = new [EnumName]('[VALUE_1]', '[中文描述1]');
    static readonly '[VALUE_2]' = new [EnumName]('[VALUE_2]', '[中文描述2]');
    // 补充更多枚举值...
}

// Integer 枚举示例：
// export class [EnumName] extends BaseEnum<Integer> {
//     static readonly '0' = new [EnumName](0, '[中文描述1]');
//     static readonly '1' = new [EnumName](1, '[中文描述2]');
// }
