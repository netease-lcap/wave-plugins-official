# SDD 插件

**Software Design & Documentation** - 软件设计与文档工具集

## 快速开始

```bash
# 方式 1: 只提供功能描述，让 AI 自动查找代码
/code2spec 用户认证模块

# 方式 2: 提供功能描述和代码路径
/code2spec 用户认证模块 src/auth
```

## 插件结构

```
sdd/
├── .wave-plugin/
│   └── plugin.json            # 插件元数据
├── commands/
│   └── code2spec.md          # /code2spec 命令定义
├── scripts/
│   └── create-new-feature.py # Python 脚本（跨平台）
├── templates/
│   └── spec-template.md      # 中文规格说明模板
└── README.md                 # 完整文档
```

## 核心功能

1. **从现有代码生成规格说明**
   - 接收功能描述（可选提供代码路径）
   - 自动探索或直接分析相关代码
   - 生成结构化文档

2. **自动化工作流**
   - 创建 Git 分支
   - 初始化文档结构
   - 生成质量检查清单

3. **质量保证**
   - 最多 3 个关键澄清问题
   - 自动验证文档完整性
   - 记录假设和依赖

4. **跨平台支持**
   - Python 脚本（不依赖 Bash）
   - Windows、Linux、macOS 兼容
   - 支持中文文件名和内容

## 为什么叫 SDD

SDD = Software Design & Documentation

这个名称为将来的扩展预留了空间：
- 当前：从代码生成规格说明
- 未来：架构图、API 文档、测试用例、ADR 等

## 详细文档

请参考 [README.md](./README.md) 获取完整文档。
