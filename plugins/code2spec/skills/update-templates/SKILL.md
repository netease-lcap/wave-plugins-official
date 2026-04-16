---
name: update-templates
description: 更新项目级的需求质量检查清单和 Spec 模板。
allowed-tools:
  - Bash(mkdir*)
  - Bash(cp*)
  - Edit(.code2spec/templates/*)
  - Write(.code2spec/templates/*)
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果不为空）。

## 大纲

你正在 `.code2spec/templates/` 下创建或更新项目级的需求质量检查清单和 Spec 模板。这些模板将被 code2spec 相关命令优先使用。

按照此执行流程：

1. **检查并初始化目录**：
   - 确保 `.code2spec/templates/` 目录存在，不存在则创建。
   - 使用 !`node -e "console.log(require('fs').existsSync('.code2spec/templates/requirements-checklist.md') ? require('path').resolve('.code2spec/templates/requirements-checklist.md') : require('path').resolve('${WAVE_SKILL_DIR}/../code2spec/templates/requirements-checklist.md'))"` 确定检查清单的来源路径。
   - 使用 !`node -e "console.log(require('fs').existsSync('.code2spec/templates/spec-template.md') ? require('path').resolve('.code2spec/templates/spec-template.md') : require('path').resolve('${WAVE_SKILL_DIR}/../code2spec/templates/spec-template.md'))"` 确定 Spec 模板的来源路径。

2. **初始化缺失的模板**：
   - 逐一检查 `.code2spec/templates/requirements-checklist.md` 和 `.code2spec/templates/spec-template.md` 是否存在。
   - 仅当文件不存在时，将插件默认模板复制到对应位置。
   - 已存在的项目级模板保持不变，不覆盖、不提示。

3. **用户修改**：
   - 如果用户提供了修改建议（即用户输入不为空），根据建议更新对应的模板。
   - 否则，询问用户是否需要对模板进行特定的修改，并根据建议更新。

4. **完成**：
   - 告知用户哪些模板已创建或更新。
   - 说明今后 code2spec 相关命令将优先使用这些项目级模板。
