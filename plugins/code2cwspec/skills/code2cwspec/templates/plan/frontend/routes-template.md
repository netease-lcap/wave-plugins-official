# 业务模块-层级路由
- **生成时间**：[DATE]

## 层级路由

<!-- 严格按照 功能模块目录 的 **页面** 功能点生成 功能页面 与 层级路由，必须忽略 **逻辑** 功能点。生成路由前，必须阅读并充分理解 前端页面 - 规划和路由（nasl-book/K007-frontend-view--plan-and-routes.md）文档 -->
[必须阅读并充分理解 前端页面 - 规划和路由（nasl-book/K007-frontend-view--plan-and-routes.md）文档，必须严格遵守知识文档，生成当前系统的层级路由。生成结果使用 markdown 的 json 代码块展示。]

<!-- 特别注意：层级路由中页面路径用到每一级名称都必须严格使用 camelCase 格式。 -->
<!-- 特别注意：层级路由的最顶层页面容器是 `dashboard`，层级路由 `dashboard` 的 `type` 必须是 `layout`，其他所有页面都是 `dashboard` 的子级页面，所有路由的页面路径都必须以 `/dashboard` 开头。 -->
<!-- 特别注意：所有层级路由数据都必须有一个 `alias` 属性，数据是 页面路径最后一级名称。 -->
<!-- 特别注意：层级路由中页面路径用到的最后一级名称在所有的路由中都必须是唯一的。如果出现重复的最后一级名称，必须重新生成层级路由，直到层级路由中页面路径用到的最后一级名称在所有的路由中都是唯一的。 -->

<!-- 生成层级路由后，必须严格检查生成内容是够严格遵守 前端页面 - 规划和路由（nasl-book/K007-frontend-view--plan-and-routes.md）文档 的内容与特别注意规则，如果发现没有严格遵守的情况，必须重新生成直到完全严格遵守 前端页面 - 规划和路由（nasl-book/K007-frontend-view--plan-and-routes.md）文档 的内容与特别注意规则为止。  -->

<!-- 【JSON 代码块格式强制规范】生成的 JSON 代码块必须严格遵守以下格式要求，不允许任何偏差：1. 代码块开头必须是 ```json（全小写，不能是 ```typescript、```ts 或其他格式）；2. JSON 内容必须是有效的 JSON 格式，所有字符串使用双引号，所有键值对正确；3. 代码块结尾必须是 ```（三个反引号），不能缺少、不能多余、不能有其他字符；4. 只允许有一个 JSON 代码块，而且内容都必须是完整的、可独立解析的有效 JSON；5. 严禁在 JSON 代码块中出现注释、TypeScript 类型定义或任何非 JSON 内容。 -->

<!-- 【强制分批生成策略 - 增量追加模式】必须采用分批生成模式，通过增量追加的方式构建完整 JSON：1. **第一批**：生成 dashboard 容器 + 第一个一级功能模块的所有路由，输出完整的 JSON 对象代码块；2. **后续批次**：每次只生成一个一级功能模块的路由数组（不包含 dashboard），输出为 JSON 数组代码块；3. **追加方式**：通过替换的方式，将新生成的路由数组追加到前一个 JSON 对象的**最后一个路由之后**（在闭合括号前插入）；4. 重复此过程直到所有一级功能模块的路由都已生成并追加完毕；5. 每批之间用清晰的分隔符标记（如"## 第 X 批路由 - [一级功能模块名称]"），说明当前生成的是哪个模块；6. 不需要等待用户确认，自动连续生成所有批次。【分批生成的好处】：避免一次性生成大量内容导致系统崩溃或超时，通过增量追加方式逐步构建完整 JSON，确保每批生成的质量和稳定性。【最终结果】：一个完整的、包含所有层级路由的 JSON 对象，可直接使用。 -->

<!-- 示例数据
```json
[
    { "levels": ["登录"], "type": "login", "path": "/login", "alias": "login", "description": "登录页面" },
    { "levels": ["无权限页"], "type": "other", "path": "/noAuth", "alias": "noAuth", "description": "无权限提示页面" },
    { "levels": ["权限中心"], "type": "router_container", "isIndex": true, "path": "/permissionCenter", "alias": "permissionCenter", "description": "权限中心容器" },
    { "levels": ["权限中心", "用户管理"], "type": "crud", "isIndex": true, "path": "/permissionCenter/userManagement", "alias": "userManagement", "description": "【用户管理】" },
    { "levels": ["权限中心", "角色管理"], "type": "crud", "path": "/permissionCenter/roleManagement", "alias": "roleManagement", "description": "【角色管理】" },
    { "levels": ["权限中心", "权限管理"], "type": "crud", "path": "/permissionCenter/permissionManagement", "alias": "permissionManagement", "description": "【权限管理】" },
    { "levels": ["权限中心", "部门管理"], "type": "crud", "path": "/permissionCenter/departmentManagement", "alias": "departmentManagement", "description": "【部门管理】" }
]
```-->

<!-- 生成层级路由后，必须严格检查生成内容是否严格遵守 前端页面 - 规划和路由（nasl-book/K007-frontend-view--plan-and-routes.md）文档 的内容与特别注意规则，以及 JSON 代码块格式强制规范，如果发现没有严格遵守的情况，必须重新生成直到完全严格遵守为止。 -->
