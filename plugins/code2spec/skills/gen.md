---
name: code2spec-gen
description: 从现有代码生成功能规格说明文档。当用户想要为现有功能模块编写规格说明时使用此技能。
allowed-tools: [Bash, Read, Write, Glob, Grep, LSP, AskUserQuestion]
---

# 从代码生成规格说明 (code2spec gen)

此技能用于**阅读现有代码**并生成规格说明文档。它不是用于根据模糊需求创建规格说明，而是通过探索代码库找到相关代码并将其转化为结构化的规格说明。

## 用户输入

```text
$ARGUMENTS
```

## 执行流程

1. **确定代码范围**: 
   - 如果 `$ARGUMENTS` 为空，使用 `AskUserQuestion` 询问用户想要分析哪个功能模块（如："用户认证"、"支付处理"等）。
   - 如果用户提供了具体的代码路径，直接使用。
   - 否则，使用 `Glob` 和 `Grep` 探索代码库，根据功能描述查找相关的文件和目录。
   - **只有在确定了要分析的代码后才能继续**。

2. **生成简短名称**:
   - 分析功能描述，提取 2-4 个词的简短名称（如："用户认证"、"支付集成"）。

3. **初始化功能目录**:
   - 运行脚本：`python ${WAVE_SKILL_DIR}/../scripts/create-new-feature.py --json "$ARGUMENTS" --short-name "your-generated-short-name"`
   - 解析输出获取 `SPEC_FILE` 路径。

4. **加载模板**:
   - 优先检查项目根目录下 `code2spec/templates/spec-template.md`。
   - 否则使用 `${WAVE_SKILL_DIR}/../templates/spec-template.md`。

5. **探索和理解代码**:
   - 系统地阅读相关代码文件，理解模块职责、关键类/接口、数据结构和交互流程。
   - 识别关键概念：参与者、操作、数据、约束。
   - 对于不明确的方面，做出明智猜测，或使用 `[需要明确: ...]` 标记（最多 3 个）。

6. **编写规格说明**:
   - 使用模板结构将规格说明写入 `SPEC_FILE`。

7. **质量验证**:
   - 加载检查清单模板（优先项目本地，否则使用 `${WAVE_SKILL_DIR}/../templates/requirements-checklist.md`）。
   - 在 `FEATURE_DIR/checklists/requirements.md` 生成检查清单。
   - 运行验证检查，处理失败项或 `[需要明确]` 标记。

8. **报告完成**:
   - 提供规格说明文件路径和验证结果。
