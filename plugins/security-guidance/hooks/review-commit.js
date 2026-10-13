"use strict";

/**
 * PreToolUse on Bash: when the AI is about to commit or push, hand it an
 * instruction to do the deeper review first.
 *
 * The review is deeper than the end-of-turn one because a commit is a
 * commitment: the model is told to read the callers and validators around each
 * change before deciding whether a suspicious pattern is a real finding. It is
 * delivered as context, not as a block — none of these layers stop an action.
 */

const {
  readInput,
  stateDir,
  readState,
  writeState,
  emitContext,
  isGitRepo,
  changedFiles,
  fingerprint,
  layerEnabled,
} = require("./lib.js");

const COMMIT_OR_PUSH = /(^|[;&|]\s*|&&\s*|\|\|\s*)git\s+(-C\s+\S+\s+)?(commit|push)\b/;
const MAX_REVIEWS_PER_HOUR = 5;

function main() {
  const input = readInput();
  const command = String((input.tool_input || {}).command || "");
  if (!COMMIT_OR_PUSH.test(command)) return;

  const cwd = input.cwd || process.cwd();
  if (!isGitRepo(cwd)) return;
  if (!layerEnabled(cwd, "commit")) return;

  const dir = stateDir(input.session_id);
  const reviewed = readState(dir, "reviewed", {});
  const history = readState(dir, "commitReviews", []);

  const now = Date.now();
  const recent = history.filter((at) => now - at < 60 * 60 * 1000);
  if (recent.length >= MAX_REVIEWS_PER_HOUR) return;

  const pending = changedFiles(cwd).filter(
    ({ file }) => reviewed[file] !== fingerprint(cwd, file),
  );

  // Everything in this change set has already been reviewed at the end of the
  // turn: a clean commit stays silent, and does not use up the review budget.
  if (pending.length === 0) return;

  writeState(dir, "commitReviews", [...recent, now]);

  emitContext(
    "PreToolUse",
    [
      "Security review before this commit or push.",
      "",
      "The changes below are newer than the last review:",
      ...pending.slice(0, 30).map(({ file, status }) => `- ${file} (${status})`),
      "",
      "Do the deeper review now, before relying on this commit: read the callers, validators and neighbouring code around each change to decide whether anything is actually exploitable — a pattern that looks dangerous can be safe here, and a real finding must not reach history. Report what you find, and fix it in this session.",
    ].join("\n"),
  );
}

try {
  main();
} catch {
  process.exit(0);
}
