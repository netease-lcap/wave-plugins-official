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

function fail(message) {
  process.stdout.write(`❌ Ralph 循环没有启动：${message}\n`);
  process.exit(1);
}

/**
 * 从文本里取一个 `--flag value` / `--flag=value` / `--flag "value"`。
 * 只认「前面是空白或行首」的出现位置，避免误伤 prompt 里的同名字样；
 * 取值后把这一段从文本里摘掉，剩下的是 prompt。
 *
 * @returns {{value: string, rest: string} | null}
 */
function takeFlag(text, name) {
  let searchFrom = 0;
  for (;;) {
    const index = text.indexOf(name, searchFrom);
    if (index === -1) return null;
    if (index > 0 && !/\s/.test(text[index - 1])) {
      searchFrom = index + name.length;
      continue;
    }

    let cursor = index + name.length;
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

    const rest = `${text.slice(0, index).replace(/[ \t]+$/, "")}${text.slice(cursor)}`;
    return { value, rest };
  }
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

  const prompt = rest.replace(/^\n+/, "").replace(/\s+$/, "");
  if (!prompt.trim()) {
    fail("没有 prompt。用法：/ralph-loop:ralph-loop <prompt> [--max-iterations N] [--completion-promise TEXT]");
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    fail(`prompt 太长（${prompt.length} 字符，上限 ${MAX_PROMPT_CHARS}）`);
  }

  return { prompt, maxIterations, completionPromise };
}

function start(cwd) {
  const existing = readStateFile(cwd);
  if (existing !== null) {
    fail(
      `这个项目里已经有一个 Ralph 循环了（${STATE_REL_PATH}）。先 ${CANCEL_COMMAND} 再启动新的。`,
    );
  }

  let input;
  try {
    input = require("fs").readFileSync(0, "utf8");
  } catch {
    input = "";
  }

  const { prompt, maxIterations, completionPromise } = parseStartInput(input);

  writeStateFile(
    cwd,
    formatStateText(
      {
        iteration: 0,
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
    `- 迭代上限：${maxIterations > 0 ? `${maxIterations} 轮` : "不限（靠完成标记或手动取消收尾）"}`,
    `- 完成条件：${completionPromise ? `<promise>${completionPromise}</promise>` : "未设"}`,
    `- prompt 正文：${prompt.length} 字符（逐字保存，未做任何改写）`,
  ];
  if (maxIterations === 0) {
    lines.push(
      `- ⚠️ 没有设上限：这个循环只会在输出完成标记或你 ${CANCEL_COMMAND} 时停下`,
    );
  }
  process.stdout.write(`${lines.join("\n")}\n`);
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

  if (action === "start") return start(cwd);
  if (action === "cancel") return cancel(cwd);

  fail(
    `未知子命令「${action || "(空)"}」。用法：ralph-loop.js start|cancel（start 从 stdin 读 prompt）`,
  );
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
