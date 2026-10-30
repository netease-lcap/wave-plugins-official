#!/usr/bin/env node
/**
 * ralph-loop 自测：直接跑真实的 hook 与 CLI 进程（不 mock），逐个用例断言。
 *
 *   node plugins/ralph-loop/scripts/self-test.mjs
 *
 * 覆盖：
 *   ① 无状态文件 ② session 不匹配 ③ 脏文件 ④ 到上限 ⑤ promise 命中
 *   ⑥ 未命中继续（含 iteration 递增与 prompt 原样喂回）
 *   ⑦ 参数经 stdin 传输后逐字无损（引号 / $ / ; / && / 单引号 / 换行 / 反引号）
 *   ⑧ setup 认领会话 id、重复启动被拒、cancel 删文件
 *   ⑨ 非 Stop 事件不接管
 *   ⑩ 轮次语义与 Claude Code 对齐（N=2 只喂回 1 次、N=1 零喂回、--help 不起循环）
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const { formatStateText, parseStateText } = require("../lib/state.js");

const PLUGIN_ROOT = path.resolve(import.meta.dirname, "..");
const HOOK = path.join(PLUGIN_ROOT, "hooks", "stop.js");
const CLI = path.join(PLUGIN_ROOT, "scripts", "ralph-loop.js");

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
    return;
  }
  failures.push({ name, detail });
  console.log(`  ❌ ${name}${detail ? `\n       ${detail}` : ""}`);
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ralph-loop-selftest-"));
}

function statePath(cwd) {
  return path.join(cwd, ".wave", "ralph-loop.local.md");
}

function writeState(cwd, options, prompt) {
  fs.mkdirSync(path.join(cwd, ".wave"), { recursive: true });
  fs.writeFileSync(statePath(cwd), formatStateText(options, prompt), "utf8");
}

function writeRawState(cwd, text) {
  fs.mkdirSync(path.join(cwd, ".wave"), { recursive: true });
  fs.writeFileSync(statePath(cwd), text, "utf8");
}

function readState(cwd) {
  return fs.existsSync(statePath(cwd))
    ? fs.readFileSync(statePath(cwd), "utf8")
    : null;
}

function runHook(cwd, input) {
  const result = spawnSync(process.execPath, [HOOK], {
    cwd,
    input: JSON.stringify({ hook_event_name: "Stop", cwd, ...input }),
    encoding: "utf8",
    env: { ...process.env, WAVE_PROJECT_DIR: cwd },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

function runCli(cwd, args, stdin) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    input: stdin == null ? "" : stdin,
    encoding: "utf8",
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

const PROMPT = "把 tests/login.test.ts 的失败用例修好，然后运行 npm test 确认全绿。";

// ── ① 无状态文件 ────────────────────────────────────────────────
console.log("\n① 无状态文件 → 放行");
{
  const cwd = tmpDir();
  const res = runHook(cwd, { session_id: "s1", last_assistant_message: "干完了" });
  check("exit 0", res.code === 0, `实际 exit=${res.code} stderr=${res.stderr}`);
  check("没有创建状态文件", readState(cwd) === null);
  check("不播报", res.stderr.trim() === "", `stderr=${res.stderr}`);
}

// ── ② session 不匹配 ───────────────────────────────────────────
console.log("\n② session_id 不匹配 → 放行，且不动别人的状态");
{
  const cwd = tmpDir();
  writeState(
    cwd,
    { iteration: 3, maxIterations: 10, completionPromise: "", sessionId: "别的会话" },
    PROMPT,
  );
  const before = readState(cwd);
  const res = runHook(cwd, { session_id: "s1", last_assistant_message: "x" });
  check("exit 0", res.code === 0, `实际 exit=${res.code}`);
  check("状态文件原样保留", readState(cwd) === before);
  check("不播报", res.stderr.trim() === "", `stderr=${res.stderr}`);
}

// ── ③ 脏状态文件 ───────────────────────────────────────────────
console.log("\n③ 状态文件脏 → 删文件 + 播报 + 放行");
{
  const cases = [
    [
      "iteration 非数字",
      `---\niteration: abc\nmax_iterations: 5\ncompletion_promise: ""\nsession_id: "s1"\n---\n${PROMPT}\n`,
    ],
    [
      "max_iterations 非数字",
      `---\niteration: 1\nmax_iterations: 很多\ncompletion_promise: ""\nsession_id: "s1"\n---\n${PROMPT}\n`,
    ],
    [
      "正文为空",
      `---\niteration: 1\nmax_iterations: 5\ncompletion_promise: ""\nsession_id: "s1"\n---\n   \n\n  \n`,
    ],
  ];
  for (const [label, raw] of cases) {
    const cwd = tmpDir();
    writeRawState(cwd, raw);
    const res = runHook(cwd, { session_id: "s1", last_assistant_message: "x" });
    check(`${label}：exit 0`, res.code === 0, `实际 exit=${res.code}`);
    check(`${label}：状态文件已删除`, readState(cwd) === null);
    check(`${label}：有播报`, res.stderr.includes("不合法"), `stderr=${res.stderr}`);
  }
  // frontmatter 都读不出来
  const cwd = tmpDir();
  writeRawState(cwd, "不是状态文件\n");
  const res = runHook(cwd, { session_id: "s1", last_assistant_message: "x" });
  check("frontmatter 损坏：exit 0 且删除", res.code === 0 && readState(cwd) === null);
  check("frontmatter 损坏：有播报", res.stderr.includes("无法解析"), `stderr=${res.stderr}`);
}

// ── ④ 到 iteration 上限 ────────────────────────────────────────
console.log("\n④ 到上限 → 删文件 + 播报 + 放行");
{
  const cwd = tmpDir();
  writeState(
    cwd,
    { iteration: 2, maxIterations: 2, completionPromise: "DONE", sessionId: "s1" },
    PROMPT,
  );
  const res = runHook(cwd, {
    session_id: "s1",
    last_assistant_message: "还没做完",
  });
  check("exit 0", res.code === 0, `实际 exit=${res.code}`);
  check("状态文件已删除", readState(cwd) === null);
  check("播报含上限", res.stderr.includes("2 轮上限"), `stderr=${res.stderr}`);
}

// ── ⑤ promise 命中 ────────────────────────────────────────────
console.log("\n⑤ 完成标记命中 → 删文件 + 播报 + 放行");
{
  const cwd = tmpDir();
  writeState(
    cwd,
    { iteration: 1, maxIterations: 5, completionPromise: "ALL TESTS PASS", sessionId: "s1" },
    PROMPT,
  );
  // 首尾空白与内部换行都要归一后再比
  const res = runHook(cwd, {
    session_id: "s1",
    last_assistant_message: "全绿了。\n<promise>\n  ALL   TESTS PASS\n</promise>\n收工。",
  });
  check("exit 0", res.code === 0, `实际 exit=${res.code}`);
  check("状态文件已删除", readState(cwd) === null);
  check("播报含完成条件", res.stderr.includes("已完成"), `stderr=${res.stderr}`);

  // 标记不匹配 → 必须继续，不能因为「长得像」就放行
  const cwd2 = tmpDir();
  writeState(
    cwd2,
    { iteration: 0, maxIterations: 5, completionPromise: "ALL TESTS PASS", sessionId: "s1" },
    PROMPT,
  );
  const res2 = runHook(cwd2, {
    session_id: "s1",
    last_assistant_message: "<promise>ALL TESTS PASSED</promise>",
  });
  check("相近但不相等 → 继续（exit 2）", res2.code === 2, `实际 exit=${res2.code}`);
}

// ── ⑥ 未命中 → 继续 ───────────────────────────────────────────
console.log("\n⑥ 未命中 → iteration+1 写回 + prompt 原样喂回");
{
  const cwd = tmpDir();
  writeState(
    cwd,
    { iteration: 1, maxIterations: 3, completionPromise: "DONE", sessionId: "s1" },
    PROMPT,
  );
  const res = runHook(cwd, {
    session_id: "s1",
    last_assistant_message: "做了一半，还有 2 个用例失败。",
  });
  check("exit 2（阻止停止）", res.code === 2, `实际 exit=${res.code}`);
  check(
    "stderr 第一行是轮次提示",
    res.stderr.startsWith("🔄 Ralph 第 2 轮"),
    `stderr=${JSON.stringify(res.stderr.slice(0, 80))}`,
  );
  check(
    "提示行含完成条件与退出方式",
    res.stderr.includes("<promise>DONE</promise>") &&
      res.stderr.includes("/ralph-loop:cancel-ralph"),
    `stderr=${res.stderr}`,
  );
  check(
    "prompt 原样喂回",
    res.stderr === `🔄 Ralph 第 2 轮 | 完成条件：输出 <promise>DONE</promise>（只有真的达成才输出，不要为了退出而谎报） | 最多 3 轮，本轮是第 2 轮 | 想停就 /ralph-loop:cancel-ralph\n\n${PROMPT}\n`,
    `stderr=${JSON.stringify(res.stderr)}`,
  );
  const parsed = parseStateText(readState(cwd));
  check("iteration 写回为 2", parsed.ok && parsed.meta.iteration === "2", `meta=${JSON.stringify(parsed.meta)}`);
  check("正文未被改动", parsed.ok && parsed.body === `${PROMPT}\n`);
  check("max/completion 未被改动", parsed.ok && parsed.meta.max_iterations === "3" && parsed.meta.completion_promise === "DONE");

  // 没有完成条件时的提示行
  const cwd2 = tmpDir();
  writeState(cwd2, { iteration: 1, maxIterations: 0, completionPromise: "", sessionId: "s1" }, PROMPT);
  const res2 = runHook(cwd2, { session_id: "s1", last_assistant_message: "x" });
  check(
    "未设完成条件时提示不同",
    res2.code === 2 && res2.stderr.startsWith("🔄 Ralph 第 2 轮 | 未设完成条件"),
    `stderr=${JSON.stringify(res2.stderr.slice(0, 60))}`,
  );
}

// ── ⑦ 参数经 stdin 传输的完整性 ────────────────────────────────
console.log("\n⑦ setup 从 stdin 读参数：引号 / $ / ; / && / 单引号 / 换行 逐字无损");
{
  const cwd = tmpDir();
  const prompt = [
    "请修好 tests/login.test.ts",
    '  保留缩进：$HOME 与 `date` 与 $(whoami)',
    `  危险字符：a; b && c | d > e < f & g`,
    `  引号：'single' "double" 反斜杠 \\ 结尾`,
    "最后一行（不要把 --max-iterations 之外的东西当参数）",
  ].join("\n");
  const stdin = `--max-iterations 2 --completion-promise "ALL TESTS PASS"\n${prompt}\n`;
  const res = runCli(cwd, ["start"], stdin);
  check("exit 0", res.code === 0, `stdout=${res.stdout} stderr=${res.stderr}`);
  const parsed = parseStateText(readState(cwd) || "");
  check("状态文件可解析", parsed.ok, `reason=${parsed.reason}`);
  check(
    "prompt 正文逐字一致（含引号 / $ / ; / && / 换行）",
    parsed.ok && parsed.body === `${prompt}\n`,
    `实际正文=${JSON.stringify(parsed && parsed.body)}`,
  );
  check("--max-iterations 解析为 2", parsed.ok && parsed.meta.max_iterations === "2", `meta=${JSON.stringify(parsed.meta)}`);
  check(
    "--completion-promise 带空格的引号值解析正确",
    parsed.ok && parsed.meta.completion_promise === "ALL TESTS PASS",
    `meta=${JSON.stringify(parsed.meta)}`,
  );
  check("setup 输出提示了轮次上限", res.stdout.includes("轮次上限：2 轮"), `stdout=${res.stdout}`);
  check("setup 启动时写 iteration: 1", parsed.ok && parsed.meta.iteration === "1", `meta=${JSON.stringify(parsed.meta)}`);

  // 裸值形式 + 无引号
  const cwd2 = tmpDir();
  const res2 = runCli(cwd2, ["start"], "--completion-promise NOOP\n随便做点什么");
  const parsed2 = parseStateText(readState(cwd2) || "");
  check(
    "裸值 flag 也能解析",
    res2.code === 0 &&
      parsed2.ok &&
      parsed2.meta.completion_promise === "NOOP" &&
      parsed2.body === "随便做点什么\n",
    `stdout=${res2.stdout} body=${JSON.stringify(parsed2.ok && parsed2.body)}`,
  );

  // 不认识的 flag 必须原样留在 prompt 里（与 CC 一致，不报错）
  const cwd5 = tmpDir();
  const res5 = runCli(cwd5, ["start"], "--foo bar --unknown\n干活");
  const parsed5 = parseStateText(readState(cwd5) || "");
  check(
    "未知 flag 仍算 prompt 正文（不报错）",
    res5.code === 0 &&
      parsed5.ok &&
      parsed5.body === "--foo bar --unknown\n干活\n" &&
      parsed5.meta.max_iterations === "0",
    `stdout=${res5.stdout} body=${JSON.stringify(parsed5.ok && parsed5.body)}`,
  );

  // 非法 flag
  const cwd3 = tmpDir();
  const res3 = runCli(cwd3, ["start"], "--max-iterations abc\n干活");
  check("非法 --max-iterations 被拒", res3.code === 1 && res3.stdout.includes("❌"), `stdout=${res3.stdout}`);
  check("被拒时不留状态文件", readState(cwd3) === null);

  // 空 prompt
  const cwd4 = tmpDir();
  const res4 = runCli(cwd4, ["start"], "--max-iterations 3\n");
  check("空 prompt 被拒", res4.code === 1 && readState(cwd4) === null, `stdout=${res4.stdout}`);
}

// ── ⑧ 会话认领 / 重复启动 / cancel ─────────────────────────────
console.log("\n⑧ 会话认领、重复启动、cancel");
{
  const cwd = tmpDir();
  runCli(cwd, ["start"], `--max-iterations 2\n${PROMPT}`);
  const res = runHook(cwd, { session_id: "会话-A", last_assistant_message: "x" });
  const parsed = parseStateText(readState(cwd) || "");
  check("exit 2", res.code === 2, `实际 exit=${res.code}`);
  check("空 session_id 被本次 Stop hook 认领", parsed.ok && parsed.meta.session_id === "会话-A", `meta=${JSON.stringify(parsed.meta)}`);

  // 认领之后别的会话不能再续
  const other = runHook(cwd, { session_id: "会话-B", last_assistant_message: "x" });
  const after = parseStateText(readState(cwd) || "");
  check("认领后别的会话被放行", other.code === 0, `实际 exit=${other.code}`);
  check("认领后 iteration 不再变", after.ok && after.meta.iteration === "2", `meta=${JSON.stringify(after.meta)}`);

  // 已有循环时不允许重复启动
  const dup = runCli(cwd, ["start"], "另一个任务");
  check("已有循环 → 拒绝重复启动", dup.code === 1 && readState(cwd) !== null, `stdout=${dup.stdout}`);

  const cancel = runCli(cwd, ["cancel"]);
  check("cancel 删除状态文件", cancel.code === 0 && readState(cwd) === null, `stdout=${cancel.stdout}`);
  const cancelAgain = runCli(cwd, ["cancel"]);
  check("重复 cancel 不报错", cancelAgain.code === 0 && cancelAgain.stdout.includes("没有正在跑"), `stdout=${cancelAgain.stdout}`);
}

// ── ⑨ 不接管 SubagentStop ────────────────────────────────────
console.log("\n⑨ 非 Stop 事件不接管");
{
  const cwd = tmpDir();
  writeState(cwd, { iteration: 1, maxIterations: 5, completionPromise: "", sessionId: "s1" }, PROMPT);
  const res = spawnSync(process.execPath, [HOOK], {
    cwd,
    input: JSON.stringify({ hook_event_name: "SubagentStop", cwd, session_id: "s1" }),
    encoding: "utf8",
  });
  check("SubagentStop → exit 0", res.status === 0, `实际 exit=${res.status}`);
  check("SubagentStop 不动状态文件", parseStateText(readState(cwd) || "").meta.iteration === "1");
}

// ── ⑩ 与 Claude Code 对齐的轮次语义 ────────────────────────────
// CC：启动写 iteration: 1，自增之前判 iteration >= max_iterations。
// 所以 --max-iterations N = N 个回合 = N-1 次回喂。这里用真实进程数回喂次数。
console.log("\n⑩ 轮次语义与 CC 对齐（N 含首个回合）");
{
  // N = 2：stop#1 回喂一次（iteration 写回 2），stop#2 到上限收尾
  const cwd = tmpDir();
  const setup = runCli(cwd, ["start"], `--max-iterations 2\n${PROMPT}`);
  const afterSetup = parseStateText(readState(cwd) || "");
  check(
    "N=2 启动后 iteration=1（首回合算第 1 轮）",
    setup.code === 0 && afterSetup.ok && afterSetup.meta.iteration === "1",
    `meta=${JSON.stringify(afterSetup.ok && afterSetup.meta)}`,
  );

  const stop1 = runHook(cwd, { session_id: "s1", last_assistant_message: "第 1 轮干完了" });
  const after1 = parseStateText(readState(cwd) || "");
  check("N=2 第一次 Stop ⇒ 恰好 1 次回喂（exit 2）", stop1.code === 2, `实际 exit=${stop1.code}`);
  check("N=2 回喂提示行是「第 2 轮」", stop1.stderr.startsWith("🔄 Ralph 第 2 轮"), `stderr=${JSON.stringify(stop1.stderr.slice(0, 40))}`);
  check("N=2 iteration 写回 2", after1.ok && after1.meta.iteration === "2", `meta=${JSON.stringify(after1.ok && after1.meta)}`);

  const stop2 = runHook(cwd, { session_id: "s1", last_assistant_message: "第 2 轮干完了" });
  check("N=2 第二次 Stop ⇒ 到上限，不再回喂（exit 0）", stop2.code === 0, `实际 exit=${stop2.code}`);
  check("N=2 第二次 Stop 后状态文件已删除", readState(cwd) === null);
  check("N=2 播报「2 轮上限」", stop2.stderr.includes("2 轮上限"), `stderr=${stop2.stderr}`);

  // N = 1：首次 Stop 就到上限，零回喂
  const cwd1 = tmpDir();
  const setup1 = runCli(cwd1, ["start"], `--max-iterations 1\n${PROMPT}`);
  const afterSetup1 = parseStateText(readState(cwd1) || "");
  check("N=1 启动后 iteration=1", setup1.code === 0 && afterSetup1.ok && afterSetup1.meta.iteration === "1", `meta=${JSON.stringify(afterSetup1.ok && afterSetup1.meta)}`);
  check("N=1 setup 输出提示「不会喂回」", setup1.stdout.includes("不会喂回任何一次"), `stdout=${setup1.stdout}`);

  const stopOne = runHook(cwd1, { session_id: "s1", last_assistant_message: "干完了" });
  check("N=1 首次 Stop ⇒ 零回喂（exit 0）", stopOne.code === 0, `实际 exit=${stopOne.code}`);
  check("N=1 首次 Stop 后状态文件已删除", readState(cwd1) === null);
  check("N=1 播报「1 轮上限」", stopOne.stderr.includes("1 轮上限"), `stderr=${stopOne.stderr}`);

  // --help：打印用法、exit 0、绝不写状态文件（也不被已有循环挡住）
  for (const flag of ["--help", "-h"]) {
    const cwdHelp = tmpDir();
    const help = runCli(cwdHelp, ["start"], `${flag}\n`);
    check(
      `${flag} ⇒ exit 0 并打印用法`,
      help.code === 0 && help.stdout.includes("Ralph 循环用法") && help.stdout.includes("--max-iterations"),
      `exit=${help.code} stdout=${JSON.stringify(help.stdout.slice(0, 60))}`,
    );
    check(`${flag} ⇒ 不创建状态文件`, readState(cwdHelp) === null);
  }

  // 已有循环时 --help 仍然只打用法，不动状态文件
  const cwdBusy = tmpDir();
  writeState(cwdBusy, { iteration: 1, maxIterations: 5, completionPromise: "", sessionId: "s1" }, PROMPT);
  const before = readState(cwdBusy);
  const helpBusy = runCli(cwdBusy, ["start"], "--help\n");
  check(
    "已有循环时 --help 仍打用法且不动状态文件",
    helpBusy.code === 0 && helpBusy.stdout.includes("Ralph 循环用法") && readState(cwdBusy) === before,
    `exit=${helpBusy.code}`,
  );
}

// ── 汇总 ─────────────────────────────────────────────────────
console.log(
  `\n${failures.length === 0 ? "全部通过" : "有失败"}：${passed} 通过，${failures.length} 失败\n`,
);
if (failures.length > 0) {
  for (const failure of failures) console.log(`- ${failure.name}`);
  process.exit(1);
}
