---
name: skillhub
description: 从讯飞 Astron SkillHub（科大讯飞的技能注册中心，公有实例 skill.xfyun.cn，也支持客户私有化部署实例）搜索、安装、卸载、升级技能包。当用户说「装个技能」「有没有 XX 技能 / 搜一下技能库」「从 Skill Hub 装 / 卸某技能」「配一下我们内网的技能中心地址」时使用。
---

# 讯飞 Astron SkillHub：技能注册中心的前门

本技能只对接**讯飞 Astron SkillHub**（上游 `iflytek/skillhub`，官方 CLI `@astron-team/skillhub`）。别的厂商或团队自建的 skill hub 不是同一个东西——用户说的是那种时，先问清地址，不要默认连 `skill.xfyun.cn`。

SkillHub 之于技能包（`SKILL.md` 目录）如同 npm 之于包：分命名空间治理，靠 CLI 搜索与安装。本技能把 CLI 包一层，你只需要调一个脚本。

## 铁律

- **所有操作都走本技能自带的脚本**，不要自己拼 `skillhub` / `npx @astron-team/skillhub` 命令、不要直接调它的 REST API：

  ```
  node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" <command> [...args]
  ```

  脚本负责三件容易做错的事：解析生效的 registry 地址、找 CLI（本机没有就用 npx 现取）、统一 `--json` 并把结果整理成几行结论。自己拼命令会漏掉地址而默默连到公有实例。

- **不要**手改 `~/.skillhub/`（`config.json` / `credentials.json` / `inventory.json`），**不要**手写技能目录里的 `.skillhub/metadata.json`——那是安装器的记录，改坏了 `list` / `upgrade` / `remove` 都会错乱。
- 卸载用脚本的 `remove`（上游没有 `uninstall` 这个子命令）。
- 一次只做用户要的那一件事：装一个技能就装一个，不要顺手把「相关技能」一起装上。

## 第一步永远是确认地址

```
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" config
```

输出会写明当前生效的 registry、它的来源（`--registry` / 项目级配置 / 用户级配置 / 环境变量 / 内置公有实例）。

- 默认是公有实例 `https://skill.xfyun.cn`。
- **用户提到「我们内网的」「私有化部署的」「公司那个技能库（某域名）」时，先看 `config` 显示的地址对不对**。如果显示的还是 `skill.xfyun.cn`，说明没配过 —— 向用户要实例地址，再写入：

  ```
  node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" config set https://hub.example.com/skillhub --scope user
  ```

  - 用户级（默认）= `~/.wave/skillhub.json`，本人所有项目生效。
  - 项目级（`--scope project`）= `<项目>/.wave/skillhub.json`，可以提交进仓库让整个团队默认连内网实例。
  - 解析优先级：`--registry` 参数 > 项目级 > 用户级 > `SKILLHUB_REGISTRY` 环境变量 > 公有默认。临时换一次用 `--registry`，别改配置。
- **地址要带子路径前缀**。实例如果挂在 `/skillhub/` 下，地址就是 `https://hub.example.com/skillhub`，漏掉前缀会 404。
- 不要猜地址、不要用 `skill.xfyun.cn` 冒充客户实例的数据——两个实例的同名技能不是同一来源。

## 动作

### 搜索

```
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" search <关键词> [--limit 30]
```

输出形如 `namespace/slug  版本  摘要`。把**坐标原样**用于安装；用户想看的「有没有合适的」用这个回答，必要时多搜两个同义词。空关键词 `""` 可以列出实例里的技能。

### 安装

```
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" install <坐标> [--scope user|project] [--version 1.2.0]
```

- `--scope user`（默认）→ `~/.wave/skills`，所有项目可用；`--scope project` → 当前项目 `.wave/skills`，跟随仓库走。用户没说时按用途判断，并在结论里说明装到了哪一档。
- 坐标写法：`slug`（= `global` 命名空间）、`namespace/slug`、`@namespace/slug`、`namespace--slug`。搜索结果给什么就用什么。
- 只有用户明确要求「覆盖本地改动 / 重装同一个」时才加 `--force`——它会覆盖受管安装里的本地修改。
- 装完 wave 会监听技能目录，一般当前会话就能看到新技能；没出现就让用户新开一个会话（技能列表是会话启动时的快照）。

### 卸载

```
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" remove <坐标>
```

默认只删本地安装（该坐标在当前 registry 下的所有安装都删，含用户级与项目级）。删远端技能是另一件事——只有当用户明确说「从技能库里下架 / 删掉仓库里那条」时才做，且必须先跟用户确认再执行：

```
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" remove <坐标> --remote --hard
```

### 查看与升级

```
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" list
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" upgrade <坐标...> --check   # 先看计划
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" upgrade <坐标...>
```

`list` 只列当前 registry 下的安装，会标出「用户级 / 项目级 / 其他目录」和目录缺失的残留记录。升级要先 `--check` 看计划再执行，不要默认加 `--force`。

### 登录（私有实例的受限技能）

匿名只能搜到、装到公开技能。搜不到但用户确信存在、或报认证失败时，让用户跑：

```
node "${WAVE_SKILL_DIR}/scripts/skillhub.mjs" login
```

它会打印一个授权地址和设备码，必须由用户在浏览器里确认——所以这条命令要独立执行、不要接管道或丢到后台。凭据存在 `~/.skillhub/credentials.json`（按 registry 分开）。也可以用 `SKILLHUB_TOKEN` 环境变量给 CI 用；**不要把 token 写进 `.wave/skillhub.json`**（那个文件要能提交进仓库）。

## 失败怎么判

脚本会把上游退出码翻译成提示，常见三类：

- **认证（2）**：私有实例的受限技能需要先 `login`，或该账号没有这个命名空间的权限。
- **网络（3）**：地址不可达——先核对是否漏了子路径前缀、是否需要内网/VPN、自签证书是否被信任。
- **参数（5）**：坐标写法或 scope 不对。

搜不到时的处置顺序：确认 `config` 的地址 → 换关键词再搜 → 登录后再搜，而不是直接换实例或瞎装同名技能。
