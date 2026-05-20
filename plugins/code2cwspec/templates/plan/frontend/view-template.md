<!-- 一级功能：阅读并充分理解 功能模块目录，严格匹配当前功能页面对应的一级功能。
- 权限中心相关页面（必须归属「权限中心」，禁止输出「通用业务模块」）：login、noAuth、permissionCenter、roleManagement、userManagement、departmentManagement、permissionManagement。
- 仅当当前功能页面既不在功能模块目录中、也不属于上述权限中心相关页面时，才输出 `通用业务模块`。 -->

# [一级功能]-[功能页面中文名称]（[功能页面英文名称]）

- **生成时间**：[DATE]
- **需求要点**：[功能详情（requirements/persistent/checklist-module-[功能页面中文名称].md）的路径]
- **视觉需求**：[标题（requirements/standard/design-[功能页面中文名称].md）的路径]

<!-- 权限中心页面特殊标记：对于 login、noAuth、permissionCenter、roleManagement、userManagement、departmentManagement、permissionManagement 页面，在 `生成时间` 后添加以下行：
- **实现依据**：本任务已加载[页面中文名]官方示例全文，**直接以该示例的 CRUD 关键流程、关键细节与示例代码为准**。
并紧接着添加 `<attention>...</attention>` 块，说明必须以官方示例为准。
-->

## [功能页面中文名称]（[功能页面英文名称]）

<!-- 根据 页面的业务功能 与 当前页面在业务模块-层级路由中的配置 仔细思考需要支持的页面参数，禁止遗漏任何页面参数 -->

### 功能概述

[详细说明功能页面实现的业务功能]

### 页面签名

<!-- 页面英文名称严格使用 camelCase 格式 -->
<!-- 页面输入输出的类型可以使用已经生成实体、枚举、数据结构 -->
<!-- 特别注意：页面签名中必须根据当前功能页面的业务功能生成页面参数。并且页面参数的类型不局限于 `String`，ID 标识通常属于 `Integer` 类型。 -->
<!-- 页面参数发现规则：(1)验收列表中的参数识别：逐条阅读验收列表，找出明确提到的"支持XX查询"、"支持XX筛选"、"支持XX过滤"等需求，这些都对应具体的页面参数；(2)业务流程中的参数识别：分析页面在整个业务流程中的位置，判断是否需要从父页面或路由传入参数（如从列表页进入详情页需要ID参数）；(3)参数类型确认：ID标识必须使用Integer类型而非String，其他参数根据业务含义选择合适的类型（String、Boolean、Enum等）；(4)参数完整性检查：生成页面签名后，必须逐一对比验收列表，确保没有遗漏任何必需的页面参数。 -->
<!-- 特别注意：页面签名生成后，必须严格比较判断是否遵守页面签名（knowledge/view-declaration.md）文档内部关键规则、工作流程，如果出现任何没有遵守的情况，必须重新生成，指导完全满足页面签名（knowledge/view-declaration.md）文档内部关键规则、工作流程-->

[必须完整阅读充分理解 页面签名（knowledge/view-declaration.md）文档，严格遵守文档内部关键规则、工作流程生成 naturalts 代码块描述页面签名]

<!-- $View() 签名选项说明：
- 登录页：$View({ title: "登录页", auth: false, isIndex: false })
- CRUD 管理页：$View({ title: "用户管理", crumb: "用户管理", auth: true, authDescription: "用户管理", isIndex: true })
- 普通页面：$View({ title: "客户列表", crumb: "客户列表" })
-->

<!-- 数据签名示例，仅作参考

```naturalts path="app.frontendTypes.pc.frontends.pc.views.productDetail.tsx"
$View({
    title: "商品详情",
    crumb: "商品详情",
})
export declare function productDetail(productId?: Integer);
```

无输入参数的页面签名示例：

```naturalts path="app.frontendTypes.pc.frontends.pc.views.permissionCenter.views.userManagement.tsx"
$View({
    title: "用户管理",
    crumb: "用户管理",
    auth: true,
    authDescription: "用户管理",
    isIndex: true,
})
export declare function userManagement();
```

无输入参数。
-->

### 依赖的枚举、实体

<!-- 页面可能依赖枚举和实体，根据以下格式列出全部依赖的枚举和实体 -->
- **数据建模-枚举-[依赖枚举中文名称]**：[数据建模-枚举-[依赖枚举中文名称]（plan/data-model/数据建模-枚举.md）的路径]
- **数据建模-实体-[依赖实体中文名称]**：[数据建模-实体-[依赖实体中文名称]（plan/data-model/[子域]-实体-[依赖实体中文名称]（依赖实体英文名称）.md）的路径]

### 特殊组件

<!--
特殊组件：仅当业务功能**无法**用 **UI组件库** 的标准组件实现时，才使用业务定制的特殊组件。

- **适用场景**：仅限二维码、地图、pdf预览、视频播放器、富文本编辑器等需要专有渲染能力的场景
- **禁止滥用**：禁止将可由基础组件（Table、Select、Modal、Card 等）实现的做成特殊组件，如：用户管理表格、用户选择器、权限弹窗、设备列表等
- **严格禁止遗漏**：必须列出页面内所有真正的特殊组件，禁止遗漏任何特殊组件
-->
<!-- normalized -->

- 无特殊组件
