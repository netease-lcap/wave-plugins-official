#!/usr/bin/env node
/**
 * ralph-loop 自测：直接跑真实的 hook 与 CLI 进程（不 mock），逐个用例断言。
 *
 *   node plugins/ralph-loop/scripts/self-test.mjs
 *
 * 覆盖：
 *   ① 无状态文件 ② session 不匹配 ③ 脏文件 ④ 到上限 ⑤ promise 命中
 *   ⑥ 未命中继续（iteration 递增、reason 就是原始 prompt、无前缀）
 *   ⑦ 参数解析与 Claude Code 对齐（shell 分词后的 argv：引号已剥、空白已折、
 *      `--max-iterations=10` 不认、未知 flag 落在 prompt 里、重复 flag 后者覆盖）
 *   ⑧ setup 认领会话 id、已有循环静默覆盖、cancel 删文件
 *   ⑨ 非 Stop 事件不接管
 *   ⑩ 轮次语义与 Claude Code 对齐（N=2 只喂回 1 次、N=1 零喂回、--help 不起循环）
 *   ⑪ 回喂走 `{"decision":"block","reason","systemMessage"}` + exit 0
 *
 * 用例跑在 tmpDir() 建的临时目录里，整段包在 try/finally 中统一 rmSync 删除。
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const { formatStateText, parseStateText, STATE_REL_PATH } = require("../lib/state.js");
const { extractPromise } = require("../lib/loop.js");

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

const createdDirs = [];

/**
 * 建一个临时 cwd 并登记，跑完统一删。
 *
 * 之前这里只建不删，每跑一次自测就在 /tmp 里留几十个 `ralph-loop-selftest-*`
 * （某个开发机上攒到过 921 个），所以清理是硬要求，不是可选的收尾。
 */
function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ralph-loop-selftest-"));
  createdDirs.push(dir);
  return dir;
}

/** 删掉本进程建过的所有临时目录；失败也要继续删剩下的。 */
function cleanupTmpDirs() {
  for (const dir of createdDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // 清理失败不该改写测试结论
    }
  }
}

function stateDir(cwd) {
  return path.dirname(path.join(cwd, STATE_REL_PATH));
}

function statePath(cwd) {
  return path.join(cwd, STATE_REL_PATH);
}

function writeState(cwd, options, prompt) {
  fs.mkdirSync(stateDir(cwd), { recursive: true });
  fs.writeFileSync(statePath(cwd), formatStateText(options, prompt), "utf8");
}

function writeRawState(cwd, text) {
  fs.mkdirSync(stateDir(cwd), { recursive: true });
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

/**
 * 取 hook stdout 里的 JSON（放行时为空）。
 * 不是合法 JSON 就返回 `{ ok:false }` —— 用 ok 区分，别拿空串糊过去。
 */
function readStdoutJson(stdout) {
  const text = String(stdout == null ? "" : stdout).trim();
  if (!text) return { ok: false, reason: "stdout 为空" };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      reason: `stdout 不是合法 JSON：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 跑 setup / cancel。argv 直接传，**不经过 shell**：这正是命令正文里
 * `node ralph-loop.js start $ARGUMENTS` 在引擎里的等价形态（`$ARGUMENTS` 未加引号
 * 交给 shell，shell 分词后 exec，脚本拿到的就是这个 argv）。
 */
function runCli(cwd, argv) {
  const result = spawnSync(process.execPath, [CLI, ...argv], {
    cwd,
    encoding: "utf8",
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

const PROMPT = "把 tests/login.test.ts 的失败用例修好，然后运行 npm test 确认全绿。";

// 所有用例包在一个 try/finally 里：任何一条抛异常（或断言失败后继续跑）都要把
// 临时目录删干净 —— 以前这里只建不删，每跑一次就往 /tmp 里留几十个目录。
try {
  // ── ① 无状态文件 ────────────────────────────────────────────────
  console.log("\n① 无状态文件 → 放行");
  {
    const cwd = tmpDir();
    const res = runHook(cwd, { session_id: "s1", last_assistant_message: "干完了" });
    check("exit 0", res.code === 0, `实际 exit=${res.code} stderr=${res.stderr}`);
    check("没有创建状态文件", readState(cwd) === null);
    check("不播报（stdout 为空）", res.stdout.trim() === "", `stdout=${res.stdout}`);
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
    check("不播报（stdout 为空）", res.stdout.trim() === "", `stdout=${res.stdout}`);
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
      const json = readStdoutJson(res.stdout);
      check(`${label}：exit 0`, res.code === 0, `实际 exit=${res.code}`);
      check(`${label}：状态文件已删除`, readState(cwd) === null);
      check(
        `${label}：有播报`,
        json.ok && json.value.systemMessage.includes("不合法") && !json.value.decision,
        `stdout=${res.stdout}`,
      );
    }
    // frontmatter 都读不出来
    const cwd = tmpDir();
    writeRawState(cwd, "不是状态文件\n");
    const res = runHook(cwd, { session_id: "s1", last_assistant_message: "x" });
    const json = readStdoutJson(res.stdout);
    check("frontmatter 损坏：exit 0 且删除", res.code === 0 && readState(cwd) === null);
    check(
      "frontmatter 损坏：有播报",
      json.ok && json.value.systemMessage.includes("无法解析"),
      `stdout=${res.stdout}`,
    );
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
    const json = readStdoutJson(res.stdout);
    check("exit 0", res.code === 0, `实际 exit=${res.code}`);
    check("状态文件已删除", readState(cwd) === null);
    check(
      "播报含上限、且不是 block",
      json.ok && json.value.systemMessage.includes("2 轮上限") && !json.value.decision,
      `stdout=${res.stdout}`,
    );
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
    const json = readStdoutJson(res.stdout);
    check("exit 0", res.code === 0, `实际 exit=${res.code}`);
    check("状态文件已删除", readState(cwd) === null);
    check(
      "播报含完成条件、且不是 block",
      json.ok && json.value.systemMessage.includes("已完成") && !json.value.decision,
      `stdout=${res.stdout}`,
    );

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
    const json2 = readStdoutJson(res2.stdout);
    check(
      "相近但不相等 → 继续（decision=block）",
      res2.code === 0 && json2.ok && json2.value.decision === "block",
      `exit=${res2.code} stdout=${res2.stdout}`,
    );
  }

  // ── ⑥ 未命中 → 继续 ───────────────────────────────────────────
  console.log("\n⑥ 未命中 → iteration+1 写回 + 原始 prompt 当 reason");
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
    const json = readStdoutJson(res.stdout);
    check("exit 0", res.code === 0, `实际 exit=${res.code}`);
    check(
      "stdout 是合法 JSON",
      json.ok,
      `stdout=${JSON.stringify(res.stdout)}${json.ok ? "" : `（${json.reason}）`}`,
    );
    check(
      "decision=block（与 CC 的 stop-hook.sh 同一通道）",
      json.ok && json.value.decision === "block",
      `stdout=${res.stdout}`,
    );
    check(
      "reason 就是原始 prompt（无前缀、无轮次行）",
      json.ok && json.value.reason === PROMPT,
      `reason=${JSON.stringify(json.ok ? json.value.reason : null)}`,
    );
    check(
      "systemMessage 给出轮次与退出方式",
      json.ok &&
        json.value.systemMessage.includes("第 2 轮") &&
        json.value.systemMessage.includes("/ralph-loop:cancel-ralph") &&
        json.value.systemMessage.includes("<promise>DONE</promise>"),
      `systemMessage=${JSON.stringify(json.ok ? json.value.systemMessage : null)}`,
    );
    check("stderr 为空（正文只走 reason）", res.stderr.trim() === "", `stderr=${res.stderr}`);
    const parsed = parseStateText(readState(cwd));
    check(
      "iteration 写回为 2",
      parsed.ok && parsed.meta.iteration === "2",
      `meta=${JSON.stringify(parsed.meta)}`,
    );
    check("正文未被改动", parsed.ok && parsed.body === `${PROMPT}\n`);
    check(
      "max/completion 未被改动",
      parsed.ok && parsed.meta.max_iterations === "3" && parsed.meta.completion_promise === "DONE",
    );

    // 没有完成条件时的播报文案
    const cwd2 = tmpDir();
    writeState(cwd2, { iteration: 1, maxIterations: 0, completionPromise: "", sessionId: "s1" }, PROMPT);
    const res2 = runHook(cwd2, { session_id: "s1", last_assistant_message: "x" });
    const json2 = readStdoutJson(res2.stdout);
    check(
      "未设完成条件时播报不同",
      json2.ok &&
        json2.value.decision === "block" &&
        json2.value.systemMessage.includes("未设完成条件"),
      `stdout=${res2.stdout}`,
    );
  }

  // ── ⑦ 参数解析（与 CC 同一套 argv 规则）─────────────────────────
  console.log("\n⑦ 参数解析：shell 分词后的 argv，规则与 CC 一致");
  {
    // 最基本的：多词 prompt 拼回一句，flag 被摘掉
    const cwd = tmpDir();
    const res = runCli(cwd, ["start", "把", "tests", "修好", "--max-iterations", "2"]);
    const parsed = parseStateText(readState(cwd) || "");
    check("exit 0", res.code === 0, `stdout=${res.stdout} stderr=${res.stderr}`);
    check("状态文件可解析", parsed.ok, `reason=${parsed.reason}`);
    check(
      "多词 prompt 用单个空格拼成一句",
      parsed.ok && parsed.body === "把 tests 修好\n",
      `body=${JSON.stringify(parsed.ok && parsed.body)}`,
    );
    check(
      "--max-iterations 解析为 2",
      parsed.ok && parsed.meta.max_iterations === "2",
      `meta=${JSON.stringify(parsed.meta)}`,
    );
    check("启动时写 iteration: 1", parsed.ok && parsed.meta.iteration === "1");
    check("setup 输出带迭代信息（第 1 轮 / 共 2 轮）", res.stdout.includes("迭代：第 1 轮 / 共 2 轮"), `stdout=${res.stdout}`);
    check(
      "setup 摘要之后空一行、回显 prompt",
      res.stdout.endsWith("\n\n把 tests 修好\n"),
      `尾部=${JSON.stringify(res.stdout.slice(-60))}`,
    );
    check(
      "状态文件写在 .wave/ 下（wave 自己的项目级约定目录）",
      STATE_REL_PATH === path.join(".wave", "ralph-loop.local.md"),
      `STATE_REL_PATH=${STATE_REL_PATH}`,
    );

    // 完成标记含空格：shell 已把整段引号内容合成一个 argv 元素
    const cwdQ = tmpDir();
    const resQ = runCli(cwdQ, [
      "start",
      "补齐测试",
      "--completion-promise",
      "ALL TESTS PASS",
    ]);
    const parsedQ = parseStateText(readState(cwdQ) || "");
    check(
      "带空格的 --completion-promise 完整保留（一个 argv 元素）",
      resQ.code === 0 &&
        parsedQ.ok &&
        parsedQ.meta.completion_promise === "ALL TESTS PASS" &&
        parsedQ.body === "补齐测试\n",
      `meta=${JSON.stringify(parsedQ.ok && parsedQ.meta)} body=${JSON.stringify(parsedQ.ok && parsedQ.body)}`,
    );
    check(
      "设了完成条件时 setup 说明写法（不许谎报）",
      resQ.stdout.includes("<promise>ALL TESTS PASS</promise>") && resQ.stdout.includes("没做到就别输出"),
      `stdout=${resQ.stdout}`,
    );

    // 引号在 prompt 中间：shell 只剥语法引号，词与词之间的分隔由 shell 定；
    // 到了脚本这里已经没有「引号里藏 flag」这回事（旧实现会被它吃掉）
    const cwdInner = tmpDir();
    const resInner = runCli(cwdInner, ["start", "把 a --max-iterations 5 b 改成 3"]);
    const parsedInner = parseStateText(readState(cwdInner) || "");
    check(
      "引号里出现的 flag 字样不被解析（旧实现会吃掉）",
      resInner.code === 0 &&
        parsedInner.ok &&
        parsedInner.meta.max_iterations === "0" &&
        parsedInner.body === "把 a --max-iterations 5 b 改成 3\n",
      `meta=${JSON.stringify(parsedInner.ok && parsedInner.meta)} body=${JSON.stringify(parsedInner.ok && parsedInner.body)}`,
    );

    // 重复 flag：后者覆盖（CC 的 case 循环同样如此）
    const cwdDup = tmpDir();
    const resDup = runCli(cwdDup, [
      "start",
      "--max-iterations", "2",
      "--completion-promise", "FIRST",
      "干活",
      "--max-iterations", "5",
      "--completion-promise", "SECOND",
    ]);
    const parsedDup = parseStateText(readState(cwdDup) || "");
    check(
      "重复 flag：取最后一个值",
      resDup.code === 0 &&
        parsedDup.ok &&
        parsedDup.meta.max_iterations === "5" &&
        parsedDup.meta.completion_promise === "SECOND",
      `meta=${JSON.stringify(parsedDup.ok && parsedDup.meta)}`,
    );
    check(
      "重复 flag：全部从 prompt 正文里摘掉",
      parsedDup.ok && parsedDup.body === "干活\n",
      `body=${JSON.stringify(parsedDup.ok && parsedDup.body)}`,
    );

    // 等号形式：CC 不认，我们也不认（整段当 prompt 正文）
    const cwdEq = tmpDir();
    const resEq = runCli(cwdEq, ["start", "--max-iterations=10", "干活"]);
    const parsedEq = parseStateText(readState(cwdEq) || "");
    check(
      "--max-iterations=10 不认，当 prompt 正文（与 CC 一致）",
      resEq.code === 0 &&
        parsedEq.ok &&
        parsedEq.meta.max_iterations === "0" &&
        parsedEq.body === "--max-iterations=10 干活\n",
      `meta=${JSON.stringify(parsedEq.ok && parsedEq.meta)} body=${JSON.stringify(parsedEq.ok && parsedEq.body)}`,
    );

    // 未知 flag：留在 prompt 里，不报错（与 CC 一致）
    const cwdUnknown = tmpDir();
    const resUnknown = runCli(cwdUnknown, ["start", "--foo", "bar", "--unknown", "干活"]);
    const parsedUnknown = parseStateText(readState(cwdUnknown) || "");
    check(
      "未知 flag 仍算 prompt 正文（不报错）",
      resUnknown.code === 0 &&
        parsedUnknown.ok &&
        parsedUnknown.body === "--foo bar --unknown 干活\n" &&
        parsedUnknown.meta.max_iterations === "0",
      `stdout=${resUnknown.stdout} body=${JSON.stringify(parsedUnknown.ok && parsedUnknown.body)}`,
    );

    // 非法 --max-iterations
    for (const [label, argv] of [
      ["值非数字", ["start", "--max-iterations", "abc", "干活"]],
      ["缺值", ["start", "--max-iterations"]],
      ["缺完成标记值", ["start", "--completion-promise"]],
      ["完成标记为空串", ["start", "干活", "--completion-promise", ""]],
    ]) {
      const badCwd = tmpDir();
      const bad = runCli(badCwd, argv);
      check(`${label} ⇒ exit 1 且点名原因`, bad.code === 1 && bad.stdout.includes("❌"), `exit=${bad.code} stdout=${bad.stdout}`);
      check(`${label} ⇒ 不留状态文件`, readState(badCwd) === null);
    }

    // 空 prompt：说清用法，而不是静默起一个空循环
    const cwdNoPrompt = tmpDir();
    const resNoPrompt = runCli(cwdNoPrompt, ["start"]);
    check(
      "空 prompt ⇒ exit 1 并给出用法",
      resNoPrompt.code === 1 &&
        resNoPrompt.stdout.includes("没有 prompt") &&
        readState(cwdNoPrompt) === null,
      `exit=${resNoPrompt.code} stdout=${resNoPrompt.stdout}`,
    );

    // 未知子命令
    const resBadAction = runCli(tmpDir(), ["bogus"]);
    check(
      "未知子命令 ⇒ exit 1 且点名",
      resBadAction.code === 1 && resBadAction.stdout.includes("未知子命令"),
      `stdout=${resBadAction.stdout}`,
    );
  }

  // ── ⑧ 会话认领 / 覆盖启动 / cancel ─────────────────────────────
  console.log("\n⑧ 会话认领、覆盖启动、cancel");
  {
    const cwd = tmpDir();
    runCli(cwd, ["start", "--max-iterations", "2", PROMPT]);
    const res = runHook(cwd, { session_id: "会话-A", last_assistant_message: "x" });
    const parsed = parseStateText(readState(cwd) || "");
    check("继续（decision=block）", res.code === 0 && readStdoutJson(res.stdout).value?.decision === "block", `stdout=${res.stdout}`);
    check(
      "空 session_id 被本次 Stop hook 认领",
      parsed.ok && parsed.meta.session_id === "会话-A",
      `meta=${JSON.stringify(parsed.meta)}`,
    );

    // 认领之后别的会话不能再续
    const other = runHook(cwd, { session_id: "会话-B", last_assistant_message: "x" });
    const after = parseStateText(readState(cwd) || "");
    check("认领后别的会话被放行", other.code === 0 && other.stdout.trim() === "", `stdout=${other.stdout}`);
    check("认领后 iteration 不再变", after.ok && after.meta.iteration === "2", `meta=${JSON.stringify(after.meta)}`);

    // 已有循环时再启动：与 CC 一致，静默覆盖状态文件
    const dup = runCli(cwd, ["start", "另一个任务"]);
    const afterDup = parseStateText(readState(cwd) || "");
    check("已有循环 → 直接覆盖（不拦、exit 0）", dup.code === 0, `exit=${dup.code} stdout=${dup.stdout}`);
    check(
      "覆盖后正文是新 prompt",
      afterDup.ok && afterDup.body === "另一个任务\n",
      `body=${JSON.stringify(afterDup.ok && afterDup.body)}`,
    );

    const cancel = runCli(cwd, ["cancel"]);
    check("cancel 删除状态文件", cancel.code === 0 && readState(cwd) === null, `stdout=${cancel.stdout}`);
    const cancelAgain = runCli(cwd, ["cancel"]);
    check(
      "重复 cancel 不报错",
      cancelAgain.code === 0 && cancelAgain.stdout.includes("没有正在跑"),
      `stdout=${cancelAgain.stdout}`,
    );
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
    const setup = runCli(cwd, ["start", "--max-iterations", "2", PROMPT]);
    const afterSetup = parseStateText(readState(cwd) || "");
    check(
      "N=2 启动后 iteration=1（首回合算第 1 轮）",
      setup.code === 0 && afterSetup.ok && afterSetup.meta.iteration === "1",
      `meta=${JSON.stringify(afterSetup.ok && afterSetup.meta)}`,
    );

    const stop1 = runHook(cwd, { session_id: "s1", last_assistant_message: "第 1 轮干完了" });
    const json1 = readStdoutJson(stop1.stdout);
    const after1 = parseStateText(readState(cwd) || "");
    check("N=2 第一次 Stop ⇒ 恰好 1 次回喂（block）", json1.ok && json1.value.decision === "block", `stdout=${stop1.stdout}`);
    check("N=2 播报是「第 2 轮」", json1.ok && json1.value.systemMessage.includes("第 2 轮"), `stdout=${stop1.stdout}`);
    check("N=2 iteration 写回 2", after1.ok && after1.meta.iteration === "2", `meta=${JSON.stringify(after1.ok && after1.meta)}`);

    const stop2 = runHook(cwd, { session_id: "s1", last_assistant_message: "第 2 轮干完了" });
    const json2 = readStdoutJson(stop2.stdout);
    check("N=2 第二次 Stop ⇒ 到上限，不再回喂（exit 0）", stop2.code === 0, `实际 exit=${stop2.code}`);
    check("N=2 第二次 Stop 时没有 decision", json2.ok && !json2.value.decision, `stdout=${stop2.stdout}`);
    check("N=2 第二次 Stop 后状态文件已删除", readState(cwd) === null);
    check("N=2 播报「2 轮上限」", json2.ok && json2.value.systemMessage.includes("2 轮上限"), `stdout=${stop2.stdout}`);

    // N = 1：首次 Stop 就到上限，零回喂
    const cwd1 = tmpDir();
    const setup1 = runCli(cwd1, ["start", "--max-iterations", "1", PROMPT]);
    const afterSetup1 = parseStateText(readState(cwd1) || "");
    check(
      "N=1 启动后 iteration=1",
      setup1.code === 0 && afterSetup1.ok && afterSetup1.meta.iteration === "1",
      `meta=${JSON.stringify(afterSetup1.ok && afterSetup1.meta)}`,
    );
    check("N=1 setup 输出提示「就这一轮」", setup1.stdout.includes("本回合就是唯一一轮"), `stdout=${setup1.stdout}`);

    const stopOne = runHook(cwd1, { session_id: "s1", last_assistant_message: "干完了" });
    const jsonOne = readStdoutJson(stopOne.stdout);
    check("N=1 首次 Stop ⇒ 零回喂（exit 0）", stopOne.code === 0, `实际 exit=${stopOne.code}`);
    check("N=1 首次 Stop 时没有 decision", jsonOne.ok && !jsonOne.value.decision, `stdout=${stopOne.stdout}`);
    check("N=1 首次 Stop 后状态文件已删除", readState(cwd1) === null);
    check("N=1 播报「1 轮上限」", jsonOne.ok && jsonOne.value.systemMessage.includes("1 轮上限"), `stdout=${stopOne.stdout}`);

    // --help：打印用法、exit 0、绝不写状态文件
    for (const flag of ["--help", "-h"]) {
      const cwdHelp = tmpDir();
      const help = runCli(cwdHelp, ["start", flag]);
      check(
        `${flag} ⇒ exit 0 并打印用法`,
        help.code === 0 && help.stdout.includes("Ralph 循环用法") && help.stdout.includes("--max-iterations"),
        `exit=${help.code} stdout=${JSON.stringify(help.stdout.slice(0, 60))}`,
      );
      check(`${flag} ⇒ 不创建状态文件`, readState(cwdHelp) === null);
      // 与 CC 一致：用法文案里就是完整的 `<promise>TEXT</promise>`（不拆成三段），
      // 所以循环运行中问用法、被模型原样转述时，提取到的是裸占位符 `TEXT` —— 与 CC 同风险，
      // 这里把它钉住，免得以后有人「顺手修好」又和 CC 不一致。
      check(
        `${flag} ⇒ 文案里是完整标签（与 CC 相同，刻意不拆）`,
        extractPromise(help.stdout) === "TEXT",
        `提取到 ${JSON.stringify(extractPromise(help.stdout))}`,
      );
    }

    // 直接跑脚本（不经 start）也能看用法
    const helpDirect = runCli(tmpDir(), ["--help"]);
    check(
      "裸 --help ⇒ exit 0 并打印用法",
      helpDirect.code === 0 && helpDirect.stdout.includes("Ralph 循环用法"),
      `exit=${helpDirect.code}`,
    );

    // 已有循环时 --help 仍然只打用法，不动状态文件
    const cwdBusy = tmpDir();
    writeState(cwdBusy, { iteration: 1, maxIterations: 5, completionPromise: "", sessionId: "s1" }, PROMPT);
    const before = readState(cwdBusy);
    const helpBusy = runCli(cwdBusy, ["start", "--help"]);
    check(
      "已有循环时 --help 仍打用法且不动状态文件",
      helpBusy.code === 0 && helpBusy.stdout.includes("Ralph 循环用法") && readState(cwdBusy) === before,
      `exit=${helpBusy.code}`,
    );
  }

  // ── ⑪ 两个受众、两个字段 ───────────────────────────────────────
  // reason → 模型（注入成 meta user message 后重开一轮）；systemMessage → 用户（对话里的一行）。
  // 两者同在一份 JSON 里，必须各就各位。
  console.log("\n⑪ reason 给模型、systemMessage 给用户");
  {
    const cwd = tmpDir();
    writeState(
      cwd,
      { iteration: 1, maxIterations: 3, completionPromise: "DONE", sessionId: "s1" },
      PROMPT,
    );
    const res = runHook(cwd, {
      session_id: "s1",
      last_assistant_message: "还有 2 个用例没修好",
    });
    const json = readStdoutJson(res.stdout);
    check("继续：stdout 只有一个 JSON 对象", json.ok && json.value !== null && typeof json.value === "object", `stdout=${res.stdout}`);
    check(
      "继续：reason 不含轮次前缀（模型每轮看到同一段话）",
      json.ok && !json.value.reason.includes("🔄") && !json.value.reason.includes("第 2 轮"),
      `reason=${JSON.stringify(json.ok ? json.value.reason : null)}`,
    );
    check(
      "继续：systemMessage 含「第 2 轮」",
      json.ok && json.value.systemMessage.includes("第 2 轮"),
      `systemMessage=${JSON.stringify(json.ok ? json.value.systemMessage : null)}`,
    );
    check(
      "继续：systemMessage 不复述 prompt 正文",
      json.ok && !json.value.systemMessage.includes("tests/login.test.ts"),
      `systemMessage=${JSON.stringify(json.ok ? json.value.systemMessage : null)}`,
    );

    // 没设完成条件：给用户的文案里不能出现 <promise>，否则他会以为输出它就能停
    const cwdNoPromise = tmpDir();
    writeState(
      cwdNoPromise,
      { iteration: 1, maxIterations: 0, completionPromise: "", sessionId: "s1" },
      PROMPT,
    );
    const resNoPromise = runHook(cwdNoPromise, { session_id: "s1", last_assistant_message: "x" });
    const jsonNoPromise = readStdoutJson(resNoPromise.stdout);
    check(
      "未设完成条件：systemMessage 不含 <promise>",
      jsonNoPromise.ok && !jsonNoPromise.value.systemMessage.includes("<promise>"),
      `stdout=${resNoPromise.stdout}`,
    );
    check(
      "未设完成条件：systemMessage 仍给 cancel 命令",
      jsonNoPromise.ok && jsonNoPromise.value.systemMessage.includes("/ralph-loop:cancel-ralph"),
      `stdout=${resNoPromise.stdout}`,
    );
    check(
      "未设完成条件：reason 仍是原始 prompt",
      jsonNoPromise.ok && jsonNoPromise.value.reason === PROMPT,
      `reason=${JSON.stringify(jsonNoPromise.ok ? jsonNoPromise.value.reason : null)}`,
    );

    // 收尾（complete）：命中完成标记时也要有 systemMessage
    const cwdDone = tmpDir();
    writeState(
      cwdDone,
      { iteration: 1, maxIterations: 5, completionPromise: "DONE", sessionId: "s1" },
      PROMPT,
    );
    const resDone = runHook(cwdDone, {
      session_id: "s1",
      last_assistant_message: "全绿了\n<promise>DONE</promise>",
    });
    const jsonDone = readStdoutJson(resDone.stdout);
    check(
      "收尾（complete）：exit 0 且 systemMessage 非空",
      resDone.code === 0 && jsonDone.ok && Boolean(jsonDone.value.systemMessage),
      `exit=${resDone.code} stdout=${resDone.stdout}`,
    );
    check(
      "收尾（complete）：systemMessage 点出命中的完成条件",
      jsonDone.ok && jsonDone.value.systemMessage.includes("<promise>DONE</promise>"),
      `stdout=${resDone.stdout}`,
    );
    check(
      "收尾（complete）：没有 decision（不拦停）",
      jsonDone.ok && !jsonDone.value.decision,
      `stdout=${resDone.stdout}`,
    );

    // 放行：没有循环时别往 stdout 写东西，用户屏幕上不该冒出无关提示
    const cwdPass = tmpDir();
    const resPass = runHook(cwdPass, { session_id: "s1", last_assistant_message: "x" });
    check(
      "放行：stdout 为空（不打扰用户）",
      resPass.code === 0 && resPass.stdout.trim() === "",
      `exit=${resPass.code} stdout=${JSON.stringify(resPass.stdout)}`,
    );
  }

  // ── ⑫ stop_hook_active 不影响判定（CC 的 ralph 也不用它）───────
  console.log("\n⑫ stop_hook_active / permission_mode 传进来也不改变行为");
  {
    const cwd = tmpDir();
    writeState(
      cwd,
      { iteration: 1, maxIterations: 3, completionPromise: "", sessionId: "s1" },
      PROMPT,
    );
    const res = runHook(cwd, {
      session_id: "s1",
      last_assistant_message: "x",
      stop_hook_active: true,
      permission_mode: "acceptEdits",
    });
    const json = readStdoutJson(res.stdout);
    check(
      "stop_hook_active=true 照样喂回（判定只看 iteration）",
      json.ok && json.value.decision === "block",
      `stdout=${res.stdout}`,
    );
  }
} finally {
  // 正常结束、断言失败、用例抛异常都要走到这里
  cleanupTmpDirs();
}

// ── 汇总 ─────────────────────────────────────────────────────
console.log(
  `\n${failures.length === 0 ? "全部通过" : "有失败"}：${passed} 通过，${failures.length} 失败\n`,
);
if (failures.length > 0) {
  for (const failure of failures) console.log(`- ${failure.name}`);
  process.exit(1);
}
