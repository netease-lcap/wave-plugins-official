#!/usr/bin/env node
"use strict";

/**
 * Ralph 循环的命令行入口，由 skills/*\/SKILL.md 里的内联命令调用：
 *
 *   node "${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js" start <<'WAVE_RALPH_ARGS'
 *   $ARGUMENTS
 *   WAVE_RALPH_ARGS
 *
 *   node "${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js" cancel
 *
 *   node "${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js" start <<'WAVE_RALPH_ARGS'
 *   --help
 *   WAVE_RALPH_ARGS
 *
 * 为什么参数走 stdin 而不是命令行参数：wave 对 `$ARGUMENTS` 是**原文替换、不加
 * 引号不转义**，prompt 里出现 `"`、`'`、`$`、`;`、`&&`、反引号都会被 shell 重
 * 新解析（甚至被当成要执行的命令）。所以整段文本经带引号的 heredoc 原样送进
 * stdin，切分完全由这里做：带 `"` / `'` 引号的值按引号取，裸值取到空白为止，
 * 剩下的整段（保留原有换行与引号）就是 prompt 正文。
 */

const {
  STATE_REL_PATH,
  formatStateText,
  readStateFile,
  writeStateFile,
  deleteStateFile,
} = require("../lib/state.js");
const { CANCEL_COMMAND } = require("../lib/loop.js");

const DEFAULT_MAX_ITERATIONS = 0; // 0 = 不限轮，靠完成标记或手动取消收尾
const MAX_PROMPT_CHARS = 200000;

/**
 * 轮次语义（刻意与 Claude Code 的 setup-ralph-loop.sh 对齐）：
 *
 *   状态文件里的 `iteration` = **已经进入的回合号**，启动时就写 1（首个回合算第 1 轮）。
 *   Stop hook 的判据是「自增之前」的 `iteration >= max_iterations` ⇒ 拦下 + 收尾；
 *   否则写回 `iteration + 1` 并再喂一次。
 *
 * 于是 `--max-iterations N` = 总共 N 个回合（含首回合）= N-1 次回喂：
 *   - N = 1：只跑首回合（**首回合会正常执行 prompt**），不喂回；
 *   - N = 2：喂回 1 次，共 2 轮（第 2 轮的提示行写「第 2 轮」，同 CC 的 `Ralph iteration 2`）；
 *   - N = 0：不限轮。
 *
 * 「首回合」就是用户敲 `/ralph-loop:ralph-loop …` 的那个回合：skill 先把状态写好，
 * 然后模型**当场开始执行 prompt**，回合结束时才被 Stop hook 拦下 —— 这是 CC 的行为，
 * 早前把它写成「首回合只回一句就绪、什么都不干」是错的，会让 N 少算一轮。
 *
 * 曾经写成 `iteration: 0`，那会让同一个 N 多跑一轮（N 次回喂 = N+1 个回合），与 CC 不一致。
 */
const INITIAL_ITERATION = 1;

const USAGE_LINES = [
  "📖 Ralph 循环用法",
  "",
  "把同一段 prompt 一轮一轮喂回同一个会话，靠文件系统与 git 历史累积进度，",
  "直到模型输出完成标记（或到达轮次上限）。",
  "",
  "用法：",
  "  /ralph-loop:ralph-loop <prompt> [--max-iterations N] [--completion-promise TEXT]",
  "  /ralph-loop:ralph-loop --help | -h",
  "  /ralph-loop:cancel-ralph",
  "",
  "参数：",
  "  <prompt>                  要反复执行的任务。成对的引号会被去掉（同 shell），其余逐字保留。",
  "  --max-iterations N        总共跑 N 轮（含首个回合，与 Claude Code 同语义）。0 = 不限轮，默认 0。",
  "  --completion-promise TEXT 模型输出 <promise>TEXT</promise> 时结束（归一空白后逐字比较）。",
  "",
  "轮次怎么数：",
  "  --max-iterations 1  ⇒ 只跑第 1 轮（首回合就干活），不喂回；",
  "  --max-iterations 2  ⇒ 第 1 轮 + 喂回 1 次 = 共 2 轮；",
  "  --max-iterations 0  ⇒ 不限轮。",
  "",
  "例子：",
  "  /ralph-loop:ralph-loop 把 tests/ 下失败的用例逐个修到 npm test 全绿 --max-iterations 8",
  "  /ralph-loop:ralph-loop 重构到 tsc --noEmit 干净 --max-iterations 5 --completion-promise TSC CLEAN",
  "",
  "怎么取消：",
  "  /ralph-loop:cancel-ralph  删除状态文件，当前回合结束后不再喂回。",
  "  Esc 只是立刻停下，状态文件还在，下次结束回合时循环会被重新接上 —— 想彻底停请用 cancel。",
  "",
  "状态文件：<cwd>/.wave/ralph-loop.local.md（运行时状态，建议加进 .gitignore）。",
  "",
];

function printHelp() {
  process.stdout.write(`${USAGE_LINES.join("\n")}\n`);
}

function fail(message) {
  process.stdout.write(`❌ Ralph 循环没有启动：${message}\n`);
  process.exit(1);
}

function readStdin() {
  try {
    return require("fs").readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * 有没有 `--help` / `-h`。
 *
 * 只认「独立 token」形态（行首或空白之后、空白或行尾之前），和下面 takeFlag 的
 * 边界规则一致。这里刻意只特判这一个 flag：**其余不认识的字样一律算 prompt 正文**，
 * 与 CC 的 setup 脚本行为一致 —— 不能因为出现了未知 flag 就把用户的 prompt 拒掉。
 */
function hasHelpFlag(text) {
  return /(?:^|\s)(?:--help|-h)(?=\s|$)/.test(String(text == null ? "" : text));
}

/**
 * 从文本里取一个 `--flag value` / `--flag=value` / `--flag "value"`。
 *
 * 只认「前面是空白或行首」的出现位置，避免误伤 prompt 里的同名字样。
 *
 * 同一 flag 出现多次时（CC 的解析循环也是这个行为）：**全部从文本里摘掉，
 * 取最后一个的值**（后者覆盖）。
 *
 * @returns {{value: string, rest: string} | null}
 */
function takeFlag(text, name) {
  const spans = [];
  let lastValue = null;
  let searchFrom = 0;

  for (;;) {
    const index = text.indexOf(name, searchFrom);
    if (index === -1) break;
    if (index > 0 && !/\s/.test(text[index - 1])) {
      searchFrom = index + name.length;
      continue;
    }

    let cursor = index + name.length;
    // `--max-iterations-xxx` 这种不是本 flag，别吃进来
    if (cursor < text.length && !/[\s=]/.test(text[cursor])) {
      searchFrom = index + name.length;
      continue;
    }
    if (text[cursor] === "=") cursor += 1;
    while (cursor < text.length && (text[cursor] === " " || text[cursor] === "\t")) {
      cursor += 1;
    }

    let value = "";
    const quote = text[cursor];
    if (quote === '"' || quote === "'") {
      cursor += 1;
      while (cursor < text.length && text[cursor] !== quote) {
        if (quote === '"' && text[cursor] === "\\" && cursor + 1 < text.length) {
          cursor += 1; // 允许引号内的 \" 转义
        }
        value += text[cursor];
        cursor += 1;
      }
      if (cursor < text.length) cursor += 1; // 吃掉收尾引号
    } else {
      while (cursor < text.length && !/\s/.test(text[cursor])) {
        value += text[cursor];
        cursor += 1;
      }
    }

    // 顺带吃掉紧邻前面的行内空白，避免摘掉 flag 后留下多余空格；
    // flag 在行首时改成吃掉后面的行内空白（否则 "=" 形式的写法会留下前导空格）。
    let start = index;
    if (index === 0 || text[index - 1] === "\n") {
      while (cursor < text.length && (text[cursor] === " " || text[cursor] === "\t")) {
        cursor += 1;
      }
    } else {
      while (start > 0 && (text[start - 1] === " " || text[start - 1] === "\t")) {
        start -= 1;
      }
    }
    spans.push([start, cursor]);
    lastValue = value;
    searchFrom = cursor;
  }

  if (lastValue === null) return null;

  // 从后往前删，前面的下标才不会失效
  let rest = text;
  for (let i = spans.length - 1; i >= 0; i -= 1) {
    rest = `${rest.slice(0, spans[i][0])}${rest.slice(spans[i][1])}`;
  }
  return { value: lastValue, rest };
}

/**
 * 去掉 prompt 正文里**成对**的引号，等价于 shell 的 quote removal。
 *
 * CC 的 prompt 是经 shell 展开进 setup 脚本的，所以 `"Fix the auth bug"` 到脚本手里
 * 就是 `Fix the auth bug`。这里做同样的事：
 *   - `'…'` 里的内容原样保留（单引号内没有转义）；
 *   - `"…"` 里的 `\"` → `"`、`\\` → `\`，其余反斜杠原样；
 *   - 词中间的引号同样成对剥除（`Fix "the auth" bug` → `Fix the auth bug`）；
 *   - 找不到配对引号时，这个引号原样留着（不猜）。
 *
 * 刻意**不**折叠空白 / 换行：CC 会把多行 prompt 塌成一行，那会毁掉结构化 prompt，
 * 我们不复制这个缺陷（见 README「与 CC 的差异」）。
 */
function stripQuotes(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    if (ch === "'") {
      const end = text.indexOf("'", i + 1);
      if (end === -1) {
        out += ch;
        i += 1;
        continue;
      }
      out += text.slice(i + 1, end);
      i = end + 1;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      let inner = "";
      let closed = false;
      while (j < text.length) {
        const c = text[j];
        if (c === "\\" && j + 1 < text.length && (text[j + 1] === '"' || text[j + 1] === "\\")) {
          inner += text[j + 1];
          j += 2;
          continue;
        }
        if (c === '"') {
          closed = true;
          j += 1;
          break;
        }
        inner += c;
        j += 1;
      }
      if (closed) {
        out += inner;
        i = j;
      } else {
        out += ch;
        i += 1;
      }
      continue;
    }

    out += ch;
    i += 1;
  }
  return out;
}

/** 把命令行参数拆成 prompt + 两个选项。 */
function parseStartInput(raw) {
  let rest = String(raw == null ? "" : raw).replace(/\r\n/g, "\n");

  let maxIterations = DEFAULT_MAX_ITERATIONS;
  let completionPromise = "";

  const maxFlag = takeFlag(rest, "--max-iterations");
  if (maxFlag) {
    rest = maxFlag.rest;
    const value = maxFlag.value.trim();
    if (!/^\d+$/.test(value)) {
      fail(`--max-iterations 需要非负整数，收到「${value || "(空)"}」`);
    }
    maxIterations = Number(value);
  }

  const promiseFlag = takeFlag(rest, "--completion-promise");
  if (promiseFlag) {
    rest = promiseFlag.rest;
    completionPromise = promiseFlag.value.trim();
    if (!completionPromise) {
      fail("--completion-promise 需要一个非空的完成标记文本");
    }
  }

  // 引号剥除与 CC 一致（shell quote removal）；空白与换行一律不动。
  const prompt = stripQuotes(rest.replace(/^\n+/, "").replace(/\s+$/, ""));
  if (!prompt.trim()) {
    fail(
      "没有 prompt。用法：/ralph-loop:ralph-loop <prompt> [--max-iterations N] [--completion-promise TEXT]（细节见 /ralph-loop:ralph-loop --help）",
    );
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    fail(`prompt 太长（${prompt.length} 字符，上限 ${MAX_PROMPT_CHARS}）`);
  }

  return { prompt, maxIterations, completionPromise };
}

function start(cwd) {
  const input = readStdin();

  // `--help` 要在「已有循环」检查之前处理：用户只是想看用法，不该被状态文件挡住，
  // 更不该被当成 prompt 正文真的起一个循环（CC 的 setup 脚本同样是先打用法再 exit 0）。
  if (hasHelpFlag(input)) {
    printHelp();
    return;
  }

  const existing = readStateFile(cwd);
  if (existing !== null) {
    fail(
      `这个项目里已经有一个 Ralph 循环了（${STATE_REL_PATH}）。先 ${CANCEL_COMMAND} 再启动新的。`,
    );
  }

  const { prompt, maxIterations, completionPromise } = parseStartInput(input);

  writeStateFile(
    cwd,
    formatStateText(
      {
        // 首个回合就是第 1 轮（与 CC 对齐），不是 0。
        iteration: INITIAL_ITERATION,
        maxIterations,
        completionPromise,
        // 会话 id 到这里拿不到（命令不留会话上下文），由本会话的第一次
        // Stop hook 认领并写回；认领之后别的会话不会再接管这个循环。
        sessionId: "",
      },
      prompt,
    ),
  );

  const lines = [
    "✅ Ralph 循环已就绪",
    `- 状态文件：${STATE_REL_PATH}`,
    // CC 的 setup 会打印 `Iteration: 1`；让首回合的模型知道自己正处在第 1 轮。
    `- 迭代：第 ${INITIAL_ITERATION} 轮 / ${
      maxIterations > 0 ? `共 ${maxIterations} 轮` : "不限"
    }`,
    `- 轮次上限：${
      maxIterations > 0
        ? `${maxIterations} 轮（含首个回合；即最多喂回 ${maxIterations - 1} 次）`
        : "不限（靠完成标记或手动取消收尾）"
    }`,
    `- 完成条件：${completionPromise ? `<promise>${completionPromise}</promise>` : "未设"}`,
    `- prompt 正文：${prompt.length} 字符（已按 shell 规则去掉成对引号，其余逐字保存）`,
  ];
  if (maxIterations === 1) {
    lines.push("- 本回合就是唯一一轮：干完这一轮就结束，不会再喂回");
  }
  if (maxIterations === 0) {
    lines.push(
      `- ⚠️ 没有设上限：这个循环只会在输出完成标记或你 ${CANCEL_COMMAND} 时停下`,
    );
  }
  if (completionPromise) {
    // CC 的 setup 会打印一大段 `CRITICAL - … Completion Promise`；这里只保留
    // 模型真正需要知道的三件事：怎么输出、必须逐字一致、不许谎报（篇幅要紧）。
    lines.push(
      `- 完成写法：全部做完并验证通过后，输出 <promise>${completionPromise}</promise>（必须逐字一致）；`,
      "  没做到就别输出它 —— 谎报会让循环提前结束，等于任务没做完；",
      "  用别的说法描述完成不算数，循环不会识别。",
    );
  }

  process.stdout.write(`${lines.join("\n")}\n`);

  // 回显 prompt 原文（CC 的 setup 也是这么做的）：模型从命令返回里就能读到任务内容，
  // 不必自己去翻用户那条消息。这里打的是**解析后写进状态文件的那份**（引号已剥除），
  // 所以「模型看到的任务」和「每轮回喂的正文」逐字一致。
  process.stdout.write("\n");
  process.stdout.write(`${prompt}\n`);
}

function cancel(cwd) {
  const removed = deleteStateFile(cwd);
  if (removed) {
    process.stdout.write(`🛑 已取消 Ralph 循环（删除 ${STATE_REL_PATH}）\n`);
  } else {
    process.stdout.write(`ℹ️ 没有正在跑的 Ralph 循环（${STATE_REL_PATH} 不存在）\n`);
  }
}

function main() {
  const action = process.argv[2];
  // 内联命令的 cwd 就是会话 workdir，也就是状态文件该待的地方。
  const cwd = process.cwd();

  // 直接跑脚本时也能看用法（`node ralph-loop.js --help`）。
  if (action === "--help" || action === "-h") return printHelp();

  if (action === "start") return start(cwd);
  if (action === "cancel") return cancel(cwd);

  fail(
    `未知子命令「${action || "(空)"}」。用法：ralph-loop.js start|cancel（start 从 stdin 读 prompt），查看用法加 --help`,
  );
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
