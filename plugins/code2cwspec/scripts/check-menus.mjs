#!/usr/bin/env node
/**
 * check-menus.mjs - Validate menu structure from menus.md
 *
 * Usage:
 *   node check-menus.mjs <menus-file.md>
 *
 * Validates menus.md 3-column format:
 *   | 一级功能 | 二级功能 | 功能类别 |
 *
 * Rules:
 *   1. Menu names should be in Chinese (not English)
 *   2. No duplicate menu paths
 *   3. No 逻辑 category items (only 页面 allowed)
 *   4. Must include built-in modules: 登录, 无权限页, 权限中心
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Validation errors found (prints to stderr)
 *   2 - File not found
 */

import fs from 'fs';

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseTables(content) {
  const lines = content.split('\n');
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(s => s.trim()).filter(Boolean);
      // Skip separator lines
      if (cells.every(c => /^[-:]+$/.test(c))) continue;
      rows.push(cells);
    }
  }
  return rows;
}

function hasChinese(str) {
  return /[\u4e00-\u9fff]/.test(str);
}

function isOnlyEnglish(str) {
  return str.length > 0 && !hasChinese(str) && /[a-zA-Z]/.test(str);
}

// ─── Validation ───────────────────────────────────────────────────────────

function validateMenusFile(filePath) {
  const issues = [];

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(2);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseTables(content);

  if (rows.length < 2) {
    issues.push({ rule: 'no-table', message: 'No valid menu table found (need header + data rows)' });
    return issues;
  }

  // First row is header
  const header = rows[0];
  const dataRows = rows.slice(1);
  const seenPaths = new Set();
  const topLevelNames = new Set();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const col1 = (row[0] || '').trim();  // 一级功能
    const col2 = (row[1] || '').trim();  // 二级功能
    const col3 = (row[2] || '').trim();  // 功能类别

    // Rule: No 逻辑 category
    if (col3 === '逻辑') {
      issues.push({
        rule: 'logic-category',
        message: `Menu item "${col1}/${col2}" has 逻辑 category — only 页面 allowed (row ${i + 2})`,
      });
    }

    // Rule: Menu names should be Chinese
    if (col1 && isOnlyEnglish(col1)) {
      issues.push({
        rule: 'english-name',
        message: `一级功能 "${col1}" should be in Chinese (row ${i + 2})`,
      });
    }
    if (col2 && isOnlyEnglish(col2)) {
      issues.push({
        rule: 'english-name',
        message: `二级功能 "${col2}" should be in Chinese (row ${i + 2})`,
      });
    }

    // Build path and check duplicates
    const fullPath = col2 ? `${col1}/${col2}` : col1;
    if (fullPath) {
      if (seenPaths.has(fullPath)) {
        issues.push({
          rule: 'duplicate-path',
          message: `Duplicate menu path: "${fullPath}" (row ${i + 2})`,
        });
      }
      seenPaths.add(fullPath);
    }

    // Track top-level names
    if (col1) topLevelNames.add(col1);
  }

  // Rule: Must include built-in modules
  if (!topLevelNames.has('登录')) {
    issues.push({ rule: 'missing-builtin', message: 'Missing built-in module: 登录' });
  }
  if (!topLevelNames.has('无权限页')) {
    issues.push({ rule: 'missing-builtin', message: 'Missing built-in module: 无权限页' });
  }
  if (!topLevelNames.has('权限中心')) {
    issues.push({ rule: 'missing-builtin', message: 'Missing built-in module: 权限中心' });
  }

  return issues;
}

// ─── Main ─────────────────────────────────────────────────────────────────

const files = process.argv.slice(2).filter(arg => !arg.startsWith('--'));

if (files.length === 0) {
  console.log('Usage: node check-menus.mjs <menus-file.md>');
  console.log('');
  console.log('Validates 3-column menu format: 一级功能 | 二级功能 | 功能类别');
  process.exit(0);
}

const allIssues = [];

for (const file of files) {
  const issues = validateMenusFile(file);
  allIssues.push(...issues);
}

if (allIssues.length > 0) {
  console.error(`Found ${allIssues.length} menu validation issue(s):`);
  for (const issue of allIssues) {
    console.error(`  - [${issue.rule}] ${issue.message}`);
  }
  process.exit(1);
} else {
  console.log(`OK: Menu file(s) passed validation`);
  process.exit(0);
}
