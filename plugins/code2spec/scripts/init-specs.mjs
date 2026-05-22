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
      if (item.isDirectory() && !item.name.startsWith('.')) {
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
 * 解析 --add-specs 参数的 JSON 数组
 * @param {string} input
 * @returns {Array<{shortName: string, title: string}>}
 */
function parseAddSpecs(input) {
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) {
      throw new Error('--add-specs 参数必须是 JSON 数组');
    }
    for (const item of parsed) {
      if (!item.shortName || typeof item.shortName !== 'string') {
        throw new Error('每个规格必须有 shortName 字段');
      }
      if (!item.title || typeof item.title !== 'string') {
        throw new Error('每个规格必须有 title 字段');
      }
    }
    return parsed;
  } catch (error) {
    console.error(`错误: 解析 --add-specs 失败: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
初始化 specs 目录结构

用法:
  node init-specs.mjs [options]

选项:
  --add-specs <json>   批量创建规格目录，JSON 数组格式:
                       [{"shortName":"user-auth","title":"用户认证"},...]
  --help, -h           显示帮助信息

示例:
  node init-specs.mjs --add-specs '[{"shortName":"user-auth","title":"用户认证"},{"shortName":"order-mgmt","title":"订单管理"}]'
    `);
    process.exit(0);
  }

  const repoRoot = process.cwd();
  const specsDir = path.join(repoRoot, 'specs');
  const stateDir = path.join(specsDir, '.state');

  // 创建 specs/ 和 .state/ 目录
  await fs.mkdir(specsDir, { recursive: true });
  await fs.mkdir(stateDir, { recursive: true });

  // 解析 --add-specs 参数
  let addSpecs = [];
  const addSpecsIdx = args.indexOf('--add-specs');
  if (addSpecsIdx !== -1) {
    const jsonInput = args[addSpecsIdx + 1];
    if (!jsonInput) {
      console.error('错误: --add-specs 必须提供一个 JSON 数组');
      process.exit(1);
    }
    addSpecs = parseAddSpecs(jsonInput);
  }

  // 获取当前最大编号
  const highest = await getHighestSpecNumber(specsDir);
  let nextNum = highest + 1;

  // 批量创建规格目录
  const addedSpecs = [];
  for (const spec of addSpecs) {
    const num = nextNum.toString().padStart(3, '0');
    const shortName = spec.shortName.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    const dir = `${num}-${shortName}`;
    const specDir = path.join(specsDir, dir);
    const checklistsDir = path.join(specDir, 'checklists');

    await fs.mkdir(specDir, { recursive: true });
    await fs.mkdir(checklistsDir, { recursive: true });

    addedSpecs.push({
      num,
      shortName,
      dir,
      title: spec.title,
      specFile: path.join(specDir, 'spec.md'),
      checklistFile: path.join(checklistsDir, 'requirements.md')
    });

    nextNum++;
  }

  // 输出结果
  const result = {
    specsDir,
    stateDir,
    addedSpecs
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
