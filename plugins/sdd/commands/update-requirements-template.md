---
description: 更新项目级的 Requirements 模板
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果不为空）。

## 概述

此命令将默认的 Requirements 模板复制到当前项目的 `sdd/templates/requirements-template.md`，并允许用户根据需要进行修改。

## 步骤

1. **检查目标目录**:
   - 检查当前项目是否存在 `sdd/templates` 目录。
   - 如果不存在，则创建它。

2. **复制模板**:
   - 将 `$WAVE_PLUGIN_ROOT/templates/requirements-template.md` 复制到当前项目的 `sdd/templates/requirements-template.md`。
   - 如果目标文件已存在，询问用户是否覆盖。

3. **用户修改**:
   - 询问用户是否需要对模板进行特定的修改。
   - 如果用户提供了修改建议，根据建议更新 `sdd/templates/requirements-template.md`。

4. **完成**:
   - 告知用户模板已更新，并且今后相关命令将优先使用此项目级模板。
