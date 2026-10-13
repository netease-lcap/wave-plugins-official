"use strict";

/**
 * Shared helpers for the security-guidance hooks.
 *
 * Deliberately dependency-free: a hook runs as a plain node process in the
 * user's repository, so it may not assume anything is installed beyond node
 * itself.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const PLUGIN_ROOT = path.resolve(__dirname, "..");

/** Read and parse the hook payload wave writes to stdin. */
function readInput() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Per-session state directory: dedupe, loop caps and review bookkeeping. */
function stateDir(sessionId) {
  const dir = path.join(
    os.homedir(),
    ".wave",
    "security-guidance",
    "state",
    String(sessionId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_"),
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readState(dir, name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
  } catch {
    return fallback;
  }
}

function writeState(dir, name, value) {
  try {
    fs.writeFileSync(
      path.join(dir, `${name}.json`),
      JSON.stringify(value, null, 2),
    );
  } catch {
    // State is an optimisation (dedupe / caps), never a correctness
    // requirement: a read-only home directory must not break the review.
  }
}

/** JSON output wave reads regardless of the exit code. */
function emitContext(hookEventName, additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName, additionalContext },
    }),
  );
}

/** Failure that must reach the model: stderr + exit 2 (blocking error). */
function emitBlocking(message) {
  process.stderr.write(message.trim() + "\n");
  process.exit(2);
}

function git(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return null;
  return result.stdout || "";
}

function isGitRepo(cwd) {
  return git(cwd, ["rev-parse", "--is-inside-work-tree"]) !== null;
}

/**
 * Changed files in the working tree (staged, unstaged and untracked) with a
 * content hash per file, so callers can tell "nothing new since last look"
 * from "same file, new content".
 */
function changedFiles(cwd) {
  const status = git(cwd, ["status", "--porcelain"]);
  if (status === null) return [];

  const files = [];
  for (const line of status.split("\n")) {
    if (!line.trim()) continue;
    const raw = line.slice(3).trim();
    // Renames are reported as "old -> new"; the new path is what the review
    // has to look at.
    const file = raw.includes(" -> ") ? raw.split(" -> ")[1] : raw;
    files.push({ file, status: line.slice(0, 2).trim() || "?" });
  }
  return files;
}

/** A short, stable fingerprint of a path's current content. */
function fingerprint(cwd, file) {
  const result = spawnSync("git", ["hash-object", "--", file], {
    cwd,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

/**
 * Load the pattern list: built-in rules plus the team's own, in three scopes —
 * user, project, project-local — the same scopes the guidance file has.
 * Custom rules extend the built-in list; they never replace or suppress it.
 */
function loadPatterns(cwd) {
  const sources = [
    path.join(PLUGIN_ROOT, "rules", "dangerous-patterns.json"),
    path.join(os.homedir(), ".wave", "security-guidance-patterns.json"),
    path.join(cwd, ".wave", "security-guidance-patterns.json"),
    path.join(cwd, ".wave", "security-guidance-patterns.local.json"),
  ];

  const patterns = [];
  const MAX_CUSTOM_RULES = 100;
  let customCount = 0;

  for (const source of sources) {
    const isBuiltin = source.startsWith(PLUGIN_ROOT);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(source, "utf8"));
    } catch {
      continue;
    }
    const rules = Array.isArray(parsed) ? parsed : parsed.patterns;
    if (!Array.isArray(rules)) continue;

    for (const rule of rules) {
      if (!rule || !rule.regex) continue;
      if (!isBuiltin) {
        if (customCount >= MAX_CUSTOM_RULES) break;
        customCount += 1;
      }
      try {
        patterns.push({
          id: rule.id || rule.regex,
          name: rule.name || rule.id || "custom pattern",
          regex: new RegExp(rule.regex, rule.flags || "g"),
          message: rule.message || "This pattern is a known source of vulnerabilities.",
          suggestion: rule.suggestion || "",
          files: rule.files ? RegExp(rule.files) : null,
        });
      } catch {
        // A malformed custom rule must not disable the ones that do parse.
      }
    }
  }

  return patterns;
}

/**
 * Load the team's security guidance, concatenated across the three scopes and
 * capped. It is context for whoever performs the review, not a filter: a
 * guidance file asking to ignore a class of findings does not suppress it.
 */
function loadGuidance(cwd) {
  const sources = [
    path.join(os.homedir(), ".wave", "security-guidance.md"),
    path.join(cwd, ".wave", "security-guidance.md"),
    path.join(cwd, ".wave", "security-guidance.local.md"),
  ];
  const MAX_CHARS = 8000;

  const parts = [];
  let used = 0;
  for (const source of sources) {
    let text;
    try {
      text = fs.readFileSync(source, "utf8").trim();
    } catch {
      continue;
    }
    if (!text) continue;
    const remaining = MAX_CHARS - used;
    if (remaining <= 0) break;
    parts.push(text.slice(0, remaining));
    used += Math.min(text.length, remaining);
  }
  return parts.join("\n\n");
}

/**
 * Each layer can be switched off on its own, because they cost very different
 * things: the pattern match runs on every write and can be noisy, the two
 * reviews spend model calls. Project scope wins over user scope.
 */
const DEFAULT_LAYERS = { edits: true, turn: true, commit: true };

function layerEnabled(cwd, layer) {
  const sources = [
    path.join(os.homedir(), ".wave", "security-guidance.json"),
    path.join(cwd, ".wave", "security-guidance.json"),
  ];
  let enabled = DEFAULT_LAYERS[layer];
  for (const source of sources) {
    let config;
    try {
      config = JSON.parse(fs.readFileSync(source, "utf8"));
    } catch {
      continue;
    }
    const value = (config.layers || config)[layer];
    if (typeof value === "boolean") enabled = value;
  }
  return enabled;
}

module.exports = {
  PLUGIN_ROOT,
  readInput,
  stateDir,
  readState,
  writeState,
  emitContext,
  emitBlocking,
  git,
  isGitRepo,
  changedFiles,
  fingerprint,
  loadPatterns,
  loadGuidance,
  layerEnabled,
};
