"use strict";

/**
 * Ralph 循环的状态文件：读写、解析、原子更新。
 *
 * 路径固定为 `<cwd>/.wave/ralph-loop.local.md`，frontmatter 存循环参数，
 * 正文就是原始 prompt（一字不改）。hook 与 setup 脚本共用这一份实现，
 * 避免两处解析器漂移。
 *
 * 刻意零依赖：hook 作为普通 node 进程跑在用户仓库里，除了 node 本身不能假设
 * 任何东西存在（与同仓 security-guidance 的 lib.js 同一约定）。
 */

const fs = require("fs");
const path = require("path");

/** 相对 cwd 的状态文件路径。 */
const STATE_REL_PATH = path.join(".wave", "ralph-loop.local.md");

/** frontmatter 里我们认的键，其余键读到时忽略。 */
const STATE_KEYS = [
  "iteration",
  "max_iterations",
  "completion_promise",
  "session_id",
];

function statePath(cwd) {
  return path.join(cwd, STATE_REL_PATH);
}

/** 反引号风格的标量：写的时候用 JSON.stringify，读回来用 JSON.parse。 */
function unquote(raw) {
  const value = String(raw == null ? "" : raw).trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return String(JSON.parse(value));
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * 解析状态文件文本。
 * @returns {{ok: true, meta: object, body: string} | {ok: false, reason: string}}
 */
function parseStateText(text) {
  const normalized = String(text == null ? "" : text)
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines[0].trim() !== "---") {
    return { ok: false, reason: "缺少 frontmatter 起始行" };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    return { ok: false, reason: "frontmatter 没有结束行" };
  }

  const meta = {};
  for (const line of lines.slice(1, endIndex)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      return { ok: false, reason: `frontmatter 行无法解析：${line.trim()}` };
    }
    const key = line.slice(0, colon).trim();
    if (!STATE_KEYS.includes(key)) continue;
    meta[key] = unquote(line.slice(colon + 1));
  }

  return { ok: true, meta, body: lines.slice(endIndex + 1).join("\n") };
}

/**
 * 生成状态文件文本。正文按原样写入，只在缺失时补一个结尾换行。
 */
function formatStateText(
  { iteration, maxIterations, completionPromise, sessionId },
  prompt,
) {
  const body = String(prompt == null ? "" : prompt);
  return [
    "---",
    `iteration: ${Number(iteration) || 0}`,
    `max_iterations: ${Number(maxIterations) || 0}`,
    `completion_promise: ${JSON.stringify(String(completionPromise || ""))}`,
    `session_id: ${JSON.stringify(String(sessionId || ""))}`,
    "---",
    body.endsWith("\n") ? body : `${body}\n`,
  ].join("\n");
}

/** 读状态文件；不存在返回 null。 */
function readStateFile(cwd) {
  try {
    return fs.readFileSync(statePath(cwd), "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * 原子写：先写同目录临时文件再 rename，避免 hook 与 setup 并发时读到半个文件
 * （rename 在同一文件系统内是原子的）。
 */
function writeStateFile(cwd, text) {
  const target = statePath(cwd);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = path.join(
    path.dirname(target),
    `.ralph-loop.local.md.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    fs.writeFileSync(tmp, text, "utf8");
    fs.renameSync(tmp, target);
  } catch (error) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // 清理失败不影响主流程
    }
    throw error;
  }
}

/** 删状态文件；不存在也算成功。 */
function deleteStateFile(cwd) {
  try {
    fs.unlinkSync(statePath(cwd));
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

module.exports = {
  STATE_REL_PATH,
  STATE_KEYS,
  statePath,
  parseStateText,
  formatStateText,
  readStateFile,
  writeStateFile,
  deleteStateFile,
};
