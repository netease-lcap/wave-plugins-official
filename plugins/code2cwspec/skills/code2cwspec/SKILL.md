---
name: code2cwspec
description: 将现有系统代码（.NET、Java、Node.js 等）逆向生成为 Codewave (LCAP) 规范模板，一次性输出 requirements/plan/tasks 全部文档。
allowed-tools:
  - Bash(node */create-cw-feature.mjs*)
  - Bash(npm run --prefix* build*)
  - Bash(dotnet build*)
  - Bash(mvn compile*)
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果不为空）。

## 概述

用户在 `/code2cwspec` 后输入的文本**应该是**待转换系统的描述（如："客户管理系统"）。可选地，用户可以指定代码路径（如："src/ 目录"）。

假设你在此对话中始终可以访问它，即使下面的 `$ARGUMENTS` 字面出现。除非他们提供了空命令，否则不要要求用户重复。

**重要 - 这是从老系统代码转换为 Codewave 规范模板的命令**:
- 此命令用于**阅读现有老系统代码**，分析其架构、数据模型、页面、服务逻辑，并生成符合 spec-server 模板格式的完整文档
- **不是**用于根据模糊需求创建规格说明
- 用户需要指定待转换系统，你将通过探索代码库找到相关代码
- 如果用户提供了具体的代码路径，优先使用；否则你需要主动搜索相关代码
- 生成的文档必须严格遵循 spec-server 模板格式，适配 LCAP 平台规范

给定该系统的描述，执行以下操作：

### 阶段一：确定代码范围

1. **确定代码范围**:
   - 检查用户是否提供了系统描述
   - 如果 `$ARGUMENTS` 为空，使用 AskUserQuestion 工具询问用户：
     - 他们想要转换哪个系统？（如："客户管理系统"、"订单管理系统"等）
   - 如果用户提供了具体的代码路径（如："Controllers/ 目录"），直接使用
   - 如果用户只提供了系统描述，你需要：
     - 使用 Glob 和 Grep 等工具探索代码库
     - 根据系统描述查找相关的文件和目录
     - 识别技术栈（.NET、Java、Python、Node.js 等）
   - **强调**：这个命令需要阅读**现有代码**，不是根据需求凭空创建规格
   - 只有在确定了要分析的代码后才能继续

### 阶段二：生成目录结构

2. **生成简短名称**（2-4 个词）作为目录名：
   - 分析系统描述并提取最有意义的关键词
   - 创建一个 2-4 个词的简短名称，捕捉系统的本质
   - 保留技术术语和缩写（CRM、ERP、OA 等）
   - 示例：
     - "我想转换客户管理系统" → "客户关系管理"
     - "将订单系统转为 LCAP" → "订单管理"

3. 从仓库根目录运行脚本 `node ${WAVE_SKILL_DIR}/scripts/create-cw-feature.mjs --json "$ARGUMENTS" --short-name "your-generated-short-name"` 并解析其 JSON 输出以获取 FEATURE_NAME、FEATURE_DIR、SPECIFY_DIR、ARTIFACTS_DIR。所有文件路径必须是绝对路径。

   **重要**:
   - 用步骤 2 中生成的 2-4 个词的简短名称替换 `"your-generated-short-name"`
   - 对于参数中的单引号，使用转义语法或双引号
   - 你只能运行此脚本一次
   - JSON 在终端中作为输出提供 - 始终参考它以获取你要查找的实际内容

### 阶段三：加载模板

4. **加载模板**:
   - 优先检查当前项目目录下是否存在 `code2cwspec/templates/`。
   - 如果存在，从该目录加载所有 `-template.md` 文件。
   - 如果不存在，从 `${WAVE_SKILL_DIR}/templates/` 加载。
   - 模板结构如下：
     ```
     templates/
     ├── requirements/          # 需求规范
     │   ├── index-template.md
     │   ├── standard/          # 术语表、功能模块、业务、协作
     │   └── persistent/        # 关联段落、预检查等
     ├── plan/                  # 项目设计
     │   ├── index-template.md
     │   ├── application-structure/  # 应用架构
     │   ├── data-model/        # 数据建模（枚举、实体、ER图）
     │   ├── frontend/          # 前端业务模块
     │   ├── backend/           # 后端领域服务
     │   ├── integration/       # 集成
     │   ├── dependencies/      # 依赖（特殊组件）
     │   └── ui-design-template.md
     └── tasks/                 # 开发任务
         ├── index-template.md
         ├── entities-template.md
         ├── enums-template.md
         └── ...
     ```

### 阶段四：分析老系统代码

5. **探索和理解老系统代码** - 按以下维度系统性分析：

   #### 4.1 技术栈识别
   - 确定框架类型（ASP.NET Core MVC / Spring Boot / Django / Express 等）
   - 识别项目结构特征（Controllers、Models、Views / Controller、Service、Repository 等）
   - 确认数据访问层技术（EF Core / MyBatis / Prisma / SQLAlchemy 等）

   #### 4.2 数据建模提取
   - 扫描所有实体/模型类定义
   - 提取每个实体的属性列表、数据类型、约束（主键、外键、唯一、非空）
   - 识别实体间的关联关系（一对一、一对多、多对多）
   - 识别枚举/字典/常量定义
   - **LCAP 适配**：人员相关属性 → 映射为 `LcapUser` FK；角色 → `LcapRole` FK；部门 → `LcapDepartment` FK；权限 → `LcapPermission` FK
   - **禁止创建** User、Employee、Staff、Role、Permission、Department 等自定义实体，必须使用 LCAP 内置实体

   #### 4.3 前端页面提取
   - 识别所有页面/视图/组件
   - 提取每个页面的功能描述
   - 分析页面参数（路由参数、查询参数）
   - 识别页面的交互操作（增删改查、搜索、筛选、导出等）
   - 分析页面依赖的后端接口
   - 识别特殊组件（地图、视频播放器、富文本编辑器等非标准组件）

   #### 4.4 后端服务逻辑提取
   - 识别所有控制器/API 端点
   - 分析每个接口的输入参数和返回值
   - 提取业务规则和处理逻辑
   - 识别接口间的依赖关系
   - **LCAP 适配**：简单 CRUD 接口（单实体的 getDetail/create/update/delete/batchCreate/batchUpdate/batchDelete）视为系统内置逻辑，无需生成；仅保留复杂的、包含业务规则、获取列表数据的服务端逻辑

   #### 4.5 应用架构识别
   - 识别核心领域/业务模块划分
   - 识别关键服务集成（外部 API、消息队列、缓存等）
   - 识别应用类型（PC 端、移动端等）
   - 识别国际化支持

   #### 4.6 术语提取
   - 从代码中的类名、属性名、注释中提取业务术语
   - 区分权限角色术语（谁是什么角色）和业务术语（业务领域概念）
   - 确保术语精准、简练（"商品信息"→"商品"）
   - 排除通用术语（导出、上传、附件等）
   - 强制包含 `超级管理员` 角色（英文固定为 `DEV-AdminRole`）

   #### 4.7 不明确的方面处理
   - 根据上下文和行业标标准做出明智的猜测
   - 仅在以下情况下使用 `[需要明确: 具体问题]` 标记：
     - 选择会显著影响功能范围或用户体验
     - 存在多种具有不同含义的合理解释
     - 没有合理的默认值
   - **限制：最多总共 3 个 [需要明确] 标记**
   - 按影响优先级排序：范围 > 安全/隐私 > 用户体验 > 技术细节

### 阶段五：生成全部文档

6. **生成 requirements/ 需求规范文档**：

   a. **术语表** (`requirements/standard/terms.md`)
      - 权限角色术语表：包含 `超级管理员(DEV-AdminRole)` 和从代码中提取的角色
      - 业务术语表：从实体名、属性名、接口名提取的业务术语

   b. **功能模块详情** (`requirements/standard/module-*.md`)
      - 对每个识别出的业务模块生成详情文档
      - 包含功能描述、验收列表、关联服务端逻辑和实体

   c. **整体业务** (`requirements/standard/business.md`)
      - 从代码中推断的整体业务流程

   d. **功能协作** (`requirements/standard/cooperations.md`)
      - 模块间的协作关系

   e. **需求大纲** (`requirements/index.md`)
      - 汇总所有功能模块的索引

   f. **持久化文件** (`requirements/persistent/`)
      - `menus.md` - 菜单结构（从路由配置推断）
      - `point.md` - 关联段落（从代码注释/文档推断）
      - `precheck.md` - 预检查记录
      - `checklist.md` - 检查清单

7. **生成 plan/ 项目设计文档**：

   a. **应用架构** (`plan/application-structure/`)
      - `cores.md` - 核心领域划分
      - `services.md` - 关键服务集成
      - `roles.md` - 角色定义
      - `views.md` - 视图列表
      - `index.md` - 架构汇总

   b. **数据建模** (`plan/data-model/`)
      - `enums.md` - 所有枚举定义
      - `entities.md` - 实体索引
      - `entity-*.md` - 每个实体的详情（包含 naturalts 类型定义）
      - `er-diagram.md` - ER 图

   c. **UI/UE 规范** (`plan/ui-design.md`)
      - 从代码中提取的 UI 特征和设计模式

   d. **前端业务模块** (`plan/frontend/`)
      - `index.md` - 路由索引
      - `view-*.md` - 每个功能页面的详情（页面签名、验收列表、交互操作、依赖逻辑）

   e. **后端领域服务** (`plan/backend/`)
      - `index.md` - 服务索引
      - `logic-*.md` - 每个服务端逻辑的详情（逻辑签名、功能要点、依赖）

   f. **集成与依赖**
      - `integration/index.md` + `items.md` - 外部集成
      - `dependencies/component-*.md` - 特殊组件

   g. **项目设计总纲** (`plan/index.md`)
      - 汇总架构、数据、UI、模块、服务

8. **生成 tasks/ 开发任务文档**：

   a. **实体开发任务** (`tasks/entities.md`) - 每个实体的开发 checklist
   b. **枚举开发任务** (`tasks/enums.md`) - 每个枚举的开发 checklist
   c. **数据结构开发任务** (`tasks/structures.md`)
   d. **前端页面开发任务** (`tasks/frontend-views.md`)
   e. **后端逻辑开发任务** (`tasks/backend-logics.md`)
   f. **任务索引** (`tasks/index.md`)

### 阶段六：文档质量验证

9. **验证生成的文档**：

   a. **交叉引用检查**：
      - 确认 plan/index.md 中列出的所有条目都有对应的详情文档
      - 确认每个 view-*.md 中引用的 logic-*.md 都存在
      - 确认每个 entity-*.md 中引用的枚举和依赖实体都存在
      - 确认 tasks/ 中的任务清单与 plan/ 中的条目一一对应

   b. **LCAP 合规检查**：
      - 人员/角色/部门/权限相关实体是否正确使用了 LCAP 内置实体
      - 简单 CRUD 逻辑是否被错误地生成为独立服务端逻辑
      - 枚举是否统一维护在 `plan/data-model/enums.md` 中

   c. **格式检查**：
      - naturalts 代码块格式是否正确
      - 实体名称、属性名是否符合命名规范（PascalCase/camelCase）
      - 页面签名、逻辑签名是否符合规范

   d. **处理验证结果**：
      - 如果发现遗漏或不一致，修正相关文档
      - 最多 3 次迭代修正
      - 如果仍有问题，记录在 artifacts/quality-report.md 中并警告用户

### 阶段七：报告完成情况

10. 报告完成情况，包括：
    - 生成的目录结构概览
    - 文档统计（requirements: N 个, plan: N 个, tasks: N 个）
    - 质量验证结果
    - 任何需要明确的问题（最多 3 个）
    - 下一步建议

**注意**：所有生成的文档存放在 `FEATURE_DIR` 下，模板存放在 `.specify/templates/` 下。
