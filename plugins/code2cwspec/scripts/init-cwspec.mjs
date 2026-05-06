#!/usr/bin/env node
/**
 * code2cwspec initialization script
 * Creates the cwspec/ directory structure for generated documents.
 * Templates are read directly from the plugin directory.
 *
 * Usage: node init-cwspec.mjs [--json]
 */

import fs from "fs";

// --- Argument parsing ---
const jsonMode = process.argv.includes("--json");

// --- Fixed output directory ---
const OUTPUT_DIR = "cwspec";
const REQUIREMENTS_DIR = "cwspec/requirements";
const PLAN_DIR = "cwspec/plan";
const TASKS_DIR = "cwspec/tasks";

// Create directories
for (const dir of [OUTPUT_DIR, REQUIREMENTS_DIR, PLAN_DIR, TASKS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// --- Output ---
if (jsonMode) {
  console.log(JSON.stringify({ OUTPUT_DIR, REQUIREMENTS_DIR, PLAN_DIR, TASKS_DIR }));
} else {
  console.log(`Output: ${OUTPUT_DIR}`);
}
