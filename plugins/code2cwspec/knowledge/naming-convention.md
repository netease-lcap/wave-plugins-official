# 文件命名规范

## 通用格式

```
[中文描述]-[子类型]-[中文名]（[英文名]）.md
```

## 各类型命名规则

### 索引文件
使用描述性中文名，不使用 `index.md`：
- `技术设计大纲.md`（不是 `index.md`）
- `应用架构设计.md`（不是 `application-structure/index.md`）
- `数据建模设计.md`（不是 `data-model/index.md`）
- `业务模块设计.md`（不是 `frontend/index.md`）
- `依赖与集成设计.md`（不是 `integration/index.md`）
- `规范需求大纲.md`（不是 `requirements/index.md`）

### 实体文件
格式：`[归属子域]-实体-[中文名]（英文名）.md`
- 示例：`客户管理-实体-客户（Customer）.md`
- 示例：`权限中心-实体-用户（LcapUser）.md`

### 视图文件
格式：`[一级功能]-[中文名]（英文名）.md`
- 示例：`客户管理-客户列表（customerList）.md`
- 示例：`权限中心-登录页（login）.md`
- 示例：`首页（dashboard）.md`（仅一级功能为"首页"时省略前缀）

### ER 图
`数据建模-实体关系总览图.md`

### 枚举
`数据建模-枚举.md`

### 模块需求
`[模块中文名].md`（去掉 `module-` 前缀）
- 示例：`客户管理.md`（不是 `module-customer-management.md`）

### 路由
`业务模块-层级路由.md`

### 核心领域
`应用架构-核心领域划分.md`

### 服务
`应用架构-关键服务集成.md`

### 菜单
`功能模块目录.md`

### UI 规范
`UI_UE 规范.md`（下划线+空格，匹配基准格式）

## 特殊字符

- `（）`（全角括号）用于文件名中的英文别名
- `-`（连字符）作为中文描述段之间的分隔符
- ` `（空格）在基准使用时允许（如 `UI_UE 规范.md`）

## 完整路径映射

| 旧路径（kebab-case） | 新路径（中文+英文） |
|---|---|
| `plan/index.md` | `plan/技术设计大纲.md` |
| `plan/ui-design.md` | `plan/UI_UE 规范.md` |
| `plan/application-structure/index.md` | `plan/application-structure/应用架构设计.md` |
| `plan/application-structure/cores.md` | `plan/application-structure/应用架构-核心领域划分.md` |
| `plan/application-structure/services.md` | `plan/application-structure/应用架构-关键服务集成.md` |
| `plan/data-model/index.md` | `plan/data-model/数据建模设计.md` |
| `plan/data-model/er-diagram.md` | `plan/data-model/数据建模-实体关系总览图.md` |
| `plan/data-model/enums.md` | `plan/data-model/数据建模-枚举.md` |
| `plan/data-model/entity-[name].md` | `plan/data-model/[子域]-实体-[中文名]（英文名）.md` |
| `plan/frontend/index.md` | `plan/frontend/业务模块设计.md` |
| `plan/frontend/routes.md` | `plan/frontend/业务模块-层级路由.md` |
| `plan/frontend/view-[name].md` | `plan/frontend/[一级功能]-[中文名]（英文名）.md` |
| `plan/backend/` | **已删除** |
| `plan/integration/index.md` | `plan/integration/依赖与集成设计.md` |
| `tasks/` | **已删除** |
| `requirements/index.md` | `requirements/规范需求大纲.md` |
| `requirements/persistent/menus.md` | `requirements/persistent/功能模块目录.md` |
| `requirements/standard/module-[name].md` | `requirements/standard/[模块中文名].md` |
