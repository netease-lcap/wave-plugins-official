#!/usr/bin/env node
/**
 * check-crossrefs.mjs - Validate cross-references across generated .ts files
 *
 * Usage:
 *   node check-crossrefs.mjs <directory> [options]
 *
 * Validates:
 *   1. @EntityRelation targets have corresponding entity .ts files
 *   2. app.enums.XXX references have corresponding enum .ts files
 *
 * Options:
 *   --base <dir>   Base directory to scan (default: current directory)
 *
 * Exit codes:
 *   0 - All cross-references valid
 *   1 - Broken references found (prints to stderr)
 */

import fs from 'fs';
import path from 'path';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Find all files matching a pattern under a directory (flat only) */
function findFiles(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() && pattern.test(entry.name)) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

/** Extract defined entity names from .ts files: app.dataSources.defaultDS.entities.XXX.ts */
function extractEntityDefinitions(dir) {
  const entityFiles = findFiles(dir, /^app\.dataSources\.defaultDS\.entities\.[^.]+\.ts$/);
  const names = new Set();
  for (const file of entityFiles) {
    const baseName = path.basename(file);
    // Extract entity name: app.dataSources.defaultDS.entities.Customer.ts → Customer
    const match = baseName.match(/^app\.dataSources\.defaultDS\.entities\.([^.]+)\.ts$/);
    if (match) {
      names.add(match[1]);
    }
  }
  return names;
}

/** Extract defined enum names from .ts files: app.enums.XXX.ts */
function extractEnumDefinitions(dir) {
  const enumFiles = findFiles(dir, /^app\.enums\.[^.]+\.ts$/);
  const names = new Set();
  for (const file of enumFiles) {
    const baseName = path.basename(file);
    const match = baseName.match(/^app\.enums\.([^.]+)\.ts$/);
    if (match) {
      names.add(match[1]);
    }
  }
  return names;
}

/** Extract @EntityRelation references from entity .ts files */
function extractFKReferences(dir) {
  const entityFiles = findFiles(dir, /^app\.dataSources\.defaultDS\.entities\.[^.]+\.ts$/);
  const refs = [];

  for (const file of entityFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const sourceFile = path.relative(process.cwd(), file);

    // Match: @EntityRelation<app.dataSources.defaultDS.entities.TargetEntity['field']>('PROTECT'|'CASCADE')
    const fkRegex = /@EntityRelation<app\.dataSources\.defaultDS\.entities\.([A-Za-z_][A-Za-z0-9_]*)\[['"]([^'"]+)['"]\]>/g;
    let m;
    while ((m = fkRegex.exec(content)) !== null) {
      refs.push({
        file: sourceFile,
        referencedEntity: m[1],
        referencedField: m[2],
      });
    }
  }
  return refs;
}

/** Extract app.enums.XXX references from entity .ts files */
function extractEnumReferences(dir) {
  const entityFiles = findFiles(dir, /^app\.dataSources\.defaultDS\.entities\.[^.]+\.ts$/);
  const refs = [];

  for (const file of entityFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const sourceFile = path.relative(process.cwd(), file);

    // Match: app.enums.EnumName (in type annotations or default values)
    const enumRegex = /app\.enums\.([A-Za-z_][A-Za-z0-9_]*)/g;
    const seen = new Set();
    let m;
    while ((m = enumRegex.exec(content)) !== null) {
      const enumName = m[1];
      const key = `${sourceFile}:${enumName}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({
          file: sourceFile,
          referencedEnum: enumName,
        });
      }
    }
  }
  return refs;
}

// ─── Main ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let baseDir = '.';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base' && args[i + 1]) {
    baseDir = args[++i];
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

// 1. Collect all defined entities and enums
const definedEntities = extractEntityDefinitions(baseDir);
const definedEnums = extractEnumDefinitions(baseDir);

// 2. Check FK references
const fkRefs = extractFKReferences(baseDir);
for (const ref of fkRefs) {
  if (!definedEntities.has(ref.referencedEntity)) {
    issues.push({
      rule: 'missing-entity',
      file: ref.file,
      message: `@EntityRelation references entity "${ref.referencedEntity}" but no corresponding .ts file found`,
    });
  }
}

// 3. Check enum references
const enumRefs = extractEnumReferences(baseDir);
for (const ref of enumRefs) {
  if (!definedEnums.has(ref.referencedEnum)) {
    issues.push({
      rule: 'missing-enum',
      file: ref.file,
      message: `References app.enums.${ref.referencedEnum} but no corresponding .ts file found`,
    });
  }
}

// ─── Output ───────────────────────────────────────────────────────────────

if (issues.length > 0) {
  console.error(`Found ${issues.length} cross-reference issue(s):`);
  for (const issue of issues) {
    console.error(`  - [${issue.rule}] ${issue.message} [file: ${issue.file}]`);
  }
  process.exit(1);
} else {
  console.log(`OK: No cross-reference issues found`);
  console.log(`  - ${definedEntities.size} entities defined`);
  console.log(`  - ${definedEnums.size} enums defined`);
  console.log(`  - ${fkRefs.length} FK references validated`);
  console.log(`  - ${enumRefs.length} enum references validated`);
  process.exit(0);
}
