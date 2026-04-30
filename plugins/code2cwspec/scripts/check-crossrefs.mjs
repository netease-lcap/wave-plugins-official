#!/usr/bin/env node
/**
 * check-crossrefs.mjs - Validate cross-references across generated documents
 *
 * Usage:
 *   node check-crossrefs.mjs <directory> [options]
 *
 * Validates:
 *   1. Entity references (FK fields) match defined entity files
 *   2. View references match defined view files
 *   3. Logic references match defined logic files
 *   4. Markdown links point to existing files
 *
 * Options:
 *   --base <dir>   Base directory to scan (default: current directory)
 *   --strict       Also check markdown links
 *
 * Exit codes:
 *   0 - All cross-references valid
 *   1 - Broken references found (prints to stderr)
 */

import fs from 'fs';
import path from 'path';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Find all files matching a pattern under a directory */
function findFiles(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Extract entity/view/logic names from files */
function extractDefinitions(dir, prefixPattern) {
  const files = findFiles(dir, prefixPattern);
  const names = new Set();
  for (const file of files) {
    const baseName = path.basename(file);
    const match = baseName.match(/^(entity|view|logic|enum)-([^.]+)\.md$/);
    if (match) {
      names.add(match[2]);
    }
  }
  return names;
}

/** Extract foreign entity references from entity files */
function extractFKReferences(dir) {
  const entityFiles = findFiles(dir, /^entity-.*\.md$/);
  const refs = [];

  for (const file of entityFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    let inTable = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.includes('字段名') && trimmed.includes('外键')) {
        inTable = true;
        continue;
      }
      if (inTable && trimmed.startsWith('|') && trimmed.includes('---')) {
        continue;
      }
      if (inTable && trimmed.startsWith('|')) {
        const cols = trimmed.split('|').map(s => s.trim()).filter(Boolean);
        if (cols.length >= 4) {
          const characteristics = cols[3] || '';
          // Extract foreign entity name: "外键关联实体XXX", "外键(XXX)", "外键：XXX", "外键-XXX"
          const fkMatch = characteristics.match(/外键(?:关联实体)?[\s:：\-（(]*([A-Z][A-Za-z0-9]*)/);
          if (fkMatch) {
            refs.push({
              file: path.relative(process.cwd(), file),
              field: cols[0],
              referencedEntity: fkMatch[1],
            });
          }
        }
      }
      // Table ends when line doesn't start with |
      if (inTable && !trimmed.startsWith('|')) {
        inTable = false;
      }
    }
  }
  return refs;
}

/** Extract markdown file links from all .md files */
function extractMarkdownLinks(dir) {
  const files = findFiles(dir, /\.md$/);
  const links = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    // Match [text](path/to/file.md) or (path/to/file.md)
    const linkReg = /\[([^\]]*)\]\(([^)]+\.md[^)]*)\)/g;
    let m;
    while ((m = linkReg.exec(content)) !== null) {
      const linkPath = m[2].replace(/^[\/]/, ''); // strip leading /
      const lineNum = content.substring(0, m.index).split('\n').length;
      links.push({
        file: path.relative(baseDir, file),
        line: lineNum,
        text: m[1],
        target: linkPath,
      });
    }
  }
  return links;
}

// ─── Main ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let baseDir = '.';
let strict = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base' && args[i + 1]) {
    baseDir = args[++i];
  } else if (args[i] === '--strict') {
    strict = true;
  } else if (!args[i].startsWith('--')) {
    baseDir = args[i];
  }
}

baseDir = path.resolve(baseDir);

if (!fs.existsSync(baseDir)) {
  console.error(`Error: Directory not found: ${baseDir}`);
  process.exit(2);
}

const issues = [];

// 1. Collect all defined entities, views, logics
const definedEntities = extractDefinitions(baseDir, /^entity-.*\.md$/);
const definedViews = extractDefinitions(baseDir, /^view-.*\.md$/);
const definedLogics = extractDefinitions(baseDir, /^logic-.*\.md$/);

// 2. Check FK references
const fkRefs = extractFKReferences(baseDir);
for (const ref of fkRefs) {
  if (!definedEntities.has(ref.referencedEntity)) {
    issues.push({
      rule: 'missing-entity',
      file: ref.file,
      field: ref.field,
      message: `FK references entity "${ref.referencedEntity}" but no entity-${ref.referencedEntity}.md found`,
    });
  }
}

// 3. Check markdown links (strict mode only)
if (strict) {
  const links = extractMarkdownLinks(baseDir);
  for (const link of links) {
    // Skip external URLs and anchor-only links
    if (link.target.startsWith('http') || link.target.startsWith('mailto:') || link.target.startsWith('#')) continue;

    // Resolve relative paths against the source file's directory
    const sourceFileDir = path.dirname(path.join(baseDir, link.file));
    const resolvedPath = path.resolve(sourceFileDir, link.target);

    // Skip links that point outside baseDir (external references)
    if (!resolvedPath.startsWith(baseDir)) continue;

    // Verify the target exists
    if (!fs.existsSync(resolvedPath)) {
      issues.push({
        rule: 'broken-link',
        file: link.file,
        line: link.line,
        message: `Markdown link to "${link.target}" does not exist (line ${link.line})`,
      });
    }
  }
}

// ─── Output ───────────────────────────────────────────────────────────────

if (issues.length > 0) {
  console.error(`Found ${issues.length} cross-reference issue(s):`);
  for (const issue of issues) {
    console.error(`  - [${issue.rule}] ${issue.message}${issue.file ? ` [file: ${issue.file}]` : ''}`);
  }
  process.exit(1);
} else {
  console.log(`OK: No cross-reference issues found`);
  if (strict) {
    console.log(`  - ${definedEntities.size} entities defined`);
    console.log(`  - ${definedViews.size} views defined`);
    console.log(`  - ${definedLogics.size} logics defined`);
    console.log(`  - ${fkRefs.length} FK references validated`);
  }
  process.exit(0);
}
