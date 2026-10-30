#!/usr/bin/env node
/**
 * 校验插件市场数据的一致性（零依赖，只用 node 内置模块）。
 *
 * 5 条校验：
 *  (a) .wave-plugin/marketplace.json 可解析，plugins 是非空数组
 *  (b) 本地源（./plugins/ 开头）：目录存在 + 有 .wave-plugin/plugin.json +
 *      plugin.json 的 name == 目录名 == 市场条目 name
 *  (c) plugins/ 下每个目录都在市场里注册过（http/git@/ssh 开头的源视为外部，不算本地缺失）
 *  (d) README「目录结构」代码块里的 plugins 子目录集合 == plugins/ 实际子目录集合
 *  (e) README「插件列表」表格的插件名集合 == 市场全部条目名集合
 *
 * 全过：打印 PASS，退出码 0；否则打印 FAIL + 明细，退出码 1。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARKETPLACE_FILE = path.join(ROOT, '.wave-plugin', 'marketplace.json');
const README_FILE = path.join(ROOT, 'README.md');
const PLUGINS_DIR = path.join(ROOT, 'plugins');
const LOCAL_PREFIX = './plugins/';
const EXTERNAL_SOURCE_RE = /^(https?:\/\/|git@|ssh:\/\/)/;

const failures = [];
const rel = (p) => path.relative(ROOT, p) || '.';
const fail = (check, message) => failures.push(`[${check}] ${message}`);

/** 读取目录下的子目录名（字母序，跳过隐藏目录与普通文件） */
function listSubdirs(dir) {
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

const sorted = (set) => [...set].sort();

/** 打印两个集合的差集明细 */
function diffDetail(label, actualSet, expectedSet) {
  const extra = sorted(actualSet).filter((x) => !expectedSet.has(x));
  const missing = sorted(expectedSet).filter((x) => !actualSet.has(x));
  const parts = [];
  if (missing.length) parts.push(`${label}缺少: ${missing.join(', ')}`);
  if (extra.length) parts.push(`${label}多出: ${extra.join(', ')}`);
  return parts.join('；');
}

// ---------------------------------------------------------------- 读取市场注册表
let marketplace = null;
try {
  marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, 'utf8'));
} catch (err) {
  fail('a', `无法解析 ${rel(MARKETPLACE_FILE)}: ${err.message}`);
}
if (marketplace !== null) {
  if (!Array.isArray(marketplace.plugins)) {
    fail('a', `${rel(MARKETPLACE_FILE)} 的 plugins 不是数组（实际类型: ${typeof marketplace.plugins}）`);
    marketplace = null;
  } else if (marketplace.plugins.length === 0) {
    fail('a', `${rel(MARKETPLACE_FILE)} 的 plugins 是空数组`);
    marketplace = null;
  } else {
    marketplace.plugins.forEach((entry, i) => {
      const where = `plugins[${i}]`;
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        fail('a', `${where} 不是对象: ${JSON.stringify(entry)}`);
        return;
      }
      if (typeof entry.name !== 'string' || entry.name.trim() === '') {
        fail('a', `${where}.name 缺失或不是非空字符串: ${JSON.stringify(entry.name)}`);
      }
      if (typeof entry.source !== 'string' || entry.source.trim() === '') {
        fail('a', `${where}.source 缺失或不是非空字符串: ${JSON.stringify(entry.source)}`);
      }
    });
    // 名称重复也会让集合比较失真，这里单独报出来
    const seen = new Map();
    for (const entry of marketplace.plugins) {
      if (typeof entry?.name !== 'string') continue;
      seen.set(entry.name, (seen.get(entry.name) ?? 0) + 1);
    }
    for (const [name, count] of seen) {
      if (count > 1) fail('a', `plugins 里 name="${name}" 重复出现 ${count} 次`);
    }
  }
}

// ---------------------------------------------------------------- (b) 本地源校验
const actualPluginDirs = listSubdirs(PLUGINS_DIR) ?? [];
const registeredLocalDirs = new Set();

if (marketplace) {
  for (const entry of marketplace.plugins) {
    if (entry === null || typeof entry !== 'object' || typeof entry.source !== 'string') continue;
    const source = entry.source.trim();

    if (EXTERNAL_SOURCE_RE.test(source)) continue; // 外部 Git 源，跳过本地校验
    if (!source.startsWith(LOCAL_PREFIX)) {
      fail('b', `条目 name="${entry.name}" 的 source="${source}" 既不是本地 ${LOCAL_PREFIX}* 也不是外部 Git 源`);
      continue;
    }

    const normalized = path.posix.normalize(source); // ./plugins/x -> plugins/x
    if (!normalized.startsWith('plugins/') || normalized === 'plugins/') {
      fail('b', `条目 name="${entry.name}" 的 source="${source}" 没有指向 plugins/ 下的具体目录`);
      continue;
    }
    const dirName = normalized.slice('plugins/'.length).replace(/\/$/, '');
    registeredLocalDirs.add(dirName);

    // 允许 ./plugins/a/b 这种多级路径（此时目录名取末级）
    const pluginDir = path.join(ROOT, normalized);
    if (!fs.existsSync(pluginDir) || !fs.statSync(pluginDir).isDirectory()) {
      fail('b', `条目 name="${entry.name}" 的 source="${source}" 指向的目录不存在`);
      continue;
    }

    const manifestPath = path.join(pluginDir, '.wave-plugin', 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      fail('b', `${dirName} 缺少 .wave-plugin/plugin.json`);
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      fail('b', `${dirName}/.wave-plugin/plugin.json 不是合法 JSON: ${err.message}`);
      continue;
    }

    const expectedName = path.posix.basename(dirName);
    if (manifest.name !== expectedName) {
      fail('b', `${dirName}/.wave-plugin/plugin.json 的 name="${manifest.name}"，与目录名 "${expectedName}" 不一致`);
    }
    if (manifest.name !== entry.name) {
      fail('b', `${dirName}/.wave-plugin/plugin.json 的 name="${manifest.name}"，与市场条目 name="${entry.name}" 不一致`);
    }
  }
}

// ---------------------------------------------------------------- (c) plugins/ 目录都已注册
if (marketplace) {
  const unregistered = actualPluginDirs.filter((d) => !registeredLocalDirs.has(d));
  if (unregistered.length) {
    fail(
      'c',
      `plugins/ 下这些目录未在市场注册（缺 ${LOCAL_PREFIX}<name> 条目）: ${unregistered.join(', ')}`,
    );
  }
  const ghost = sorted(registeredLocalDirs).filter((d) => !actualPluginDirs.includes(d));
  if (ghost.length) {
    fail('c', `市场注册了本地目录但 plugins/ 下没有: ${ghost.join(', ')}`);
  }
}

// ---------------------------------------------------------------- 解析 README
let readme = null;
try {
  readme = fs.readFileSync(README_FILE, 'utf8');
} catch (err) {
  fail('d', `无法读取 ${rel(README_FILE)}: ${err.message}`);
  fail('e', `无法读取 ${rel(README_FILE)}: ${err.message}`);
}

/** 取出某个 `## 标题` 之后的第一段 ``` 代码块内容 */
function codeBlockAfterHeading(text, headingPattern) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start === -1) return { error: `找不到标题 ${headingPattern}` };
  let fenceStart = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break; // 到了下一个同级标题
    if (/^\s*```/.test(lines[i])) {
      fenceStart = i;
      break;
    }
  }
  if (fenceStart === -1) return { error: `标题 ${headingPattern} 之后没有代码块` };
  const body = [];
  for (let i = fenceStart + 1; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) return { text: body.join('\n') };
    body.push(lines[i]);
  }
  return { error: `标题 ${headingPattern} 的代码块没有闭合` };
}

/** 从目录树代码块里取 plugins/ 下的直接子目录集合 */
function structurePluginDirs(treeText) {
  const lines = treeText.split('\n');
  const entryRe = /^([\s│]*)(?:├──|└──|`--|\|--)\s*(.+?)\s*$/;
  const pluginsIdx = lines.findIndex((line) => {
    const m = line.match(entryRe);
    return m && m[2].replace(/\s+#.*$/, '').replace(/\/$/, '').trim() === 'plugins';
  });
  if (pluginsIdx === -1) return { error: '目录树里找不到 plugins/ 这一行' };

  const baseDepth = lines[pluginsIdx].match(entryRe)[1].length;
  const dirs = new Set();
  for (let i = pluginsIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(entryRe);
    if (!m) {
      if (lines[i].trim() === '') continue;
      continue; // 注释行/空行不影响
    }
    const depth = m[1].length;
    if (depth <= baseDepth) break; // 回到 plugins 的同级或更上层
    const label = m[2].replace(/\s+#.*$/, '').trim();
    if (label.endsWith('/')) dirs.add(label.replace(/\/$/, ''));
  }
  return { dirs };
}

/** 从插件列表表格里取插件名集合（第一列，去掉 ** 加粗） */
function tablePluginNames(readmeText) {
  const lines = readmeText.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+插件列表/.test(line));
  if (start === -1) return { error: '找不到标题「## 插件列表」' };

  const names = new Set();
  let rowCount = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) break;
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
    const first = (cells[0] ?? '').trim();
    if (first === '' || /^:?-{2,}:?$/.test(first)) continue; // 分隔行
    if (/^插件$/.test(first)) continue; // 表头
    const name = first.replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (name) {
      names.add(name);
      rowCount += 1;
    }
  }
  if (rowCount === 0) return { error: '「插件列表」表格里没有插件行' };
  return { names };
}

if (readme !== null) {
  // ---- (d)
  const block = codeBlockAfterHeading(readme, /^##\s+目录结构\s*$/);
  if (block.error) {
    fail('d', block.error);
  } else {
    const parsed = structurePluginDirs(block.text);
    if (parsed.error) {
      fail('d', parsed.error);
    } else {
      const actual = new Set(actualPluginDirs);
      if (diffDetail('目录结构', parsed.dirs, actual)) {
        fail('d', `README 目录结构里的 plugins 子目录与 plugins/ 实际不一致 —— ${diffDetail('目录结构', parsed.dirs, actual)}`);
      }
    }
  }

  // ---- (e)
  const table = tablePluginNames(readme);
  if (table.error) {
    fail('e', table.error);
  } else if (!marketplace) {
    fail('e', '无法比对：市场注册表不可用');
  } else {
    const marketplaceNames = new Set(
      marketplace.plugins.filter((e) => typeof e?.name === 'string').map((e) => e.name),
    );
    const detail = diffDetail('插件列表', table.names, marketplaceNames);
    if (detail) fail('e', `README 插件列表与市场条目不一致 —— ${detail}`);
  }
}

// ---------------------------------------------------------------- 汇总
if (failures.length === 0) {
  console.log(
    `PASS  市场 ${marketplace?.plugins.length ?? 0} 条；本地插件 ${actualPluginDirs.length} 个；README 目录结构与插件列表均一致`,
  );
  process.exit(0);
}

console.log(`FAIL  ${failures.length} 处问题：`);
for (const line of failures) console.log(`  - ${line}`);
process.exit(1);
