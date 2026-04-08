---
name: constitution
description: 创建或更新项目宪章以定义项目的核心原则和不可协商规则。
disable-model-invocation: true
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果不为空）。

## 大纲

你正在 `.specify/memory/constitution.md` 创建或更新项目宪章。本文档定义项目的核心原则、技术标准和不可协商规则。

按照此执行流程：

1. **加载或初始化**：
   - 从 !`node -e "console.log(require('fs').existsSync('.specify/memory/constitution.md') ? require('path').resolve('.specify/memory/constitution.md') : '${WAVE_SKILL_DIR}/../../memory/constitution.md')"` 加载宪章。
   - 识别占位符如 `[项目名称]`、`[原则名称]` 等。

2. **收集原则**：
   - 使用用户输入定义或更新核心原则。
   - 如果未提供原则，建议常见的（例如 "类型安全"、"测试覆盖"、"文档极简"）。
   - 每个原则应有**名称**、**描述**（规则）和**原因**（为什么）。

3. **草拟内容**：
   - 用具体值替换占位符。
   - 确保原则是声明性的且可测试的（使用必须/应该）。
   - 保持结构简单：标题、原则和基本的治理章节。

4. **同步模板（可选但推荐）**：
   - 简要检查更新后的原则是否影响 !`node -e "console.log(require('fs').existsSync('.specify/templates/') ? require('path').resolve('.specify/templates/') : '${WAVE_SKILL_DIR}/../../templates/')"` 的模板（规格、计划或任务）。
   - 如果原则要求新章节（例如"安全分析"），确保 `.specify/templates/` 的项目级模板反映这一点。

5. **完成**：
   - 更新版本和日期（ISO 格式 YYYY-MM-DD）。
   - 将完成的宪章写入 `.specify/memory/constitution.md`。
   - 提供更改摘要和建议的提交消息。

## 原则准则

- **声明性**：陈述必须或应该做什么。
- **可测试**：审查者应该能够验证是否遵循了原则。
- **简洁**：聚焦于能防止常见项目特定问题的高影响规则。
- **适应性**：原则应该与项目的具体上下文和目标相关。
