---
name: plan
description: 使用计划模板执行实现规划工作流以生成设计产物。
disable-model-invocation: true
allowed-tools:
  - Bash(node */setup-plan.mjs*)
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果不为空）。

## 大纲

1. **设置**：从仓库根目录运行 `node ${WAVE_SKILL_DIR}/../../scripts/setup-plan.mjs --json` 并解析 JSON 获取 FEATURE_SPEC、IMPL_PLAN、SPECS_DIR、BRANCH。对于参数中的单引号如 "I'm Groot"，使用转义语法：例如 'I'\''m Groot'（或尽可能使用双引号："I'm Groot"）。

2. **加载上下文**：读取 FEATURE_SPEC 和 !`node -e "console.log(require('fs').existsSync('.specify/memory/constitution.md') ? require('path').resolve('.specify/memory/constitution.md') : require('path').resolve('${WAVE_SKILL_DIR}/../../memory/constitution.md'))"`。从 `${WAVE_SKILL_DIR}/../../templates/plan-template.md` 加载 IMPL_PLAN 模板。

3. **执行计划工作流**：按照 IMPL_PLAN 模板中的结构：
   - 填写技术上下文（将未知项标记为"需要澄清"）
   - 从宪章填写宪章检查章节
   - 评估门禁（如果违规无正当理由则错误）
   - 阶段 0：生成 research.md（解决所有需要澄清）
   - 阶段 1：生成 data-model.md、contracts/、quickstart.md
   - 设计后重新评估宪章检查

4. **停止并报告**：命令在阶段 2 规划后结束。**不要生成 tasks.md** — 这是 `/tasks` 技能的职责。报告分支、IMPL_PLAN 路径和生成的产物。

## 阶段

### 阶段 0：大纲与研究

1. **从技术上下文中提取未知项**：
   - 对于每个需要澄清 → 研究任务
   - 对于每个依赖 → 最佳实践任务
   - 对于每个集成 → 模式任务

2. **生成并派遣研究代理**：
   ```
   对于技术上下文中的每个未知项：
     任务："为 {功能上下文} 研究 {未知项}"
   对于每个技术选择：
     任务："为 {领域} 中的 {技术} 查找最佳实践"
   ```

3. **在 `research.md` 中整合发现**，使用格式：
   - 决策：[选择了什么]
   - 原因：[为何选择]
   - 考虑的替代方案：[还评估了什么]

**输出**：所有需要澄清已解决的 research.md

### 阶段 1：设计与契约

**前置条件：** `research.md` 完成

1. **从功能规格提取实体** → `data-model.md`：
   - 实体名称、字段、关系
   - 需求中的验证规则
   - 状态转换（如适用）

2. **从功能需求生成 API 契约**：
   - 对于每个用户操作 → 端点
   - 使用标准 REST/GraphQL 模式
   - 输出 OpenAPI/GraphQL schema 到 `/contracts/`

**输出**：data-model.md、/contracts/*、quickstart.md

## 关键规则

- 所有规划阶段必须使用 **通用代理** 执行以确保技术准确性和代码库一致性。
- 使用绝对路径
- 门禁失败或未解决的澄清时报错
