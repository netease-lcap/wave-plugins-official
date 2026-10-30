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
 * - 用户按 Esc 中断时引擎根本不执行 Stop hook，所以这里不需要写中断判据。
 *
 * 因此：本 hook 只做「读状态 → 判定 → 写回 / 收尾」，所有判定逻辑在
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

/** 收尾时的播报：Stop hook 只有 exit 2 能被模型看到，exit 0 的 stderr 只进日志。 */
function announce(message) {
  try {
    process.stderr.write(`${message}\n`);
  } catch {
    // 播报失败不影响「停下来」这个结果
  }
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
        `Ralph 循环已完成：命中完成条件 <promise>${result.promise}</promise>${
          result.iteration > 0 ? `（第 ${result.iteration} 轮）` : "（启动这一回合就满足了）"
        }。`,
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
      process.stderr.write(`${result.header}\n\n${result.prompt}\n`);
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
