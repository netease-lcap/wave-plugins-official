#!/usr/bin/env node
"use strict";

/**
 * `/ralph-loop:ralph-loop` 的 setup / cancel 入口。
 *
 * 参数来自命令正文里那行内联命令：`node "${WAVE_PLUGIN_ROOT}/scripts/ralph-loop.js" start $ARGUMENTS`
 * —— `$ARGUMENTS` 未加引号地交给 shell，所以本脚本拿到的是 shell 拆好的 argv，
 * 与 Claude Code 的 `setup-ralph-loop.sh` 完全一致：引号已被 shell 剥掉、连续空白
 * 被折叠、多行被折平。这是**刻意对齐**的结果，见 README「与 CC 的差异」。
 */

const fs = require("fs");
const {
  STATE_REL_PATH,
  formatStateText,
  readStateFile,
  writeStateFile,
} = require("../lib/state.js");
const { CANCEL_COMMAND } = require("../lib/loop.js");
const { deleteStateFile } = require("../lib/state.js");

const DEFAULT_MAX_ITERATIONS = 0; // 0 = 不限轮，靠完成标记或手动取消收尾

/**
 * 轮次语义（与 Claude Code 的 setup-ralph-loop.sh / stop-hook.sh 逐字对齐）：
 *
 *   状态文件里的 `iteration` = **已经进入的回合号**，启动时就写 1（首个回合算第 1 轮）。
 *   Stop hook 的判据是「自增之前」的 `iteration >= max_iterations` ⇒ 拦下 + 收尾；
 *   否则写回 `iteration + 1` 并再喂一次。
 *
 * 于是 `--max-iterations N` = 总共 N 个回合（含首回合）= N-1 次回喂：
 *   - N = 1：只跑首回合（**首回合会正常执行 prompt**），不喂回；
 *   - N = 2：喂回 1 次，共 2 轮（第 2 轮显示「第 2 轮」，同 CC 的 `Ralph iteration 2`）；
 *   - N = 0：不限轮。
 */
const INITIAL_ITERATION = 1;

/**
 * `--help` 的正文（形状与 CC 的 setup 帮助一致：用法 / 参数 / 说明 / 例子 / 怎么停 / 怎么看进度）。
 *
 * 循环正在跑的时候用户敲 `--help`，模型会把这段文案转述成 assistant 回复，那一轮结束时
 * Stop hook 照样拿这条回复去判完成 —— 所以文案里出现 `<promise>TEXT</promise>` 这种完整
 * 标签时，提取到的是 `TEXT`；与 CC 完全相同的行为，不改。
 */
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
  "  <prompt>                  要反复执行的任务。多个词直接写，不用加引号（加了也会被 shell 剥掉）。",
  "  --max-iterations N        总共跑 N 轮（含首个回合）。0 = 不限轮，默认 0。",
  "  --completion-promise TEXT 完成标记。模型输出 <promise>TEXT</promise> 时结束（归一空白后逐字比较）。",
  "                            TEXT 含空格时必须整体加引号，否则只取到第一个词：",
  "                              --completion-promise \"ALL TESTS PASS\"   ✅ 完成标记是 ALL TESTS PASS",
  "                              --completion-promise ALL TESTS PASS     ❌ 完成标记是 ALL，TESTS PASS 并回 prompt",
  "",
  "轮次怎么数：",
  "  --max-iterations 1  ⇒ 只跑第 1 轮（首回合就干活），不喂回；",
  "  --max-iterations 2  ⇒ 第 1 轮 + 喂回 1 次 = 共 2 轮；",
  "  --max-iterations 0  ⇒ 不限轮。",
  "",
  "例子：",
  "  /ralph-loop:ralph-loop 把 tests/ 下失败的用例逐个修到 npm test 全绿 --max-iterations 8",
  "  /ralph-loop:ralph-loop 重构到 tsc --noEmit 干净 --max-iterations 5 --completion-promise \"TSC CLEAN\"",
  "",
  "怎么停：",
  "  /ralph-loop:cancel-ralph  删除状态文件，当前回合结束后不再喂回。",
  "  不设上限也不设完成标记 ⇒ 循环会一直跑下去，只有 cancel 能停。",
  "  Esc 只是立刻停下，状态文件还在，下次结束回合时循环会被重新接上。",
  "",
  "看进度：",
  "  状态文件 <cwd>/.wave/ralph-loop.local.md 的 frontmatter 里有 iteration / max_iterations。",
  "  每轮开头的「🔄 第 N 轮」播报也会直接显示在对话里，不用自己去 grep。",
  "",
];

function printHelp() {
  process.stdout.write(`${USAGE_LINES.join("\n")}\n`);
}

function fail(message) {
  process.stdout.write(`❌ Ralph 循环没有启动：${message}\n`);
  process.exit(1);
}

/**
 * 把 `start` 之后的 argv 拆成 prompt + 两个选项 —— 与 CC 的解析循环同一套规则：
 *
 *   - 认识的 flag 吃掉它的值；
 *   - **其余一律当 prompt 正文**（出现未知 flag 不能把用户的任务拒掉）；
 *   - 剩下的词用**单个空格**拼成 prompt（CC 是 `PROMPT_PARTS[*]`，同样会折叠空白）。
 *
 * 同一 flag 出现多次时后者覆盖（CC 的 `case` 循环也是这个行为）。
 */
function parseStartArgs(argv) {
  const promptParts = [];
  let maxIterations = DEFAULT_MAX_ITERATIONS;
  let completionPromise = "";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      return { help: true };
    }

    if (arg === "--max-iterations") {
      const value = argv[i + 1];
      if (value === undefined) {
        fail("--max-iterations 需要一个非负整数（例如 --max-iterations 10）");
      }
      if (!/^\d+$/.test(value)) {
        fail(`--max-iterations 需要非负整数，收到「${value}」`);
      }
      maxIterations = Number(value);
      i += 1;
      continue;
    }

    if (arg === "--completion-promise") {
      const value = argv[i + 1];
      if (value === undefined || !value.trim()) {
        fail("--completion-promise 需要一个非空的完成标记文本");
      }
      completionPromise = value;
      i += 1;
      continue;
    }

    promptParts.push(arg);
  }

  const prompt = promptParts.join(" ");
  if (!prompt.trim()) {
    fail(
      "没有 prompt。用法：/ralph-loop:ralph-loop <prompt> [--max-iterations N] [--completion-promise TEXT]（细节见 --help）",
    );
  }

  return { maxIterations, completionPromise, prompt };
}

function start(cwd) {
  const parsed = parseStartArgs(process.argv.slice(3));

  // `--help` 在写状态之前处理：用户只是想看用法，不该起一个循环（CC 同样是先打用法再 exit 0）。
  if (parsed.help) {
    printHelp();
    return;
  }

  const { prompt, maxIterations, completionPromise } = parsed;

  // 与 CC 一致：已有循环时**直接覆盖**状态文件（不拦、不提示旧 prompt 丢了）。
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
        : completionPromise
          ? "不限（命中完成标记或手动取消才收尾）"
          : "不限（没设完成标记，只能手动取消）"
    }`,
    `- 完成条件：${completionPromise ? `<promise>${completionPromise}</promise>` : "未设"}`,
    `- prompt 正文：${prompt.length} 字符`,
  ];
  if (maxIterations === 1) {
    lines.push("- 本回合就是唯一一轮：干完这一轮就结束，不会再喂回");
  }
  if (maxIterations === 0) {
    // 两个维度会一起决定「这循环怎么停」，写警告时必须分开说。
    lines.push(
      completionPromise
        ? `- ⚠️ 没设轮次上限：这个循环只会在输出完成标记或你 ${CANCEL_COMMAND} 时停下`
        : `- ⚠️ 没设轮次上限、也没设完成标记：这个循环不会自己停，唯一停法是 ${CANCEL_COMMAND}`,
    );
  }
  if (completionPromise) {
    // CC 的 setup 会打印一大段 `CRITICAL - … Completion Promise`；这里只保留模型
    // 真正需要知道的三件事：怎么输出、必须逐字一致、不许谎报。
    lines.push(
      `- 完成写法：全部做完并验证通过后，输出 <promise>${completionPromise}</promise>（必须逐字一致）；`,
      "  没做到就别输出它 —— 谎报会让循环提前结束，等于任务没做完；",
      "  用别的说法描述完成不算数，循环不会识别。",
    );
  }

  process.stdout.write(`${lines.join("\n")}\n`);

  // 回显 prompt（CC 的 setup 也是这么做的）：模型从命令返回里就能读到任务内容，
  // 不必自己去翻用户那条消息。打的是**写进状态文件的那份**，与每轮回喂的 reason 逐字一致。
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
    `未知子命令「${action || "(空)"}」。用法：ralph-loop.js start|cancel，查看用法加 --help`,
  );
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
