# iflytek-skillhub

接上**讯飞 Astron SkillHub**——科大讯飞开源的技能注册中心（上游 `iflytek/skillhub`，公有实例 `skill.xfyun.cn`），npm 之于包 = SkillHub 之于 `SKILL.md` 技能包。装上本插件后，Agent 就能替你**搜索、安装、卸载、升级**技能包，且**公有实例和客户私有化部署实例都支持**。

> 名字里带 `iflytek` 是因为「skill hub」已经是通用概念——别的厂商、团队自建的技能库不是这一套（CLI 与地址都不同），装这个插件对标的只有讯飞的 Astron SkillHub。

## 装完你会得到

一个技能：`/skillhub:skillhub`（也可以直接说「搜一下有没有 XX 技能」「把这个技能装上」「我们内网那个技能库配一下」）。

它把官方 CLI `@astron-team/skillhub` 包了一层（`skills/skillhub/scripts/skillhub.mjs`），替你处理三件容易出错的事：

1. **解析生效的技能库地址**——私有化部署的地址可能带子路径、可能只在某个项目里生效；
2. **找到 CLI**——本机装了全局 `skillhub` 就用它，没有就 `npx` 现取，不用先手动 `npm i -g`；
3. **统一 JSON 输出**——把上游结果整理成几行结论，失败时把退出码翻译成人话（认证 / 网络 / 参数）。

## 地址怎么配（私有化场景的关键）

公有实例 `https://skill.xfyun.cn` 是默认值，不用配。连自己的实例：

```bash
# 用户级：本人所有项目生效
node <插件目录>/skills/skillhub/scripts/skillhub.mjs config set https://hub.example.com/skillhub --scope user

# 项目级：写 <项目>/.wave/skillhub.json，可以提交进仓库让整个团队默认连内网实例
node <插件目录>/skills/skillhub/scripts/skillhub.mjs config set https://hub.example.com/skillhub --scope project
```

也可以直接手写配置文件，格式就一个字段：

```json
{ "registry": "https://hub.example.com/skillhub" }
```

生效优先级：`--registry` 参数（临时）> 项目级 `.wave/skillhub.json` > 用户级 `~/.wave/skillhub.json` > 环境变量 `SKILLHUB_REGISTRY` > 公有默认。

两个坑：

- **实例挂在子路径时必须带上前缀**（`https://hub.example.com/skillhub`），漏了会 404。
- 私有实例的受限技能要登录：`... login`（OAuth 设备码，浏览器确认）或给 `SKILLHUB_TOKEN` 环境变量。**token 不要写进 `.wave/skillhub.json`**——那个文件是要提交进仓库的。

## 技能装到哪里

| 范围 | 目录 | 效果 |
| --- | --- | --- |
| 用户级（默认） | `~/.wave/skills/<slug>/` | 所有项目可用 |
| 项目级 | `<项目>/.wave/skills/<slug>/` | 跟随仓库，团队成员共享 |

wave 会监听这两个目录，装完一般当前会话就能用；没出现就新开一个会话（技能列表是会话启动时的快照）。卸载走 `remove`（上游没有 `uninstall` 这个子命令），会连带清掉安装器记录的 `.skillhub/metadata.json`，不会留残影。

## 命令一览

```bash
# 以下路径里的 <插件目录> 换成实际的 iflytek-skillhub 目录（技能内运行时是 ${WAVE_SKILL_DIR}/scripts/skillhub.mjs）
node <插件目录>/skills/skillhub/scripts/skillhub.mjs config [show]          # 看当前生效的地址与来源
node <插件目录>/skills/skillhub/scripts/skillhub.mjs search <关键词> [--limit N]
node <插件目录>/skills/skillhub/scripts/skillhub.mjs install <坐标> [--scope user|project] [--version v]
node <插件目录>/skills/skillhub/scripts/skillhub.mjs remove <坐标> [--remote --hard]
node <插件目录>/skills/skillhub/scripts/skillhub.mjs list
node <插件目录>/skills/skillhub/scripts/skillhub.mjs upgrade <坐标...> [--check]
node <插件目录>/skills/skillhub/scripts/skillhub.mjs login | whoami
```

坐标写法：`slug`（= `global` 命名空间）、`namespace/slug`、`@namespace/slug`、`namespace--slug`。

## 依赖

- Node ≥ 18（`node` 本身，脚本零依赖）。
- npm 可用（只在没装全局 `skillhub` 时用 `npx` 现取 `@astron-team/skillhub`）。
- 技能库地址可达（私有实例通常需要内网/VPN）。

## 上游

- 仓库：[iflytek/skillhub](https://github.com/iflytek/skillhub)（Apache-2.0），含后端、前端、CLI 与部署编排。
- 部署形态：`runtime.sh` 一键（Docker）、Docker Compose、Kubernetes/Helm 三种；关键变量是 `SKILLHUB_PUBLIC_BASE_URL`（决定实例对外地址），子路径部署还需同步 `SKILLHUB_WEB_BASE_PATH` 与 `SKILLHUB_WEB_API_BASE_URL`。
