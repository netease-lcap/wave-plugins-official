"use strict";

/**
 * Stop hook with `asyncRewake`: after a turn that changed files, wake the model
 * to review those changes.
 *
 * It runs in the background so the user's reply is not delayed. The hook itself
 * does not review anything — it detects "this turn changed something that has
 * not been reviewed yet" and hands the model an instruction to do the review
 * with a subagent, together with the team's own security guidance. Nothing is
 * found ⇒ exit 0 ⇒ the model is not woken at all.
 */

const {
  readInput,
  stateDir,
  readState,
  writeState,
  emitBlocking,
  isGitRepo,
  changedFiles,
  fingerprint,
  loadGuidance,
  layerEnabled,
} = require("./lib.js");

// Beyond this many files in one turn the review is scoped down rather than
// skipped, and the model is told what it is looking at.
const MAX_FILES = 30;

// Stop is re-entered after every turn, including the review turn itself. Three
// consecutive rounds is where the guidance layer has to hand control back to
// the user instead of looping.
const MAX_CONSECUTIVE_ROUNDS = 3;

function main() {
  const input = readInput();
  const cwd = input.cwd || process.cwd();
  if (!isGitRepo(cwd)) return;
  if (!layerEnabled(cwd, "turn")) return;

  const dir = stateDir(input.session_id);
  const reviewed = readState(dir, "reviewed", {});
  const rounds = readState(dir, "rounds", { count: 0, lastAt: 0 });

  const files = changedFiles(cwd);
  const pending = files.filter(
    ({ file }) => reviewed[file] !== fingerprint(cwd, file),
  );

  if (pending.length === 0) {
    writeState(dir, "rounds", { count: 0, lastAt: Date.now() });
    return;
  }

  if (rounds.count >= MAX_CONSECUTIVE_ROUNDS) {
    // Hand back to the user: the review keeps finding work, so more automatic
    // rounds are not going to converge.
    writeState(dir, "rounds", { ...rounds, lastAt: Date.now() });
    process.stderr.write(
      [
        "Security review: the last rounds kept producing changes and the automatic review has reached its limit. Stop and let the user decide whether to keep going.",
      ].join("\n"),
    );
    process.exit(2);
  }

  const scope = pending.slice(0, MAX_FILES);
  const truncated = pending.length - scope.length;
  const guidance = loadGuidance(cwd);

  const message = [
    "Security review of this turn's changes.",
    "",
    "Changed files that have not been reviewed yet:",
    ...scope.map(({ file, status }) => `- ${file} (${status})`),
    truncated > 0
      ? `- …and ${truncated} more file(s), not covered by this round`
      : "",
    "",
    "Review these changes for security problems a pattern match cannot catch: authorization gaps, privilege escalation, injection that spans call sites, weak crypto, data exposure. The patterns the user already saw are not worth repeating.",
    "",
    "Launch a subagent for the review (Agent tool, general-purpose) and pass it the file list above, so the review is not done by whoever wrote the code. Then fix what it reports, in this session.",
    guidance
      ? "\nThe team's security guidance for this repository, which the review must follow:\n\n" + guidance
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  for (const { file } of scope) {
    const hash = fingerprint(cwd, file);
    if (hash) reviewed[file] = hash;
  }
  writeState(dir, "reviewed", reviewed);
  writeState(dir, "rounds", { count: rounds.count + 1, lastAt: Date.now() });

  emitBlocking(message);
}

try {
  main();
} catch {
  process.exit(0);
}
