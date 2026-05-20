<!-- 归属子域：阅读并充分理解 应用架构-核心领域划分，通过文档匹配当前实体归属的核心子域，如果没有当前实体的归属的核心子域，直接输出 `通用数据建模` -->

# [归属子域]-实体-[实体中文名称]（[实体英文名称]）

- **生成时间**：[DATE]

## [实体中文名称]（[实体英文名称]）

<!-- **特别注意**：阅读并充分理解 **术语表**，属性名称必须要尽量使用已经有的术语定义。 -->
<!-- **特别注意**：阅读并充分理解所有 **规范需求-详情** 文档，必须重点阅读理解文档内的 **验收列表** 模块，必须输出当前实体涉及到的验收列表中对应验收规则，在此基础生成输出当前实体的功能描述，并且实体的属性设计必须要做到支持所有对应的业务功能。 -->

[详细描述当前实体的功能]

<!-- 实体英文名称严格使用 PascalCase 格式 -->
<!-- 实体属性可以使用已经生成实体、枚举 -->
<!-- 实体属性名严格使用 camelCase 格式 -->
<!-- 特别注意：如果某个属性本质上属于固定取值、分类归类、状态分组、开关判断、布尔语义、是否语义等情况，必须优先复用系统内部已有枚举，禁止优先退化为 Boolean、String、Integer 等基础类型。 -->
<!-- 特别注意：对于布尔值或“是否”类属性，必须先检查系统内部是否已有可复用的“是否”相关枚举；如果已有，必须优先使用对应枚举，禁止直接定义为 Boolean。只有在确实不存在合适枚举且业务上也不适合枚举表达时，才允许退回基础类型。 -->

<!-- 🚨 【强制约束 - LCAP 内置实体关联规范】
所有涉及以下业务概念的属性，必须使用对应的 LCAP 内置实体进行 FK 关联，禁止使用基础类型（string、int 等）：

1. 【人员属性 → LcapUser】
   任何涉及人员的属性都必须关联到 LcapUser 实体，包括但不限于：
   - userId、assigneeId、modifierId、deleterId
   - follower、responsiblePerson、manager、operator、approver、reviewer
   - contactPerson、principalPerson、handlerPerson、ownerPerson

   ❌ 错误示例：userId: string "创建人"、assigneeId: integer "指派人"
   ✅ 正确示例：userId: LcapUser FK "创建人"、assigneeId: LcapUser FK "指派人"

   禁止关联 `createdBy` 与 `updatedBy` 关联到 `LcapUser`。

   示例数据:
   ```
     @EntityRelation<app.dataSources.defaultDS.entities.LcapUser['userId']>('CASCADE')
     userId: String;
   ```

2. 【权限属性 → LcapPermission】
   任何涉及权限的属性都必须关联到 LcapPermission 实体：
   - permission、requiredPermission、grantedPermission
   - accessPermission、operationPermission、dataPermission

   ❌ 错误示例：permission: string "权限"
   ✅ 正确示例：permission: LcapPermission FK "关联的权限"

   示例数据:
   ```
     @EntityRelation<app.dataSources.defaultDS.entities.LcapPermission['id']>('CASCADE')
     permissionId: Integer;
   ```

3. 【角色属性 → LcapRole】
   任何涉及角色的属性都必须关联到 LcapRole 实体：
   - roleId、assignedRole、requiredRole、userRole
   - administratorRole、operatorRole、viewerRole

   ❌ 错误示例：roleId: string "角色ID"
   ✅ 正确示例：roleId: LcapRole FK "关联的角色"

   示例数据:
   ```
     @EntityRelation<app.dataSources.defaultDS.entities.LcapRole['id']>('CASCADE')
     roleId: Integer;
   ```

4. 【部门属性 → LcapDepartment】
   任何涉及部门、组织、团队的属性都必须关联到 LcapDepartment 实体：
   - departmentId、ownerDepartment、responsibleDepartment
   - organizationId、teamId、divisionId、branchId

   ❌ 错误示例：departmentId: integer "部门ID"
   ✅ 正确示例：departmentId: LcapDepartment FK "所属部门"

   示例数据:
   ```
     @EntityRelation<app.dataSources.defaultDS.entities.LcapDepartment['deptId']>('CASCADE')
     deptId: String;
   ```

【关键原则】：
- 禁止创建 User、Employee、Staff、Role、Permission、Department、Organization 等自定义实体
- 所有人员、权限、角色、部门相关的关联必须直接使用对应的 LCAP 内置实体
- 不要用 string 或 integer 来存储这些信息，必须通过 FK 关联
- 这是对所有属性的通用规则，不仅仅是特定属性
-->

<!-- 特别注意：实体类型定义生成后，必须严格比较判断是否遵守实体类型定义（knowledge/entity-declaration.md）文档内部关键规则、工作流程，如果出现任何没有遵守的情况，必须重新生成，指导完全满足实体类型定义（knowledge/entity-declaration.md）文档内部关键规则、工作流程 -->
<!-- 特别注意：必须严格根据“实体类型定义（knowledge/entity-declaration.md）”与实际业务逻辑补充属性默认值。若某个属性在业务上存在明确默认值，必须在实体类型定义与字段表中准确补上默认值；若业务上不存在明确默认值，则禁止臆造、禁止强行补默认值。 -->

[必须完整阅读充分理解 实体类型定义（knowledge/entity-declaration.md）文档，严格遵守文档内部关键规则、工作流程生成 naturalts 代码块描述实体类型定义]

<!-- 实体类型定义示例，仅供参考

```naturalts path="app.dataSources.defaultDS.entities.Product.ts"
/* 客户 */
export class Product {
    /* 主键 */
    id: Integer;
    createdTime: DateTime;
    updatedTime: DateTime;
    createdBy: String;
    updatedBy: String;
    /* 商品名称 */
    name: String;
    /* 商品状态 */
    productStatus: app.enums.ProductStatusEnum;
    @EntityProperty({
      title: "商品分类",
      description: "商品所属的分类"
    })
    @EntityRelation<app.dataSources.defaultDS.entities.ProductCategory['id']>('PROTECT')
    categoryId: Integer;
}
export const ProductEntity = createEntity<Product>();
```

| 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） |
| --- | --- | --- | --- |
| id | 主键 | Integer | 主键、非空 |
| createdTime | 创建时间 | DateTime | 非空 |
| updatedTime | 更新时间 | DateTime | 非空 |
| createdBy | 创建人 | String | 非空 |
| updatedBy | 更新人 | String | 非空 |
| name | 商品名称 | String | 非空 |
| productStatus | 商品状态 | app.enums.ProductStatusEnum | 非空、默认值 Saled |
| categoryId | 商品分类 | ProductCategory | 外键、关联实体 ProductCategory |
-->

### 依赖的枚举和实体

<!-- 实体可能依赖枚举和**其他实体（不包含当前实体）**，根据以下格式列出全部依赖的枚举和**其他实体（不包含当前实体）** -->
<!-- 【强制检查】如果实体中包含以下任何属性，必须在依赖实体中列出对应的 LCAP 内置实体：
   - 任何人员相关属性 → 必须列出 LcapUser
   - 任何权限相关属性 → 必须列出 LcapPermission
   - 任何角色相关属性 → 必须列出 LcapRole
   - 任何部门相关属性 → 必须列出 LcapDepartment
-->
<!-- 强制要求：所有枚举都统一维护在 plan/data-model/数据建模-枚举.md 这一个文件内；这里的依赖路径也必须始终指向该文件，禁止生成、引用或依赖任何单独的枚举详情文件，例如 enum-*.md、enum-[枚举英文名称].md、enum-[枚举中文名称].md 等路径都一律不允许出现 -->
- **数据建模-枚举-[依赖枚举中文名称]**：[数据建模-枚举-[依赖枚举中文名称]（plan/data-model/数据建模-枚举.md）的路径] 
- **数据建模-实体-[依赖实体中文名称]**：[数据建模-实体-[依赖实体中文名称]（plan/data-model/[子域]-实体-[依赖实体中文名称]（[依赖实体英文名称]）.md）的路径]

<!-- 示例数据，仅供参考（特别注意：内置实体必须填写对应路径，不必考虑路径是否有对应文件）：
- **数据建模-实体-用户**：plan/data-model/权限中心-实体-用户（LcapUser）.md
- **数据建模-实体-部门**：plan/data-model/权限中心-实体-部门（LcapDepartment）.md
-->
