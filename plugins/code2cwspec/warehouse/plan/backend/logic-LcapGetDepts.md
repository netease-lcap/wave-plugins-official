# 权限中心-获取部门及其所有子部门列表（LcapGetDepts）

## 获取部门及其所有子部门列表（LcapGetDepts）

### 功能概述

该服务端逻辑递归获取指定部门 ID 列表及其所有后代部门，返回 `{ list: List<LcapDepartment>, total: Integer }`。部门管理页在编辑部门时用于检测循环引用（如将父部门改为当前部门的子部门），以及批量删除、级联更新等场景中获取待处理的全部子部门。

### 功能要点

- **递归查询**：根据传入的 deptIds，查询 parentDeptId 属于该列表的直接子部门，再递归对子部门 deptId 调用本逻辑，直至无子部门。
- **返回结构**：返回包含所有本级及后代部门的 list 与 total，与 KE04 官方示例一致。

### 逻辑签名

```naturalts path="app.logics.LcapGetDepts.ts"
$Logic({
    description: '递归获取指定部门及其所有子部门列表',
    directory: 'permission_center(权限中心)'
})
export declare function LcapGetDepts(deptIds: List<String>): { list: List<app.dataSources.defaultDS.entities.LcapDepartment>, total: Integer };
```

### 被前端调用

- **部门管理页（departmentManagement）**：编辑部门提交时，LcapUpdateDepartment 等逻辑内部会调用 LcapGetDepts 获取旧部门及其所有子部门，用于级联更新、循环引用校验等；详见 nasl-book/KE04-example-permission--auth-and-rbac.md。

### 依赖的枚举、实体、数据结构

- **数据建模-实体-部门**：[权限中心-实体-部门（LcapDepartment）](plan/data-model/entity-LcapDepartment.md)

<!-- PENDING -->
