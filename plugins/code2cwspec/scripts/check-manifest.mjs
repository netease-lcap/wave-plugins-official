#!/usr/bin/env node
/**
 * check-manifest.mjs - Validate generation-manifest.json path conventions
 *
 * Usage:
 *   node check-manifest.mjs <cwspec-dir>
 *
 * Validates:
 *   1. generation-manifest.json exists and is valid JSON
 *   2. All file paths do NOT contain "cwspec/" prefix
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Validation errors found (prints to stderr)
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const dir = args[0];

if (!dir) {
  console.log('Usage: node check-manifest.mjs <cwspec-dir>');
  process.exit(0);
}

const baseDir = path.resolve(dir);
const manifestPath = path.join(baseDir, 'generation-manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`Error: generation-manifest.json not found in ${baseDir}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
} catch (e) {
  console.error(`Error: generation-manifest.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

const issues = [];

for (const [group, files] of Object.entries(manifest)) {
  if (!Array.isArray(files)) continue;
  for (const f of files) {
    if (typeof f === 'string' && (f.startsWith('cwspec/') || f.includes('/cwspec/'))) {
      issues.push(`"${f}" in "${group}" must NOT contain "cwspec/" prefix`);
    }
  }
}

if (issues.length > 0) {
  console.error(`Found ${issues.length} path issue(s):`);
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

const total = Object.values(manifest).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
console.log(`OK: Manifest valid (${total} file(s))`);
