#!/usr/bin/env node
/**
 * check-menus.mjs - Validate menu structure from markdown files
 *
 * Usage:
 *   node check-menus.mjs <menus-file.md> [menus-file.md] ...
 *
 * Validates:
 *   1. Menu names should be in Chinese (not English)
 *   2. No duplicate menu paths
 *   3. Valid menu hierarchy (child menus must have parent)
 *   4. At least one menu item per file
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Validation errors found (prints to stderr)
 *   2 - File not found or read error
 */

import fs from 'fs';
import path from 'path';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Parse markdown tables from file content */
function parseTables(content) {
  const lines = content.split('\n');
  const tables = [];
  let currentTable = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      if (!inTable) inTable = true;
      const cells = trimmed
        .split('|')
        .map(s => s.trim())
        .filter(Boolean);
      // Skip separator lines
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue;
      }
      currentTable.push(cells);
    } else {
      if (currentTable.length > 0) {
        tables.push(currentTable);
        currentTable = [];
      }
      inTable = false;
    }
  }
  if (currentTable.length > 0) {
    tables.push(currentTable);
  }
  return tables;
}

/** Check if a string contains Chinese characters */
function hasChinese(str) {
  return /[\u4e00-\u9fff]/.test(str);
}

/** Check if a string is primarily English (no Chinese) */
function isOnlyEnglish(str) {
  return str.length > 0 && !hasChinese(str) && /[a-zA-Z]/.test(str);
}

// ─── Validation Rules ─────────────────────────────────────────────────────

function validateMenuFile(filePath) {
  const issues = [];

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(2);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const tables = parseTables(content);

  if (tables.length === 0) {
    issues.push({ file: filePath, rule: 'no-table', message: 'No menu table found in file' });
    return issues;
  }

  // Use the first table found (menu table)
  const rows = tables[0];
  const seenPaths = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Menu rows typically have: level1 | level2 | level3 | category | description
    // The last non-empty cell before category/description is the menu name

    // Find category cell (页面 or 逻辑)
    const categoryIndex = row.findIndex(cell => cell === '页面' || cell === '逻辑');
    const menuCells = categoryIndex > 0 ? row.slice(0, categoryIndex) : row;

    // Check each menu level cell
    for (let j = 0; j < menuCells.length; j++) {
      const cell = menuCells[j].trim();
      if (!cell) continue;

      // Rule 1: Menu names should be in Chinese
      if (isOnlyEnglish(cell)) {
        issues.push({
          file: filePath,
          row: i + 1,
          level: j + 1,
          rule: 'english-name',
          message: `Menu name "${cell}" should be in Chinese (row ${i + 1}, level ${j + 1})`,
        });
      }
    }

    // Rule 2: Build path and check for duplicates
    const fullPath = menuCells.filter(Boolean).join('/');
    if (fullPath) {
      if (seenPaths.has(fullPath)) {
        issues.push({
          file: filePath,
          row: i + 1,
          rule: 'duplicate-path',
          message: `Duplicate menu path: "${fullPath}" (row ${i + 1})`,
        });
      }
      seenPaths.add(fullPath);
    }

    // Rule 3: Valid hierarchy - if a lower level is filled, parent should exist
    // (simplified: if column j+1 has value but column j is empty, it's an orphan)
    let lastFilled = -1;
    for (let j = 0; j < menuCells.length; j++) {
      if (menuCells[j].trim()) {
        if (j > lastFilled + 1 && lastFilled >= 0) {
          // There's a gap - orphan child
          issues.push({
            file: filePath,
            row: i + 1,
            rule: 'orphan-menu',
            message: `Orphan menu at level ${j + 1}, missing parent (row ${i + 1})`,
          });
        }
        lastFilled = j;
      }
    }
  }

  return issues;
}

// ─── Main ─────────────────────────────────────────────────────────────────

const files = process.argv.slice(2).filter(arg => !arg.startsWith('--'));

if (files.length === 0) {
  console.log('Usage: node check-menus.mjs <menus-file.md> [menus-file.md] ...');
  console.log('');
  console.log('Checks:');
  console.log('  - Menu names should be in Chinese');
  console.log('  - No duplicate menu paths');
  console.log('  - Valid menu hierarchy (no orphan children)');
  console.log('  - At least one menu table per file');
  console.log('');
  console.log('Examples:');
  console.log('  node check-menus.mjs plan/menus.md');
  console.log('  node check-menus.mjs plan/menus.md plan/admin-menus.md');
  process.exit(0);
}

const allIssues = [];

for (const file of files) {
  const issues = validateMenuFile(file);
  allIssues.push(...issues);
}

if (allIssues.length > 0) {
  console.error(`Found ${allIssues.length} menu validation issue(s):`);
  for (const issue of allIssues) {
    console.error(`  - [${issue.rule}] ${issue.message}`);
  }
  process.exit(1);
} else {
  console.log(`OK: All ${files.length} menu file(s) passed validation`);
  process.exit(0);
}
