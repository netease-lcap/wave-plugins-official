#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 获取 specs 目录中最高的编号
 * @param {string} specsDir 
 * @returns {Promise<number>}
 */
async function getHighestSpecNumber(specsDir) {
  try {
    const items = await fs.readdir(specsDir, { withFileTypes: true });
    let highest = 0;
    for (const item of items) {
      if (item.isDirectory()) {
        const match = item.name.match(/^(\d+)/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > highest) {
            highest = number;
          }
        }
      }
    }
    return highest;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
}

/**
 * 生成功能名称，过滤停用词
 * @param {string} description 
 * @param {Set<string>} [stopWords] 
 * @returns {string}
 */
function generateFeatureName(description, stopWords) {
  if (!stopWords) {
    stopWords = new Set([
      '我', '一个', '这个', '那个', '在', '的', '了', '和', '与', 
      '从', '是', '有', '做', '将', '会', '应该', '可以', '能', 
      '可能', '必须', '需要', '想', '添加', '获取', '设置'
    ]);
  }

  // 转换为小写并提取字母数字字符和中文
  const cleanName = description.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ');
  
  // 分割成词并过滤
  const words = cleanName.split(/\s+/);
  const meaningfulWords = [];
  
  for (const word of words) {
    if (!word) continue;
    // 保留不是停用词且长度 >= 2 的词
    if (!stopWords.has(word) && word.length >= 2) {
      meaningfulWords.push(word);
    }
  }
  
  // 使用前 3-4 个有意义的词
  if (meaningfulWords.length > 0) {
    const maxWords = meaningfulWords.length === 4 ? 4 : 3;
    return meaningfulWords.slice(0, maxWords).join('-');
  } else {
    // 回退逻辑
    let fallback = description.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-');
    fallback = fallback.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    const parts = fallback.split('-').filter(p => p);
    return parts.slice(0, 3).join('-');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`
生成功能规格说明文档

用法:
  node create-new-feature.mjs <description> [options]

参数:
  description           功能描述

选项:
  --json                以 JSON 格式输出
  --short-name <name>   提供自定义的简短名称（2-4 个词）作为功能名
  --help, -h            显示帮助信息

示例:
  node create-new-feature.mjs "添加用户认证系统" --short-name "用户认证"
  node create-new-feature.mjs "实现 OAuth2 集成接口" --json
    `);
    process.exit(0);
  }

  let description = '';
  let isJson = false;
  let shortName = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      isJson = true;
    } else if (args[i] === '--short-name') {
      shortName = args[++i];
      if (shortName === undefined) {
        console.error('错误: --short-name 必须提供一个值');
        process.exit(1);
      }
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
生成功能规格说明文档

用法:
  node create-new-feature.mjs <description> [options]

参数:
  description           功能描述

选项:
  --json                以 JSON 格式输出
  --short-name <name>   提供自定义的简短名称（2-4 个词）作为功能名
  --help, -h            显示帮助信息

示例:
  node create-new-feature.mjs "添加用户认证系统" --short-name "用户认证"
  node create-new-feature.mjs "实现 OAuth2 集成接口" --json
      `);
      process.exit(0);
    } else if (!description) {
      description = args[i];
    }
  }

  if (!description) {
    console.error('错误: 必须提供功能描述');
    process.exit(1);
  }

  // 确定仓库根目录：永远指向当前工作目录
  const repoRoot = process.cwd();
  const scriptDir = __dirname;

  // 创建 specs 目录
  const specsDir = path.join(repoRoot, 'specs');
  await fs.mkdir(specsDir, { recursive: true });

  // 获取下一个编号
  const highest = await getHighestSpecNumber(specsDir);
  const nextNum = highest + 1;
  const featureNum = nextNum.toString().padStart(3, '0');

  // 生成功能名称
  let featureSuffix;
  if (shortName) {
    featureSuffix = shortName.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  } else {
    featureSuffix = generateFeatureName(description);
  }

  const featureName = `${featureNum}-${featureSuffix}`;

  // 创建功能目录和子目录
  const featureDir = path.join(specsDir, featureName);
  await fs.mkdir(featureDir, { recursive: true });

  // 创建 checklists 子目录
  const checklistsDir = path.join(featureDir, 'checklists');
  await fs.mkdir(checklistsDir, { recursive: true });

  // 查找并复制模板
  const pluginDir = path.dirname(scriptDir);
  const templatePaths = [
    path.join(repoRoot, 'code2spec', 'templates', 'spec-template.md'),
    path.join(pluginDir, 'templates', 'spec-template.md')
  ];

  const specFile = path.join(featureDir, 'spec.md');
  let templateFound = false;

  for (const templatePath of templatePaths) {
    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      await fs.writeFile(specFile, content, 'utf-8');
      templateFound = true;
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  if (!templateFound) {
    await fs.writeFile(specFile, '', 'utf-8');
  }

  // 输出结果
  if (isJson) {
    const result = {
      FEATURE_NAME: featureName,
      SPEC_FILE: specFile,
      FEATURE_NUM: featureNum
    };
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`FEATURE_NAME: ${featureName}`);
    console.log(`SPEC_FILE: ${specFile}`);
    console.log(`FEATURE_NUM: ${featureNum}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
