---
name: code2cwspec
description: 全量分析现有代码仓库，逆向生成为 Codewave (LCAP) 规范模板，输出 spec.md + menus.md + TypeScript 实体/枚举文件。
disable-model-invocation: true
allowed-tools:
  - Bash(node */code2cwspec/scripts/*.mjs*)

---

# Code2CwSpec: 全量代码转 Codewave 规范

你是一名技术文档架构师。为该仓库生成完整的 Codewave 规范文档，输出扁平目录结构下的 spec.md、menus.md 和 TypeScript 实体/枚举声明文件。

## 用户输入

```text
$ARGUMENTS
```

## 流程

按顺序执行以下步骤：

### 第 0 步：确定当前目录

确认当前工作目录即为目标代码仓库根目录，后续所有路径引用均基于此目录使用本地路径格式 `(文件路径:行号)`。

### 第 1 步：创建输出目录

从仓库根目录运行 `node ${WAVE_PLUGIN_ROOT}/scripts/init-cwspec.mjs --json` 初始化 `cwspec/` 目录。输出目录固定为 `cwspec/`（扁平结构，无子目录），包含：
- `cwspec/spec.md` — 需求规格文档
- `cwspec/menus.md` — 功能模块目录
- `cwspec/app.dataSources.defaultDS.entities.*.ts` — 实体 TypeScript 文件
- `cwspec/app.enums.*.ts` — 枚举 TypeScript 文件
- `cwspec/research-report.md` — 代码研究报告
- `cwspec/architecture-plan.md` — 架构规划
- `cwspec/generation-manifest.json` — 生成清单
- `cwspec/quality-report.md` — 质量报告

**模板目录**：`${WAVE_PLUGIN_ROOT}/templates/`，子 agent 按需直接从插件目录读取。

**关键路径预置**（子 agent 可直接使用，无需搜索验证）：
- 插件根目录：`${WAVE_PLUGIN_ROOT}/`
- 模板：`${WAVE_PLUGIN_ROOT}/templates/`
- 知识库：`${WAVE_PLUGIN_ROOT}/knowledge/`
- 案例参考：`${WAVE_PLUGIN_ROOT}/warehouse/`
- 验证脚本：`${WAVE_PLUGIN_ROOT}/scripts/check-*.mjs`
- 目标代码仓库：当前工作目录（即 `cwspec/` 的父目录）
- 输出目录：`cwspec/`（固定路径，相对于目标代码仓库根目录）

### 第 2 步：委托子 Agent

后续步骤将通过子 agent 完成实际工作。各 agent 会自行加载所需的知识库、模板和案例，无需在此预加载。

**重要：所有 agent 必须在前台同步运行，禁止使用后台模式（`run_in_background: false`）。**

### 第 3 步：全量代码研究

委托 `cw-researcher` agent 对仓库进行系统性深度研究。研究员将：

1. **扫描仓库全貌**：入口点、配置文件、项目结构、技术栈
2. **结构调查**：组件、边界、模块划分
3. **数据建模提取**：实体、属性、关联关系、枚举
4. **前端页面提取**：视图/组件、路由、功能点
5. **后端服务提取**：控制器/API/LCAP 适配标记
6. **术语提取**：业务术语、中英文映射

研究产出写入 `cwspec/research-report.md`。

### 第 4 步：架构规划

委托 `cw-architect` agent，基于研究报告规划文档结构。架构师将：

1. 划分核心领域/业务模块
2. 设计数据模型（枚举、实体、FK 关系）
3. 规划 menus.md 页面结构
4. 生成文档清单（JSON 格式，列出每个要生成的 .ts/.md 文件路径）

架构规划写入 `cwspec/architecture-plan.md` 和 `cwspec/generation-manifest.json`。

### 第 5 步：批量生成文档

委托 `cw-writer` agent，根据架构规划批量生成所有文档。按以下顺序：

**Phase 1 — requirements**
- `spec.md` — 单一需求规格文档
- `menus.md` — 3 列菜单表格

**Phase 2 — enums（所有枚举 .ts 文件，可并行）**
- `app.enums.EnumName.ts` — 每个枚举一个文件

**Phase 3 — entities（所有实体 .ts 文件，可并行）**
- `app.dataSources.defaultDS.entities.EntityName.ts` — 每个实体一个文件

### 第 6 步：质量验证

委托 `cw-validator` agent 对所有已生成文档执行 LCAP 合规检查和交叉引用验证，质量报告写入 `cwspec/quality-report.md`。

验证脚本：
- `node ${WAVE_PLUGIN_ROOT}/scripts/check-naslnames.mjs --dir cwspec/`
- `node ${WAVE_PLUGIN_ROOT}/scripts/check-crossrefs.mjs cwspec/`
- `node ${WAVE_PLUGIN_ROOT}/scripts/check-menus.mjs cwspec/menus.md`

### 第 7 步：修复验证问题

将 `cwspec/quality-report.md` 中的问题反馈给 `cw-writer` agent 进行修复：

1. 读取质量报告，提取所有需要修复的问题
2. 委托 `cw-writer` 逐项修复文档
3. 修复完成后更新质量报告，标记已修复的问题

### 第 8 步：报告完成情况

输出：
- 生成的文件清单（spec.md: 1, menus.md: 1, 实体: N 个, 枚举: M 个）
- 质量验证结果
- 任何需要明确的问题（最多 3 个）
