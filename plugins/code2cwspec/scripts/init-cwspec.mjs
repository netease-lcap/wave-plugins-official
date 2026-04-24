#!/usr/bin/env node
/**
 * code2cwspec initialization script
 * Creates the cwspec/ directory structure and loads CodeWave templates into .specify/templates/.
 *
 * Usage: node init-cwspec.mjs [--json]
 */

import fs from "fs";
import path from "path";

// --- Argument parsing ---
const jsonMode = process.argv.includes("--json");

// --- Fixed output directory ---
const OUTPUT_DIR = path.resolve("cwspec");

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

// --- Scaffold output directory structure ---
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

// Copy templates to .specify/templates/
if (!fs.existsSync(SPECS_DIR)) {
  copyTemplatesRecursive(TEMPLATES_SRC, SPECS_DIR);
}

// Create cwspec/ subdirectories
const REQUIREMENTS_DIR = path.resolve(OUTPUT_DIR, "requirements");
const PLAN_DIR = path.resolve(OUTPUT_DIR, "plan");
const TASKS_DIR = path.resolve(OUTPUT_DIR, "tasks");

fs.mkdirSync(REQUIREMENTS_DIR, { recursive: true });
fs.mkdirSync(PLAN_DIR, { recursive: true });
fs.mkdirSync(TASKS_DIR, { recursive: true });

// --- Output ---
if (jsonMode) {
  console.log(
    JSON.stringify({
      OUTPUT_DIR,
      SPECIFY_DIR,
      SPECS_DIR,
      REQUIREMENTS_DIR,
      PLAN_DIR,
      TASKS_DIR,
    }),
  );
} else {
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Templates: ${SPECS_DIR}`);
}
