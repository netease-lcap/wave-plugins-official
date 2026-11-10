#!/usr/bin/env node
/**
 * SkillHub CLI 薄封装（零依赖，只用 node 内置模块）。
 *
 * 它替 Agent 做三件容易做错的事：
 *  1. 解析 registry 地址（私有化部署的核心）：--registry > 项目级 .wave/skillhub.json
 *     > 用户级 ~/.wave/skillhub.json > 环境变量 SKILLHUB_REGISTRY > 公有实例默认值，
 *     并把结果显式传给每个子命令——不依赖 skillhub 自己那份 ~/.skillhub/config.json 状态。
 *  2. 定位 CLI：本机有 skillhub 直接用，没有就用 npx 现取（免全局安装）。
 *  3. 统一 --json，把上游 JSON 整理成几行给人/给模型看的结论；失败时翻译退出码。
 *
 * 用法：node skillhub.mjs <command> [...args] [--registry <url>]
 *
 * 命令：
 *   search <query> [--limit N]              搜索技能（按命名空间/下载量等返回坐标）
 *   install <坐标> [--scope user|project]   安装技能（默认 user → ~/.wave/skills）
 *                   [--version <v>] [--force]
 *   remove <坐标> [--remote] [--hard]       卸载本地安装（--remote 删远端技能，需认证）
 *   list                                   列出本 registry 下已安装的技能
 *   upgrade <坐标...> [--check]            升级指定技能（--check 只看计划）
 *   login                                  登录（OAuth device flow，需要终端交互）
 *   whoami                                 显示当前凭据对应的账号
 *   config [show]                          显示生效的 registry 及来源
 *   config set <url> [--scope project]     写入 registry 配置（默认写用户级）
 *   version | doctor                       透传给 CLI，原样输出
 *
 * 坐标写法：`slug`（= global 命名空间）、`namespace/slug`、`@namespace/slug`、`namespace--slug`。
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";

const DEFAULT_REGISTRY = "https://skill.xfyun.cn";
const CLI_PACKAGE = "@astron-team/skillhub";
const USER_CONFIG_PATH = join(homedir(), ".wave", "skillhub.json");
const PROJECT_CONFIG_REL = join(".wave", "skillhub.json");
const SKILLS_DIR_NAME = join(".wave", "skills");

/** 需要捕获输出后二次格式化的命令（其余命令原样透传 stdio）。 */
const PARSED_COMMANDS = new Set(["search", "install", "remove", "list", "upgrade", "whoami"]);
/** 需要交互终端（OAuth 设备码）的命令。 */
const INTERACTIVE_COMMANDS = new Set(["login"]);

const EXIT_HINTS = {
  1: "命令执行失败（generic）",
  2: "认证失败：私有实例的受限技能需要先 `login`，或配置 SKILLHUB_TOKEN",
  3: "网络错误：检查 registry 地址是否可达（含子路径前缀）",
  4: "文件系统错误：检查技能目录是否可写 / 目标路径是否被占用",
  5: "参数错误：检查命令用法（--dir 与 --scope/--agent 互斥）",
  6: "校验失败：安装记录与磁盘状态不一致，可先跑 `doctor`",
};

// ---------------------------------------------------------------- 参数解析

function parseArgv(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (token.startsWith("--") && token.length > 2) {
      const eq = token.indexOf("=");
      if (eq !== -1) {
        flags[token.slice(2, eq)] = token.slice(eq + 1);
        continue;
      }
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[token.slice(2)] = next;
        i++;
      } else {
        flags[token.slice(2)] = true;
      }
      continue;
    }
    positional.push(token);
  }
  return { positional, flags };
}

const isFlagOn = (value) => value === true || value === "true" || value === "1";

// ---------------------------------------------------------------- registry 解析

function readJsonFile(path) {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    process.stderr.write(`[warn] 配置文件不是合法 JSON，已忽略：${path}（${error.message}）\n`);
    return null;
  }
}

const normalizeRegistry = (value) => String(value).trim().replace(/\/+$/, "");

function projectConfigPath() {
  return join(process.cwd(), PROJECT_CONFIG_REL);
}

/**
 * 解析生效的 registry。
 * 优先级：--registry > 项目级配置 > 用户级配置 > SKILLHUB_REGISTRY > 公有实例。
 * @returns {{ registry: string, source: string }}
 */
function resolveRegistry(flags) {
  if (typeof flags.registry === "string" && flags.registry.trim() !== "") {
    return { registry: normalizeRegistry(flags.registry), source: "--registry 参数" };
  }
  const project = readJsonFile(projectConfigPath());
  if (project?.registry) {
    return { registry: normalizeRegistry(project.registry), source: `项目级配置 ${projectConfigPath()}` };
  }
  const user = readJsonFile(USER_CONFIG_PATH);
  if (user?.registry) {
    return { registry: normalizeRegistry(user.registry), source: `用户级配置 ${USER_CONFIG_PATH}` };
  }
  if (process.env.SKILLHUB_REGISTRY?.trim()) {
    return { registry: normalizeRegistry(process.env.SKILLHUB_REGISTRY), source: "环境变量 SKILLHUB_REGISTRY" };
  }
  return { registry: DEFAULT_REGISTRY, source: "内置默认（公有实例）" };
}

// ---------------------------------------------------------------- CLI 定位

function isExecutable(path) {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

/** 在 PATH 里找 skillhub（含 Windows 的 .cmd/.exe/.bat 变体）。 */
function findOnPath() {
  const dirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const names =
    process.platform === "win32" ? ["skillhub.cmd", "skillhub.exe", "skillhub.bat", "skillhub"] : ["skillhub"];
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (isExecutable(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * 得到可执行的调用前缀。
 * SKILLHUB_CLI 环境变量优先（可指向本机任意 skillhub 入口），否则用 PATH 上的，
 * 最后回退 npx 现取——CI / 客户机器上没装全局 CLI 也能用。
 */
function resolveCli() {
  const override = process.env.SKILLHUB_CLI?.trim();
  if (override) return { cmd: override, baseArgs: [], shell: false, label: override };

  const found = findOnPath();
  if (found) {
    const needsShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(found);
    return { cmd: found, baseArgs: [], shell: needsShell, label: found };
  }

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return {
    cmd: npx,
    baseArgs: ["-y", `${CLI_PACKAGE}@latest`],
    shell: process.platform === "win32",
    label: `npx ${CLI_PACKAGE}@latest`,
  };
}

/** shell 模式（Windows 的 .cmd 包装）下自行加引号，避免带空格的路径被拆开。 */
function quoteForShell(arg) {
  return /\s/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

function runCli(args, { capture }) {
  const cli = resolveCli();
  const allArgs = [...cli.baseArgs, ...args];
  const finalArgs = cli.shell ? allArgs.map(quoteForShell) : allArgs;
  const result = spawnSync(cli.cmd, finalArgs, {
    shell: cli.shell,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
    windowsHide: true,
  });

  if (result.error) {
    process.stderr.write(`无法执行 SkillHub CLI（${cli.label}）：${result.error.message}\n`);
    process.exit(1);
  }
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "", cli };
}

/** 从 CLI 的 stdout 里取 JSON（上游用 --json 时是纯 JSON，这里容错取最后一行 JSON）。 */
function extractJson(stdout) {
  const text = stdout.trim();
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().startsWith("{"));
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        return JSON.parse(lines[i]);
      } catch {
        /* 继续往前找 */
      }
    }
    return null;
  }
}

function failWithHint(status, stdout, stderr, cliLabel) {
  // 上游失败时也会走 --json（注意它把这份 JSON 写到 stderr，成功结果才写 stdout）
  const payload = extractJson(stderr) ?? extractJson(stdout);
  const isStructuredError = payload && payload.ok === false && typeof payload.message === "string";
  if (isStructuredError) {
    process.stderr.write(`SkillHub 返回错误：${payload.message}\n`);
    const next = payload.details?.next;
    if (typeof next === "string" && next.trim() !== "") process.stderr.write(`建议：${next}\n`);
    const registry = payload.details?.registry;
    if (typeof registry === "string") process.stderr.write(`registry：${registry}\n`);
    // 结构化错误已消费 stderr，剩下的（若有）才原样输出，避免同一段 JSON 打两遍
    const rest = stderr.replace(/\{[^\n]*\}/, "").trim();
    if (rest) process.stderr.write(`${rest}\n`);
  } else {
    const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
    process.stderr.write(`${output || "（CLI 没有输出）"}\n`);
  }

  const hint = EXIT_HINTS[status];
  if (hint) process.stderr.write(`\n[提示] ${hint}\n`);
  if (/cannot find module|not recognized|command not found|ENOENT/i.test(`${stdout}${stderr}`)) {
    process.stderr.write(`[提示] 未能拉起 SkillHub CLI（尝试的是 ${cliLabel}）：检查网络/npm 源，或用 SKILLHUB_CLI 指定入口。\n`);
  }
  process.exit(status === 0 ? 1 : status);
}

// ---------------------------------------------------------------- 输出格式化

function skillsDir(scope) {
  return scope === "project" ? resolve(process.cwd(), SKILLS_DIR_NAME) : join(homedir(), SKILLS_DIR_NAME);
}

/** 摘要按一行显示，过长截断——注册中心里的技能描述常常是整段广告。 */
function oneLine(text, max = 120) {
  const flat = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function printSearch(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) {
    process.stdout.write("没有匹配的技能。\n");
    return;
  }
  for (const item of items) {
    const coord = `${item.namespace}/${item.slug}`;
    const version = item.latestVersion ?? "-";
    process.stdout.write(`${coord}  ${version}  ${oneLine(item.summary)}\n`);
  }
  const total = payload?.total;
  if (typeof total === "number" && total > items.length) {
    process.stdout.write(`\n（共 ${total} 个结果，已显示前 ${items.length} 个；用 --limit 取更多）\n`);
  }
}

function printInstall(payload, scope) {
  const installed = Array.isArray(payload?.installed) ? payload.installed : [];
  const coord = payload ? `${payload.namespace}/${payload.slug}` : "技能";
  if (installed.length === 0) {
    process.stdout.write(`安装命令已执行，但没有任何目标目录被写入（${coord}）。\n`);
  }
  for (const target of installed) {
    process.stdout.write(`已安装 ${coord} → ${target.dir}\n`);
  }
  for (const warning of payload?.warnings ?? []) {
    process.stdout.write(`[warn] ${warning}\n`);
  }
  process.stdout.write(
    `\n范围：${scope === "project" ? `项目级（${skillsDir("project")}，跟随仓库）` : `用户级（${skillsDir("user")}，所有项目可用）`}\n` +
      "wave 会监听技能目录，一般本会话即可使用；若技能列表里还没出现，新开一个会话即可。\n",
  );
}

function printRemove(payload, coordinate) {
  const removed = Array.isArray(payload?.removed) ? payload.removed : [];
  if (removed.length === 0) {
    process.stdout.write("没有删除任何目录。\n");
    return;
  }
  for (const item of removed) {
    const verb = item.existed ? "已卸载" : "清理残留记录（目录本已不存在）";
    process.stdout.write(`${verb} ${coordinate} → ${item.dir}\n`);
  }
  process.stdout.write("\n若该技能还在当前会话的技能列表里，新开会话即消失。\n");
}

function printList(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) {
    process.stdout.write("当前 registry 下没有已安装的技能。\n");
    return;
  }
  const userDir = skillsDir("user");
  const projectDir = skillsDir("project");
  for (const item of items) {
    const coord = `${item.namespace}/${item.slug}`;
    let scopeLabel = "其他目录";
    if (item.installDir?.startsWith(projectDir)) scopeLabel = "项目级";
    else if (item.installDir?.startsWith(userDir)) scopeLabel = "用户级";
    const stale = item.status && item.status !== "ok" ? "  [目录缺失]" : "";
    process.stdout.write(`${coord}@${item.version}  ${scopeLabel}  ${item.installDir}${stale}\n`);
  }
}

// ---------------------------------------------------------------- 命令实现

function cmdConfig(positional, flags) {
  const action = positional[0] ?? "show";
  if (action === "show") {
    const { registry, source } = resolveRegistry(flags);
    process.stdout.write(`registry: ${registry}\n来源: ${source}\n`);
    process.stdout.write(`用户级配置: ${USER_CONFIG_PATH}${existsSync(USER_CONFIG_PATH) ? "" : "（不存在）"}\n`);
    const projectPath = projectConfigPath();
    process.stdout.write(`项目级配置: ${projectPath}${existsSync(projectPath) ? "" : "（不存在）"}\n`);
    process.stdout.write(
      `环境变量 SKILLHUB_REGISTRY: ${process.env.SKILLHUB_REGISTRY ?? "（未设置）"}\n` +
        `环境变量 SKILLHUB_TOKEN: ${process.env.SKILLHUB_TOKEN ? "（已设置）" : "（未设置）"}\n`,
    );
    return 0;
  }

  if (action === "set") {
    const raw = positional[1];
    if (!raw) {
      process.stderr.write("用法：config set <url> [--scope user|project]\n");
      return 5;
    }
    if (!/^https?:\/\//i.test(raw.trim())) {
      process.stderr.write("registry 必须是 http(s) 地址；子路径部署要带上前缀（如 https://hub.example.com/skillhub）。\n");
      return 5;
    }
    const registry = normalizeRegistry(raw);
    const scope = flags.scope === "project" ? "project" : "user";
    const target = scope === "project" ? projectConfigPath() : USER_CONFIG_PATH;
    const existing = readJsonFile(target) ?? {};
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify({ ...existing, registry }, null, 2)}\n`, "utf8");
    process.stdout.write(`已写入 ${scope === "project" ? "项目级" : "用户级"}配置：${target}\nregistry = ${registry}\n`);
    return 0;
  }

  process.stderr.write(`未知的 config 子命令：${action}（支持 show / set）\n`);
  return 5;
}

function main() {
  const argv = process.argv.slice(2);
  const { positional, flags } = parseArgv(argv);
  const command = positional[0];

  if (!command || command === "help" || isFlagOn(flags.help)) {
    process.stdout.write(
      "用法：node skillhub.mjs <search|install|remove|list|upgrade|login|whoami|config|version|doctor> [...args]\n" +
        "      全局参数：--registry <url>（临时覆盖配置里的地址）\n",
    );
    return command ? 0 : 5;
  }

  if (command === "config") return cmdConfig(positional.slice(1), flags);

  const { registry, source } = resolveRegistry(flags);
  process.stderr.write(`[skillhub] registry=${registry}（${source}）\n`);

  const passthrough = () => {
    // 去掉本脚本的 --registry 覆盖参数（version/doctor 不认识它），其余原样交给上游
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
      const token = argv[i];
      if (token === "--registry") {
        i++;
        continue;
      }
      if (token.startsWith("--registry=")) continue;
      rest.push(token);
    }
    return runCli(rest, { capture: false });
  };

  // 透传类：login 需要 TTY 交互，version/doctor/未知命令原样交给上游
  if (INTERACTIVE_COMMANDS.has(command) || !PARSED_COMMANDS.has(command)) {
    const { status, cli } = passthrough();
    if (status !== 0 && INTERACTIVE_COMMANDS.has(command)) failWithHint(status, "", "", cli.label);
    return status;
  }

  const args = [command];
  let scope = "user";

  switch (command) {
    case "search": {
      const query = positional[1] ?? "";
      const limit = typeof flags.limit === "string" ? flags.limit : "20";
      args.push(query, "--limit", limit);
      break;
    }
    case "install": {
      const coordinate = positional[1];
      if (!coordinate) {
        process.stderr.write("用法：install <坐标> [--scope user|project] [--version <v>] [--force]\n");
        return 5;
      }
      if (flags.scope === "project") scope = "project";
      else if (flags.scope && flags.scope !== "user") {
        process.stderr.write('--scope 只能是 "user" 或 "project"\n');
        return 5;
      }
      args.push(coordinate, "--dir", skillsDir(scope));
      if (typeof flags.version === "string") args.push("--version", flags.version);
      if (isFlagOn(flags.force)) args.push("--force");
      break;
    }
    case "remove": {
      const coordinate = positional[1];
      if (!coordinate) {
        process.stderr.write("用法：remove <坐标> [--remote [--hard]]\n");
        return 5;
      }
      args.push(coordinate);
      if (isFlagOn(flags.remote)) {
        args.push("--remote");
        if (isFlagOn(flags.hard)) args.push("--hard");
      }
      break;
    }
    case "upgrade": {
      const coordinates = positional.slice(1);
      if (coordinates.length === 0) {
        process.stderr.write("用法：upgrade <坐标...> [--check]\n");
        return 5;
      }
      args.push(...coordinates);
      if (isFlagOn(flags.check)) args.push("--check");
      break;
    }
    case "list":
      break;
    case "whoami":
      break;
  }

  args.push("--json", "--registry", registry);

  const { status, stdout, stderr, cli } = runCli(args, { capture: true });
  if (status !== 0) failWithHint(status, stdout, stderr, cli.label);

  const payload = extractJson(stdout);
  switch (command) {
    case "search":
      printSearch(payload);
      break;
    case "install":
      printInstall(payload, scope);
      break;
    case "remove":
      printRemove(payload, positional[1]);
      break;
    case "list":
      printList(payload);
      break;
    case "upgrade":
      process.stdout.write(stdout.trim() ? `${stdout.trim()}\n` : "升级计划为空。\n");
      break;
    case "whoami":
      process.stdout.write(stdout.trim() ? `${stdout.trim()}\n` : "（无输出）\n");
      break;
  }
  return 0;
}

process.exit(main());
