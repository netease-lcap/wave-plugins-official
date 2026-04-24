#!/usr/bin/env node
/**
 * code2cwspec scaffolding script
 * Creates the .specify/ directory structure and initializes all template files.
 *
 * Usage: node create-cw-feature.mjs <description> [--short-name <name>] [--json]
 */

import fs from "fs";
import path from "path";

// --- Argument parsing ---
const args = process.argv.slice(2);
let jsonMode = false;
let shortName = "";
let description = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") jsonMode = true;
  else if (args[i] === "--short-name" && i + 1 < args.length)
    shortName = args[++i];
  else if (!args[i].startsWith("--")) description += args[i] + " ";
}
description = description.trim();

if (!description && !shortName) {
  console.error(
    "Usage: node create-cw-feature.mjs <description> [--short-name <name>] [--json]",
  );
  process.exit(1);
}

// --- Stop words filter ---
const STOP_WORDS = new Set([
  "我",
  "一个",
  "这个",
  "那个",
  "在",
  "的",
  "了",
  "和",
  "与",
  "从",
  "是",
  "有",
  "做",
  "将",
  "会",
  "应该",
  "可以",
  "能",
  "可能",
  "必须",
  "需要",
  "想",
  "添加",
  "获取",
  "设置",
]);

function generateShortName(input) {
  if (input) {
    const filtered = input
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff\s-]/g, "")
      .split(/[\s-]+/)
      .filter((w) => !STOP_WORDS.has(w))
      .filter(Boolean);
    return filtered.slice(0, 4).join("-").toLowerCase();
  }
  return "unknown-feature";
}

if (!shortName) {
  shortName = generateShortName(description) || "unknown-feature";
}

// --- Determine target directory ---
const targetDir = path.resolve(".code2cwspec");

// --- Auto-numbering ---
let featureNum = 1;
if (fs.existsSync(targetDir)) {
  const entries = fs.readdirSync(targetDir);
  let maxNum = 0;
  for (const e of entries) {
    const m = e.match(/^(\d+)-/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  featureNum = maxNum + 1;
}

const FEATURE_NAME = `${String(featureNum).padStart(3, "0")}-${shortName}`;
const FEATURE_DIR = path.resolve(targetDir, FEATURE_NAME);

// --- Template resolution ---
function getTemplateDir() {
  const projectTemplate = path.resolve("code2cwspec/templates");
  const skillDir = process.env.WAVE_SKILL_DIR || "";
  const skillTemplate = skillDir
    ? path.resolve(skillDir, "templates")
    : path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "code2cwspec",
        "skills",
        "code2cwspec",
        "templates",
      );
  return fs.existsSync(projectTemplate) ? projectTemplate : skillTemplate;
}

// --- Scaffold .specify directory structure ---
const SPECIFY_DIR = path.resolve(".specify");
const SPECS_DIR = path.resolve(SPECIFY_DIR, "templates");
const TEMPLATES_SRC = getTemplateDir();

function copyTemplatesRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyTemplatesRecursive(srcPath, destPath);
    } else if (entry.endsWith("-template.md")) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create .specify/templates/ if not exists
if (!fs.existsSync(SPECS_DIR)) {
  copyTemplatesRecursive(TEMPLATES_SRC, SPECS_DIR);
}

// --- Create feature directory structure ---
// Code analysis artifacts
const ARTIFACTS_DIR = path.resolve(FEATURE_DIR, "artifacts");
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

// Generate output
if (jsonMode) {
  console.log(
    JSON.stringify({
      FEATURE_NAME,
      FEATURE_DIR,
      SPECIFY_DIR,
      SPECS_DIR,
      ARTIFACTS_DIR,
    }),
  );
} else {
  console.log(`Feature: ${FEATURE_NAME}`);
  console.log(`Directory: ${FEATURE_DIR}`);
  console.log(`Specs: ${SPECS_DIR}`);
}
