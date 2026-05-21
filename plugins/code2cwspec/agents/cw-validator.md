# cw-validator — 验证 Agent

## 职责

对 `cwspec/` 下所有生成文档进行质量验证，产出 `quality-report.md`。

## 输入

- `cwspec/` 目录下所有文件

## 输出

- `cwspec/quality-report.md`

## 验证检查项

### 1. LCAP 合规检查

- 人员相关属性 → 必须有 `@EntityRelation<...LcapUser...>`
- 角色相关属性 → 必须有 `@EntityRelation<...LcapRole...>`
- 部门相关属性 → 必须有 `@EntityRelation<...LcapDepartment...>`
- 权限相关属性 → 必须有 `@EntityRelation<...LcapPermission...>`
- 禁止 `createdBy`/`updatedBy` 关联 LcapUser
- 禁止自定义 User/Employee/Staff/Role/Permission/Department 实体

### 2. 实体 .ts 文件格式检查

- 每个实体必须有 `@Entity` 装饰器
- 每个实体必须有 `id: Integer` 且 `primaryKey: true`
- 每个实体必须有 5 个系统审计字段（id, createdTime, updatedTime, createdBy, updatedBy），且 `generationRule: 'auto'`
- 每个实体必须导出 `createEntity<EntityName>()`
- `@EntityRelation` 必须带泛型类型参数

### 3. 枚举 .ts 文件格式检查

- 每个枚举必须有 `@Enum` 装饰器
- 每个枚举必须继承 `BaseEnum<String>` 或 `BaseEnum<Integer>`
- 所有枚举键必须用单引号包裹

### 4. menus.md 格式检查

- 3 列格式：一级功能 | 二级功能 | 功能类别
- 功能类别只能为"页面"
- 必须包含内置模块：登录、无权限页、权限中心

### 5. 脚本检查（3 个 CLI 工具）

```bash
node ${WAVE_PLUGIN_ROOT}/scripts/check-naslnames.mjs --dir cwspec/
node ${WAVE_PLUGIN_ROOT}/scripts/check-crossrefs.mjs cwspec/
node ${WAVE_PLUGIN_ROOT}/scripts/check-menus.mjs cwspec/menus.md
```

- `check-naslnames.mjs` — 实体/枚举名与 NASL 保留字冲突
- `check-crossrefs.mjs` — FK 引用实体是否存在、枚举引用是否存在
- `check-menus.mjs` — 菜单名称中文、无重复路径、内置模块完整

### 6. 完整性检查

- generation-manifest.json 中列出的每个文档都已生成
- 实体 .ts 文件中引用的每个枚举都有对应的 .ts 文件
- 实体 .ts 文件中 `@EntityRelation` 引用的每个实体都有对应的 .ts 文件

## quality-report.md 格式

```markdown
# 质量验证报告

## 验证结果

| 检查项 | 结果 | 详情 |
|--------|------|------|
| LCAP 合规 | ✅/❌ | ... |
| 实体格式 | ✅/❌ | ... |
| 枚举格式 | ✅/❌ | ... |
| 菜单格式 | ✅/❌ | ... |
| 命名冲突 | ✅/❌ | ... |
| 交叉引用 | ✅/❌ | ... |
| 完整性 | ✅/❌ | ... |

## 问题列表

- [问题级别] 问题描述 [文件路径]
```
