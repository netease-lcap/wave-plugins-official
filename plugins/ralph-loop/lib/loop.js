"use strict";

/**
 * Ralph 循环的判定逻辑（纯函数，不碰 IO）。
 *
 * 只在 Stop hook 里用：agent 想停下时，根据状态文件决定「放行」「继续」还是
 * 「收尾」。判定顺序是任务书定的，改顺序等于改语义：
 *
 *   1. 没有状态文件        → 放行（本来就没有循环）
 *   2. session_id 不匹配   → 放行（同项目里别的会话不能被卡住）
 *   3. 状态文件脏          → 删文件 + 播报 + 放行（宁可停，也不要死循环）
 *   4. 到达 iteration 上限 → 删文件 + 播报 + 放行
 *   5. 完成标记命中        → 删文件 + 播报 + 放行
 *   6. 其余                → iteration+1 写回 + 把 prompt 喂回去（继续）
 *
 * 轮次语义与 Claude Code 的 stop-hook.sh 逐字对齐：
 *
 *   - `iteration` 是「当前这一回合的序号」，启动时就是 1（首个回合算第 1 轮）；
 *   - 判据在自增**之前**：`iteration >= max_iterations` ⇒ 收尾，不再喂回；
 *   - 否则 `iteration + 1` 写回，并把 **新** 序号写进提示行（第一次回喂显示「第 2 轮」，
 *     同 CC 的 `Ralph iteration $NEXT_ITERATION`）。
 *
 * 所以 `--max-iterations N` = 总共 N 个回合（含首回合）= N-1 次回喂。
 * 别把 iteration 的起点改成 0 —— 那会让同一个 N 多喂一轮，与 CC 不兼容。
 */

const CANCEL_COMMAND = "/ralph-loop:cancel-ralph";

/** 完成标记比较前的归一：去首尾空白，内部连续空白压成一个空格。 */
function normalizePromiseText(text) {
  return String(text == null ? "" : text)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 取最后一条 assistant 消息里的第一个 `<promise>…</promise>`。
 * 没有就返回 null（不是空串：空串会被误当成「完成条件是空」而永远命中）。
 */
function extractPromise(lastAssistantMessage) {
  if (typeof lastAssistantMessage !== "string" || !lastAssistantMessage) {
    return null;
  }
  const match = lastAssistantMessage.match(/<promise>([\s\S]*?)<\/promise>/);
  return match ? normalizePromiseText(match[1]) : null;
}

/** 严格整数解析：只认 `/^\d+$/`，避免 "3abc" / "1.5" 被当成数字。 */
function parseUnsigned(value) {
  const text = String(value == null ? "" : value).trim();
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

/**
 * 喂回去的正文开头那一行。
 *
 * wave 没有 CC 的 `systemMessage` 通道，Stop hook 唯一能让模型看见的通道就是
 * exit 2 的 stderr，所以「第几轮 / 怎么结束」必须写进正文本身，否则模型既不知道
 * 自己处在循环里，也不知道该怎么退出。
 */
function buildIterationHeader(iteration, { maxIterations, completionPromise }) {
  const parts = [`🔄 Ralph 第 ${iteration} 轮`];
  const promise = normalizePromiseText(completionPromise);
  if (promise) {
    parts.push(
      `完成条件：输出 <promise>${promise}</promise>（只有真的达成才输出，不要为了退出而谎报）`,
    );
    if (maxIterations > 0) {
      parts.push(`最多 ${maxIterations} 轮，本轮是第 ${iteration} 轮`);
    }
  } else if (maxIterations > 0) {
    parts.push(`未设完成条件，循环会一直跑到第 ${maxIterations} 轮上限`);
  } else {
    parts.push(`未设完成条件，循环会一直跑到你手动 ${CANCEL_COMMAND}`);
  }
  parts.push(`想停就 ${CANCEL_COMMAND}`);
  return parts.join(" | ");
}

/**
 * 判定本回合该不该停下来。
 *
 * @param {object} input
 * @param {object|null} input.meta  已解析的 frontmatter（null = 没有状态文件）
 * @param {string} input.body       状态文件正文（原始 prompt）
 * @param {string} input.sessionId  当前会话 id（hook stdin 的 session_id）
 * @param {string|undefined} input.lastAssistantMessage
 * @returns {{action: string, ...}}
 *   - {action:"pass", reason}                     exit 0，状态原样保留
 *   - {action:"dirty", reason}                    删文件 + 播报 + exit 0
 *   - {action:"limit", iteration, maxIterations}  到上限
 *   - {action:"complete", promise}                完成标记命中
 *   - {action:"continue", iteration, header, prompt, adoptSession} 继续
 */
function evaluate(input) {
  const { meta, body, sessionId, lastAssistantMessage } = input;

  if (!meta) {
    return { action: "pass", reason: "没有状态文件" };
  }

  // 2. 会话隔离：状态属于哪个会话，就只让那个会话循环。
  //    空 session_id 表示「还没认领」（setup 脚本写不了会话 id），由本次
  //    Stop hook 认领并写回，之后别的会话不会再接手。
  const stateSessionId = String(meta.session_id == null ? "" : meta.session_id);
  const currentSessionId = String(sessionId == null ? "" : sessionId);
  const adoptSession = !stateSessionId;
  if (!adoptSession && stateSessionId !== currentSessionId) {
    return { action: "pass", reason: "session_id 不匹配（别的会话的循环）" };
  }

  // 3. 脏文件：宁可停，也不要拿一份看不懂的状态去死循环。
  const iteration = parseUnsigned(meta.iteration);
  if (iteration === null) {
    return { action: "dirty", reason: `iteration 不是非负整数：${meta.iteration}` };
  }
  const maxIterations = parseUnsigned(meta.max_iterations);
  if (maxIterations === null) {
    return {
      action: "dirty",
      reason: `max_iterations 不是非负整数：${meta.max_iterations}`,
    };
  }
  const prompt = String(body == null ? "" : body).replace(/\s+$/, "");
  if (!prompt.trim()) {
    return { action: "dirty", reason: "正文（prompt）为空" };
  }

  const completionPromise = String(
    meta.completion_promise == null ? "" : meta.completion_promise,
  );

  // 4. 上限。判据在自增之前，且 iteration 是「本回合序号」——所以 max_iterations = 1
  //    表示只跑 1 轮、一次都不喂回（与 CC 一致）。0 表示不限。
  if (maxIterations > 0 && iteration >= maxIterations) {
    return { action: "limit", iteration, maxIterations };
  }

  // 5. 完成标记：只有真的命中才允许停。
  const expected = normalizePromiseText(completionPromise);
  if (expected) {
    const got = extractPromise(lastAssistantMessage);
    if (got !== null && got === expected) {
      return { action: "complete", promise: got, iteration };
    }
  }

  // 6. 继续：轮次 +1 写回，正文 = 提示行 + 原始 prompt。
  //    提示行里的序号用**下一个**回合号（第一次回喂就是「第 2 轮」）。
  const nextIteration = iteration + 1;
  return {
    action: "continue",
    iteration: nextIteration,
    header: buildIterationHeader(nextIteration, {
      maxIterations,
      completionPromise,
    }),
    prompt,
    adoptSession,
  };
}

module.exports = {
  CANCEL_COMMAND,
  normalizePromiseText,
  extractPromise,
  parseUnsigned,
  buildIterationHeader,
  evaluate,
};
