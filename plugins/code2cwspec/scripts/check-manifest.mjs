#!/usr/bin/env node
/**
 * check-manifest.mjs - Validate generation-manifest.json structure and fields
 *
 * Usage:
 *   node check-manifest.mjs <cwspec-dir>
 *
 * Validates:
 *   1. generation-manifest.json exists and is valid JSON
 *   2. Top-level keys are valid groups: spec, menus, enums, entities
 *   3. Each group value is a non-empty array of strings
 *   4. spec group contains exactly ["spec.md"]
 *   5. menus group contains exactly ["menus.md"]
 *   6. enums files match pattern: app.enums.<Name>.ts
 *   7. entities files match pattern: app.dataSources.defaultDS.entities.<Name>.ts
 *   8. No file path contains "cwspec/" prefix
 *   9. No duplicate file paths within or across groups
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Validation errors found (prints to stderr)
 */

import fs from 'fs';
import path from 'path';

const VALID_GROUPS = ['spec', 'menus', 'enums', 'entities'];

const GROUP_RULES = {
  spec: {
    expect: ['spec.md'],
    pattern: /^spec\.md$/,
  },
  menus: {
    expect: ['menus.md'],
    pattern: /^menus\.md$/,
  },
  enums: {
    pattern: /^app\.enums\.[A-Za-z_][A-Za-z0-9_]*\.ts$/,
  },
  entities: {
    pattern: /^app\.dataSources\.defaultDS\.entities\.[A-Za-z_][A-Za-z0-9_]*\.ts$/,
  },
};

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

// Check: must be a plain object
if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
  console.error('Error: generation-manifest.json must be a JSON object with group keys');
  process.exit(1);
}

const groups = Object.keys(manifest);

// Check: no unknown groups
for (const g of groups) {
  if (!VALID_GROUPS.includes(g)) {
    issues.push(`Unknown group "${g}" — valid groups are: ${VALID_GROUPS.join(', ')}`);
  }
}

// Check: each valid group is a non-empty array of strings
for (const g of VALID_GROUPS) {
  if (!(g in manifest)) {
    issues.push(`Missing required group "${g}"`);
    continue;
  }
  const val = manifest[g];
  if (!Array.isArray(val)) {
    issues.push(`Group "${g}" must be an array, got ${typeof val}`);
    continue;
  }
  if (val.length === 0) {
    issues.push(`Group "${g}" must not be empty`);
    continue;
  }
  for (const f of val) {
    if (typeof f !== 'string') {
      issues.push(`Group "${g}" contains non-string entry: ${JSON.stringify(f)}`);
    }
  }
}

// Check: file patterns per group
for (const g of VALID_GROUPS) {
  if (!(g in manifest) || !Array.isArray(manifest[g])) continue;
  const rule = GROUP_RULES[g];

  for (const f of manifest[g]) {
    if (typeof f !== 'string') continue;

    // cwspec/ prefix check
    if (f.startsWith('cwspec/') || f.includes('/cwspec/')) {
      issues.push(`"${f}" in "${g}" must NOT contain "cwspec/" prefix`);
    }

    // pattern check
    if (!rule.pattern.test(f)) {
      issues.push(`"${f}" in "${g}" does not match expected pattern`);
    }
  }

  // exact-match check for spec/menus
  if (rule.expect) {
    const sorted = [...manifest[g]].sort();
    const expected = [...rule.expect].sort();
    if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
      issues.push(`Group "${g}" must be exactly ${JSON.stringify(rule.expect)}, got ${JSON.stringify(manifest[g])}`);
    }
  }
}

// Check: no duplicates across all groups
const allFiles = [];
for (const g of VALID_GROUPS) {
  if (!(g in manifest) || !Array.isArray(manifest[g])) continue;
  for (const f of manifest[g]) {
    if (typeof f === 'string') allFiles.push({ file: f, group: g });
  }
}
const seen = {};
for (const { file, group } of allFiles) {
  if (seen[file]) {
    issues.push(`Duplicate file "${file}" found in both "${seen[file]}" and "${group}"`);
  } else {
    seen[file] = group;
  }
}

if (issues.length > 0) {
  console.error(`Found ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

const total = allFiles.length;
const summary = VALID_GROUPS.map(g => `${g}: ${Array.isArray(manifest[g]) ? manifest[g].length : 0}`).join(', ');
console.log(`OK: Manifest valid (${total} file(s) — ${summary})`);
