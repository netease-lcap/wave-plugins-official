---
name: code2cwspec
description: 全量分析现有代码仓库，逆向生成为 Codewave (LCAP) 规范模板，一次性输出 requirements/plan/tasks 全部文档。
allowed-tools:
  - Bash(node */init-cwspec.mjs*)
  - Bash(node */check-naslnames.mjs*)
  - Bash(node */check-menus.mjs*)
  - Bash(node */check-crossrefs.mjs*)
  - Bash(node */check-placeholders.mjs*)
  - Bash(git*)
---

# Code2CwSpec: 全量代码转 Codewave 规范

你是一名技术文档架构师。为该仓库生成完整的 Codewave 规范文档，包含 requirements（需求规范）、plan（项目设计）、tasks（开发任务）三阶段产物。

## 用户输入

```text
$ARGUMENTS
```

## 流程

按顺序执行以下步骤：

### 第 0 步：源码仓库解析（必须首先执行）

1. **检查 git remote**：运行 `git remote get-url origin`
2. **询问用户**：_"这是一个仅限本地的仓库，还是你有源码仓库 URL？"_
   - 远程 URL → 存储为 `REPO_URL`，使用链接引用
   - 本地 → 使用本地引用 `(文件路径:行号)`
3. **确定当前分支**：运行 `git rev-parse --abbrev-ref HEAD`
4. **在解析之前，不要继续**

### 第 1 步：创建输出目录

从仓库根目录运行 `node ${WAVE_PLUGIN_ROOT}/scripts/init-cwspec.mjs --json` 初始化 `cwspec/` 目录。输出目录固定为 `cwspec/`，包含：
- `cwspec/research-report.md` — 代码研究报告
- `cwspec/architecture-plan.md` — 架构规划
- `cwspec/generation-manifest.json` — 生成清单
- `cwspec/requirements/` — 需求规范
- `cwspec/plan/` — 项目设计
- `cwspec/tasks/` — 开发任务
- `cwspec/quality-report.md` — 质量报告

### 第 2 步：加载上下文知识

加载以下知识源，为文档生成提供规则和范式：

1. **知识库** `${WAVE_PLUGIN_ROOT}/knowledge/`：
   - `precheck-manual.md` — 需求分析方法论（歧义澄清、冲突识别、功能闭合检查）
   - `entity-declaration.md` — 实体类型定义生成规则（NASL 格式、表格规范、必填字段、FK 约束）
   - `enum-declaration.md` — 枚举类型定义生成规则（NASL 格式、枚举值管理）
   - `structure-declaration.md` — 数据结构类型定义生成规则（NASL 格式、入参/返回结构）
   - `logic-declaration.md` — 逻辑类型定义生成规则（$Logic 装饰器、参数签名、分页查询格式）
   - `view-declaration.md` — 页面类型定义生成规则（$View 装饰器、页面函数签名、逻辑依赖引用）

2. **模板** `${WAVE_PLUGIN_ROOT}/templates/`：
   - 加载全部 `-template.md` 文件，理解每个模板的结构、占位符格式和生成要求

3. **案例库** `${WAVE_PLUGIN_ROOT}/warehouse/`：
   - `warehouse/plan/data-model/entity-*.md` — 实体案例（9 个）
   - `warehouse/plan/frontend/view-*.md` — 页面案例（8 个）
   - `warehouse/plan/backend/logic-*.md` — 逻辑案例（44 个）
   - 作为写作范式参考，确保文档格式与 spec-server 标准一致

### 第 3 步：全量代码研究

委托 `cw-researcher` agent 对仓库进行系统性深度研究。研究员将：

1. **扫描仓库全貌**：入口点、配置文件、项目结构、技术栈、语言组成
2. **结构调查**：组件、边界、模块划分、层级分离
3. **数据建模提取**：扫描所有实体/模型/DTO/ViewModel，提取属性、约束、关联关系
4. **前端页面提取**：扫描所有视图/页面/组件/路由配置
5. **后端服务提取**：扫描所有控制器/API 端点/服务类
6. **集成映射**：外部 API、第三方服务、消息队列、缓存
7. **术语提取**：从类名、属性名、注释中提取业务术语和角色术语

研究产出写入 `cwspec/research-report.md`。

### 第 4 步：架构规划

委托 `cw-architect` agent，基于研究报告规划文档结构。架构师将：

1. 划分核心领域/业务模块
2. 设计数据模型（枚举、实体、ER 关系）
3. 规划前端页面层级和路由
4. 规划后端服务逻辑
5. 识别特殊组件和外部集成
6. 生成文档生成清单（JSON 格式，列出每个要生成的文件及其模板路径和输入数据）

架构规划写入 `cwspec/architecture-plan.md` 和 `cwspec/generation-manifest.json`。

### 第 5 步：批量生成文档

委托 `cw-writer` agent，根据架构规划批量生成所有文档。按以下顺序：

**Phase A — requirements/**（需求规范）
- `standard/terms.md` — 术语表（权限角色 + 业务术语）
- `standard/business.md` — 整体业务
- `standard/cooperations.md` — 功能协作
- `standard/module-*.md` — 每个功能模块详情
- `index.md` — 需求大纲
- `persistent/` — 菜单、关联段落、预检查、检查清单

**Phase B — plan/**（项目设计）
- `application-structure/` — 应用架构（领域划分、服务集成、角色、视图）
- `data-model/` — 数据建模（枚举、实体详情、ER 图）
- `ui-design.md` — UI/UE 规范
- `frontend/` — 前端业务模块（路由索引、页面详情）
- `backend/` — 后端领域服务（服务索引、逻辑详情）
- `integration/` — 外部集成
- `dependencies/` — 特殊组件
- `index.md` — 项目设计总纲

**Phase C — tasks/**（开发任务）
- `entities.md`、`enums.md`、`structures.md`
- `frontend-views.md`、`backend-logics.md`
- `index.md` — 任务索引

### 第 6 步：LCAP 合规适配

对所有生成文档执行以下规则：

**实体适配**：
- 人员相关属性（userId、assigneeId、createdBy 等）→ 必须使用 `LcapUser` FK
- 角色相关属性 → 必须使用 `LcapRole` FK
- 部门相关属性 → 必须使用 `LcapDepartment` FK
- 权限相关属性 → 必须使用 `LcapPermission` FK
- 禁止创建 User、Employee、Staff、Role、Permission、Department 等自定义实体

**服务逻辑过滤**：
- 简单 CRUD（getDetail/create/update/delete/batchCreate/batchUpdate/batchDelete）→ 视为系统内置，不生成独立逻辑
- 枚举查询/加载 → 视为系统内置，不生成独立逻辑
- 仅保留复杂业务逻辑、多实体操作、含业务规则的接口

**枚举统一**：
- 所有枚举统一维护在 `plan/data-model/enums.md` 中
- 禁止生成独立的 enum-*.md 文件

### 第 7 步：质量验证

1. **命名冲突检查**：使用 `node ${WAVE_PLUGIN_ROOT}/scripts/check-naslnames.mjs` 验证实体/页面/逻辑名称不与 NASL 保留字冲突
2. **菜单结构检查**：使用 `node ${WAVE_PLUGIN_ROOT}/scripts/check-menus.mjs` 验证菜单名称为中文、无重复路径、层级正确
3. **格式检查**：使用 `node ${WAVE_PLUGIN_ROOT}/scripts/check-placeholders.mjs cwspec/` 验证无占位符残留、路径完整、行号格式正确
4. **交叉引用检查**：使用 `node ${WAVE_PLUGIN_ROOT}/scripts/check-crossrefs.mjs --base cwspec/ --strict` 验证 FK 引用的实体存在、Markdown 链接有效；plan/index.md 中条目与详情文档一一对应；view 引用 logic 存在；tasks 与 plan 条目对应
5. **深度检查**：每个声明都有代码引用支撑；没有虚构不存在的模块或接口
6. 最多 3 次迭代修正
7. 质量报告写入 `cwspec/quality-report.md`

### 第 8 步：报告完成情况

输出：
- 生成的目录结构概览（requirements: N 个, plan: N 个, tasks: N 个）
- 质量验证结果
- 任何需要明确的问题（最多 3 个）

$ARGUMENTS
