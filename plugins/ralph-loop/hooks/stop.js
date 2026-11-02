"use strict";

/**
 * Ralph 循环的 Stop hook。
 *
 * 契约（wave agent-sdk）：
 * - stdin 是一个 JSON：{session_id, transcript_path, cwd, hook_event_name,
 *   last_assistant_message}，Stop 事件独有 last_assistant_message；
 * - `process.stderr.write(text)` + `process.exit(2)` = 阻止停止，stderr 作为一条
 *   meta user message 注入会话后重开一轮（模型看得到，UI 不显示）；
 * - `exit 0` = 放行，正常结束这一回合；
 * - stdout 打一行 `{"systemMessage": "..."}` = 在对话里给**用户**显示一行提示
 *   （模型看不到）。exit 0 / exit 2 都认这个字段。
 * - 用户按 Esc 中断时引擎根本不执行 Stop hook，所以这里不需要写中断判据。
 *
 * 两套播报渠道各管一头，不要混：模型只认 exit 2 的 stderr，用户只认 stdout 的
 * `systemMessage`。stdout 那行对老客户端（不认识 `systemMessage` 的版本）是纯噪音
 * ——它们整个忽略 Stop hook 的 stdout，所以 exit code 与回喂契约必须一个字都不动。
 *
 * 因此：本 hook 只做「读状态 → 判定 → 写回 / 收尾」，所有判定逻辑与文案在
 * lib/loop.js 里（纯函数，自测直接覆盖）。
 */

const fs = require("fs");
const {
  parseStateText,
  formatStateText,
  readStateFile,
  writeStateFile,
  deleteStateFile,
} = require("../lib/state.js");
const { evaluate } = require("../lib/loop.js");

/** Stop hook 的 stdin 是一个 JSON；读不出来就当没有（放行）。 */
function readInput() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * 状态文件该在哪个目录找。
 *
 * 正常情况就是 hook 输入里的 cwd。但 cwd 会随模型 `cd` 漂移，所以约定位置找不到
 * 时再回退到 WAVE_PROJECT_DIR（引擎注入的会话根目录）；都没有才算「没有循环」。
 */
function resolveCwd(input) {
  const candidates = [input.cwd, process.env.WAVE_PROJECT_DIR].filter(
    (value) => typeof value === "string" && value.trim(),
  );
  for (const candidate of candidates) {
    if (readStateFile(candidate) !== null) return { cwd: candidate, found: true };
  }
  return { cwd: candidates[0] || process.cwd(), found: false };
}

/**
 * 往 stdout 打一行 `{"systemMessage": ...}`：wave 会在对话里把这条文案显示给用户
 * （模型看不到它）。写在 stdout 而不是塞进 exit 2 的 stderr，是因为两者受众不同：
 * stderr 是喂给模型的正文，`systemMessage` 是给用户的状态播报。
 */
function emitSystemMessage(message) {
  try {
    process.stdout.write(`${JSON.stringify({ systemMessage: message })}\n`);
  } catch {
    // 播报失败不影响判定结果（尤其不能影响 exit 2 的回喂）
  }
}

/** 收尾时的播报：stdout 给用户看，stderr 照旧写进 hook 日志。 */
function announce(message) {
  try {
    process.stderr.write(`${message}\n`);
  } catch {
    // 播报失败不影响「停下来」这个结果
  }
  emitSystemMessage(message);
}

function main() {
  const input = readInput();

  // 只处理 Stop；SubagentStop 不接管（子代理里的循环语义不同，别混）。
  if (input.hook_event_name && input.hook_event_name !== "Stop") return;

  const resolved = resolveCwd(input);
  if (!resolved.found) return; // 1. 没有状态文件 → 放行

  const text = readStateFile(resolved.cwd);
  if (text === null) return;

  const parsed = parseStateText(text);
  if (!parsed.ok) {
    // 连 frontmatter 都读不出来：删掉，别让它一直卡住这个会话。
    deleteStateFile(resolved.cwd);
    announce(`Ralph 循环已结束：状态文件无法解析（${parsed.reason}），已删除。`);
    return;
  }

  const result = evaluate({
    meta: parsed.meta,
    body: parsed.body,
    sessionId: input.session_id,
    lastAssistantMessage: input.last_assistant_message,
  });

  switch (result.action) {
    case "dirty":
      deleteStateFile(resolved.cwd);
      announce(`Ralph 循环已结束：状态文件不合法（${result.reason}），已删除。`);
      return;

    case "limit":
      deleteStateFile(resolved.cwd);
      announce(
        `Ralph 循环已结束：已到 ${result.maxIterations} 轮上限（第 ${result.iteration} 轮后停下）。`,
      );
      return;

    case "complete":
      deleteStateFile(resolved.cwd);
      announce(
        `Ralph 循环已完成：命中完成条件 <promise>${result.promise}</promise>（第 ${result.iteration} 轮）。`,
      );
      return;

    case "continue": {
      writeStateFile(
        resolved.cwd,
        formatStateText(
          {
            iteration: result.iteration,
            maxIterations: parsed.meta.max_iterations,
            completionPromise: parsed.meta.completion_promise,
            // 空 session_id 在这里认领，之后别的会话不会再接手这个循环
            sessionId: result.adoptSession
              ? input.session_id
              : parsed.meta.session_id,
          },
          parsed.body.replace(/\s+$/, ""),
        ),
      );
      // 回喂契约：stderr + exit 2，一个字都不能动（老客户端就靠它继续循环）。
      process.stderr.write(`${result.header}\n\n${result.prompt}\n`);
      // 用户那一行是额外增量，与上面这行的先后顺序无关。
      emitSystemMessage(result.systemMessage);
      process.exit(2);
      return;
    }

    default:
      // pass：没有循环 / 别的会话的循环
      return;
  }
}

try {
  main();
} catch (error) {
  // hook 自己出问题时永远放行：卡住用户的会话比漏掉一轮糟得多。
  announce(
    `Ralph 循环 hook 异常，已放行：${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(0);
}
