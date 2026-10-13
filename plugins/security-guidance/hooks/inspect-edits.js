"use strict";

/**
 * PostToolUse: compare a file the AI just wrote against the dangerous-pattern
 * list, and hand any hit to the model as additional context.
 *
 * This layer has to stay cheap — it runs on every write — so it is a pure
 * string match with no model call, and it reports each (file, rule) pair at
 * most once per session.
 */

const fs = require("fs");
const path = require("path");
const {
  readInput,
  stateDir,
  readState,
  writeState,
  emitContext,
  loadPatterns,
  layerEnabled,
} = require("./lib.js");

const MAX_FINDINGS = 5;

function main() {
  const input = readInput();
  const toolInput = input.tool_input || {};
  const cwd = input.cwd || process.cwd();

  if (!layerEnabled(cwd, "edits")) return;

  const filePath = toolInput.file_path || toolInput.notebook_path;
  if (!filePath) return;

  // Read the file as it now exists on disk rather than trusting the tool
  // input: for `Edit` the input only carries the replaced fragment, and a
  // partial read would miss patterns elsewhere in the file.
  let content;
  try {
    content = fs.readFileSync(path.resolve(cwd, filePath), "utf8");
  } catch {
    return;
  }

  const dir = stateDir(input.session_id);
  const reported = new Set(readState(dir, "reported", []));
  const relative = path.relative(cwd, path.resolve(cwd, filePath)) || filePath;

  const findings = [];
  for (const pattern of loadPatterns(cwd)) {
    if (pattern.files && !pattern.files.test(relative)) continue;
    const key = `${relative}::${pattern.id}`;
    if (reported.has(key)) continue;

    pattern.regex.lastIndex = 0;
    const match = pattern.regex.exec(content);
    if (!match) continue;

    const line = content.slice(0, match.index).split("\n").length;
    findings.push({ key, pattern, line, snippet: match[0].slice(0, 160) });
    if (findings.length > MAX_FINDINGS) break;
  }

  if (findings.length === 0) return;

  const body = [
    "Security guidance: the file you just wrote matches known dangerous patterns. Fix these in the same session, before moving on.",
    "",
    ...findings.map(({ pattern, line, snippet }) =>
      [
        `- ${relative}:${line} — ${pattern.name}`,
        `  Matched: \`${snippet.replace(/\n/g, " ")}\``,
        `  ${pattern.message}`,
        pattern.suggestion ? `  Suggested fix: ${pattern.suggestion}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "",
    "This is a pattern match, not a verdict: if the finding is a false positive, say so and continue — do not change working code to silence it.",
  ].join("\n");

  emitContext("PostToolUse", body);

  for (const finding of findings) reported.add(finding.key);
  writeState(dir, "reported", [...reported]);
}

try {
  main();
} catch {
  // Fail open: a broken guidance hook must never break the user's edit.
  process.exit(0);
}
