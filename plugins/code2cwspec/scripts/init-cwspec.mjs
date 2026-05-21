#!/usr/bin/env node
/**
 * code2cwspec initialization script
 * Creates the cwspec/ directory for generated documents.
 * Flat structure: all .ts and .md files go directly in cwspec/.
 *
 * Usage: node init-cwspec.mjs [--json]
 */

import fs from "fs";

// --- Argument parsing ---
const jsonMode = process.argv.includes("--json");

// --- Fixed output directory ---
const OUTPUT_DIR = "cwspec";

// Create directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// --- Output ---
if (jsonMode) {
  console.log(JSON.stringify({ OUTPUT_DIR }));
} else {
  console.log(`Output: ${OUTPUT_DIR}`);
}
