#!/usr/bin/env node
/**
 * 检查文档中的占位符残留、路径格式和行号格式问题
 *
 * 用法: node check-placeholders.mjs <directory>
 * 示例: node check-placeholders.mjs cwspec/
 */

import fs from 'fs';
import path from 'path';

// 占位符模式
const PLACEHOLDER_PATTERNS = [
  /\[([A-Z_]{2,})\]/g,           // [FEATURE], [PLACEHOLDER], [TODO]
  /\[([\u4e00-\u9fa5]+)\](?!\()/g,  // [占位符] 后面不跟 (url) 的才是真占位符
  /PENDING/g,
  /TBD/gi,
  /FIXME/gi,
  /TODO/g,
];

// 短路径模式：匹配不带路径前缀的 kebab-case .md 引用（排除代码块内）
// 支持: view-xxx.md, logic-xxx.md, entity-xxx.md, enum-xxx.md
const SHORT_PATH_PATTERN = /(?<!```[\s\S]*?)(?<!\([^)]*?)(?:^|[\s(])(view-|logic-|entity-|enum-)[a-zA-Z0-9_-]+\.md(?!.*?\))/gm;

// 行号简写模式：[L10] 而非 [L10,20]
const LINE_SHORTHAND_PATTERN = /\[L(\d+)\](?!,)/g;

function findMarkdownFiles(dir) {
  const files = [];
  
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        files.push(full);
      }
    }
  }
  
  walk(dir);
  return files;
}

function checkPlaceholders(filePath, content) {
  const issues = [];
  
  for (const pattern of PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split('\n').length;
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'placeholder',
        message: `占位符残留: "${match[0]}"`,
      });
    }
  }
  
  return issues;
}

function checkLineFormats(filePath, content) {
  const issues = [];
  
  // 检查行号简写
  LINE_SHORTHAND_PATTERN.lastIndex = 0;
  let match;
  while ((match = LINE_SHORTHAND_PATTERN.exec(content)) !== null) {
    const lineNum = content.slice(0, match.index).split('\n').length;
    issues.push({
      file: filePath,
      line: lineNum,
      type: 'line-format',
      message: `行号格式错误: "${match[0]}" 应为 "[L${match[1]},XX]"`,
    });
  }
  
  return issues;
}

/** Check if a .md reference path is a valid Chinese-named path like plan/data-model/权限中心-实体-用户（LcapUser）.md */
function isChineseNamedPath(ref) {
  // Chinese filename pattern: contains Chinese characters and full-width parentheses
  return /[\u4e00-\u9fa5]/.test(ref) && /[（(][^）)]+[）)]/.test(ref);
}

function checkPaths(filePath, content) {
  const issues = [];
  
  // 逐行检查避免误判代码块
  const lines = content.split('\n');
  let inCodeBlock = false;
  
  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    
    if (inCodeBlock) return;
    
    // 检查短路径引用 (kebab-case: view-xxx.md, logic-xxx.md, entity-xxx.md, enum-xxx.md)
    if (/(?:^|[\s(])(view-|logic-|entity-|enum-)[a-zA-Z0-9_-]+\.md/.test(line)) {
      issues.push({
        file: filePath,
        line: idx + 1,
        type: 'short-path',
        message: `短路径引用: 请使用完整路径 (如 "plan/frontend/权限中心-登录页（login）.md")`,
      });
    }
    
    // 检查不完整路径
    if (!line.includes('http')) {
      // 1. 提取 Markdown 链接 URL 部分 (xxx.md) → 这些是有效链接，跳过
      const linkUrls = new Set();
      for (const m of line.matchAll(/\(([^)]+\.md(?:#[a-zA-Z0-9_-]+)?)\)/g)) {
        linkUrls.add(m[1]);
      }

      // 2. 提取行内所有 .md 路径引用（包括链接文本中的和纯文本中的）
      // Support Chinese characters in paths
      for (const m of line.matchAll(/([a-zA-Z\u4e00-\u9fa5_./\-（）\(\)][a-zA-Z0-9\u4e00-\u9fa5_./\-（）\(\)]*\.md)/g)) {
        const ref = m[1];
        // 已在链接 URL 中的跳过
        if (linkUrls.has(ref)) continue;
        // 以 plan/ 或 inputs/ 或 requirements/ 开头的有效路径跳过
        if (ref.startsWith('plan/') || ref.startsWith('inputs/') || ref.startsWith('requirements/')) continue;
        // Chinese-named paths with full directory prefix are valid
        if (isChineseNamedPath(ref)) continue;
        // 其余孤立 .md 引用报不完整
        issues.push({
          file: filePath,
          line: idx + 1,
          type: 'incomplete-path',
          message: `路径不完整: "${ref}" 缺少 plan/ 或 inputs/ 前缀`,
        });
      }
    }
  });
  
  return issues;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('检查文档中的占位符残留、路径格式和行号格式问题');
    console.log('');
    console.log('用法: node check-placeholders.mjs <directory>');
    console.log('示例: node check-placeholders.mjs cwspec/');
    console.log('');
    console.log('检查项:');
    console.log('  - 占位符残留 ([FEATURE], [占位符], PENDING, TODO 等)');
    console.log('  - 路径格式 (短路径、不完整路径)');
    console.log('  - 行号格式 ([L10] 应为 [L10,20])');
    process.exit(0);
  }
  
  const targetDir = path.resolve(args[0]);
  
  if (!fs.existsSync(targetDir)) {
    console.error(`错误: 目录 "${targetDir}" 不存在`);
    process.exit(1);
  }
  
  const files = findMarkdownFiles(targetDir);
  console.log(`扫描 ${files.length} 个 Markdown 文件...\n`);
  
  const allIssues = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relPath = path.relative(process.cwd(), file);
    
    allIssues.push(...checkPlaceholders(relPath, content));
    allIssues.push(...checkLineFormats(relPath, content));
    allIssues.push(...checkPaths(relPath, content));
  }
  
  if (allIssues.length > 0) {
    console.error(`发现 ${allIssues.length} 个问题:\n`);
    
    const grouped = {};
    for (const issue of allIssues) {
      const key = `${issue.type} (${issue.message.split(':')[0]})`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(issue);
    }
    
    for (const [group, issues] of Object.entries(grouped)) {
      console.error(`\n## ${group}: ${issues.length} 个问题`);
      for (const issue of issues.slice(0, 10)) {
        console.error(`  - ${issue.file}:${issue.line} - ${issue.message}`);
      }
      if (issues.length > 10) {
        console.error(`  ... 还有 ${issues.length - 10} 个`);
      }
    }
    
    process.exit(1);
  } else {
    console.log('OK: 所有文档格式正确，无占位符残留');
    process.exit(0);
  }
}

main();
