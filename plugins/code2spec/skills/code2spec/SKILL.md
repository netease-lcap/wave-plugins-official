---
name: code2spec
description: 分析代码仓库，自动识别功能模块并生成编号规格说明文档。多智能体架构：研究→规划→写作→验证。
disable-model-invocation: true
allowed-tools:
  - Bash(node */init-specs.mjs*)
  - Bash(mkdir*)
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果不为空）。

## 路径预设

- **插件根目录**: `${WAVE_PLUGIN_ROOT}/`
- **模板目录**: `${WAVE_PLUGIN_ROOT}/templates/`
- **脚本目录**: `${WAVE_PLUGIN_ROOT}/scripts/`
- **输出目录**: `specs/`（相对于项目根目录）

## 执行流程

### Step 0: 解析输入，确定分析范围

- 如果 `$ARGUMENTS` 为空，分析整个代码仓库
- 如果 `$ARGUMENTS` 包含具体路径（如 `src/auth/`）或功能描述（如"用户认证模块"），仅分析指定范围，只为相关模块生成规格

### Step 1: 初始化目录

运行脚本创建 `specs/` 和 `specs/.state/` 目录：

```bash
node ${WAVE_PLUGIN_ROOT}/scripts/init-specs.mjs
```

> 此时仅创建目录结构，不创建规格子目录（等待架构师确定编号后再批量创建）。

### Step 2: 研究员分析代码

启动子智能体 `spec-researcher`，传入上下文：
- 分析范围: [Step 0 确定的范围]
- 输出文件: `specs/.state/research-report.md`

等待完成，确认 `specs/.state/research-report.md` 已生成。

### Step 3: 架构师规划规格

启动子智能体 `spec-architect`，传入上下文：
- 研究报告路径: `specs/.state/research-report.md`
- 现有 specs/ 目录状态

等待完成，确认 `specs/.state/architecture-plan.md` 和 `specs/.state/generation-manifest.json` 已生成。

从 `generation-manifest.json` 中提取规格列表，批量创建目录：

```bash
node ${WAVE_PLUGIN_ROOT}/scripts/init-specs.mjs --add-specs '<JSON 数组>'
```

`--add-specs` 参数格式：

```json
[{"shortName":"user-auth","title":"用户认证"},{"shortName":"order-mgmt","title":"订单管理"}]
```

解析脚本输出的 JSON，获取每个规格的 `specFile` 和 `checklistFile` 绝对路径。

### Step 4: 规格撰写者生成文档

为每个规格启动一个 `spec-writer` 子智能体，传入上下文：
- 模式: 批量生成
- 规格编号: ###
- 短名称: xxx
- specFile 路径
- checklistFile 路径
- sourcePaths: [...]
- 架构计划路径: `specs/.state/architecture-plan.md`
- 研究报告路径: `specs/.state/research-report.md`

**并行策略**：独立的规格（dependsOn 为空）可以并行生成，将多个 spec-writer 子智能体放在同一个 tool_calls 块中启动（不使用 `run_in_background`）。有依赖关系的规格串行执行。

### Step 5: 验证员检查质量

启动子智能体 `spec-validator`，传入上下文：
- generation-manifest.json 路径
- 所有规格目录列表

等待完成，确认 `specs/.state/validation-summary.md` 已生成。

### Step 6: 修复循环（最多 2 轮）

1. 读取 `specs/.state/validation-summary.md`
2. 如果存在失败项且未超过 2 轮修复：
   - 启动 `spec-writer` 子智能体（修复模式），传入上下文：
     - 模式: 修复验证问题
     - 验证摘要中的具体问题列表
     - 需要修改的 spec.md 路径
   - 修复完成后，重新执行 Step 5
3. 如果所有项通过或已达到 2 轮上限，继续下一步

### Step 7: 报告完成

向用户报告：
- 生成的规格数量和列表
- 每个规格的路径和标题
- 验证结果摘要（通过/失败项数）
- 如有未解决的问题，列出具体问题
