import fs from 'fs';
import path from 'path';

import {
  PENDING,
  FOREIGN,
  IMPORTANT,
  getTextInRange,
  getTextInBetween,
  getActiveSpecDir,
  getPathReg,
  readFile,
  readdirSync,
  readFileSync,
  readJSONSync,
  relativeFilePathToBundle,
  findUnderSpecs,
  filterUnderSpecs,
  removeUnderSpecs,
  omitContentByTitleKeywords,
  getAbsoluteFilePathWhenExisted,
} from './tools.mjs';

import { parseQuote, parseTitle, parseToList, parseOnlyForTitile } from './parse.mjs';

/**
 * 要省略的关键词列表
 *
 * @description 在文件处理时，包含这些关键词的内容会被省略或替换
 * 默认包含：【当前业务功能无关】
 *
 * @type {Array<string>}
 */
export const omitKeywords = [FOREIGN.NONMATCHED];

/**
 * 将绝对路径转换为相对路径
 *
 * @description 移除根目录前缀，将绝对路径转换为相对路径
 * 同时处理特殊的路径格式（如 Markdown 链接中的路径）
 * 并规范化 specs 目录引用为当前活跃的规范目录
 *
 * @param {string} rootDir - 项目根目录
 *
 * @returns {Function} 返回一个函数，接收源路径参数
 *
 * @example
 * const converter = toRelativeFilePath('/path/to/project');
 * converter('/path/to/project/specs/001-crm/plan/index.md')
 * // 返回 'specs/001-crm/plan/index.md'
 *
 * // 规范化 specs 目录引用
 * converter('/path/to/project/some/path/specs/001-crm/plan/index.md')
 * // 返回 'specs/001-crm/plan/index.md'
 */
export const toRelativeFilePath = (rootDir) => (source) => {
  rootDir = rootDir || process.cwd();

  const activeSpecDir = getActiveSpecDir(rootDir) || '';
  const specFolder = activeSpecDir.replace(`${rootDir}/`, '');

  return source
    .replace(rootDir, '')
    .replace(/^\//g, '')
    .replace(/\(\//g, '(')
    .replace(/,L(?=[0-9])+/g, ',')
    .replace(/([0-9a-zA-Z\/\-]+\/)(?=specs\/)/g, '')
    .replace(/specs\/[0-9]{3,3}[^/]+/g, specFolder);
};

/**
 * 将文件路径转换为 Markdown 链接字符串
 *
 * @description 根据文件路径读取文件标题，生成 Markdown 格式的链接
 * 支持缓存以提高性能
 *
 * @param {string} rootDir - 项目根目录
 * @param {Object} store - 缓存对象，存储已处理的路径
 * @param {Array<string>} filePaths - 文件路径列表
 *
 * @returns {Function} 返回一个函数，接收源路径参数
 *
 * @example
 * const converter = filePathToString('/path/to/project', {}, []);
 * converter('plan/index.md')
 * // 返回 '[项目设计](specs/001-crm/plan/index.md)'
 */
export const filePathToString =
  (rootDir, store = {}, filePaths = []) =>
  (source) => {
    rootDir = rootDir || process.cwd();

    const activeSpecDir = getActiveSpecDir(rootDir);
    const targetRelativePath = toRelativeFilePath(rootDir)(source);

    const useful = /^(inputs|specs)/g.test(targetRelativePath);
    const find = (item) => item?.endsWith(targetRelativePath);
    const bundle = !useful && findUnderSpecs(rootDir)(find);

    let targetAbsolutePath = path.resolve(rootDir, targetRelativePath);

    if (store[targetAbsolutePath]) {
      return store[targetAbsolutePath];
    }

    if (!fs.existsSync(targetAbsolutePath)) {
      const found = filePaths.find((item) => item.endsWith(targetAbsolutePath));
      targetAbsolutePath = path.resolve(activeSpecDir, targetRelativePath);
    }

    if (!fs.existsSync(targetAbsolutePath)) {
      return targetRelativePath;
    }

    const targetContent = readFileSync(targetAbsolutePath.trim());

    if (targetContent.includes(PENDING)) {
      return targetRelativePath;
    }

    const title = parseTitle(targetContent) || '关联文档';
    const replaced = title.replace(/[\[\]\(\)]+/g, '');

    const quoteFilePath = bundle?.quoteFilePath || targetRelativePath;

    store[targetAbsolutePath] = `[${replaced}](${quoteFilePath})`;
    return store[targetAbsolutePath];
  };

/**
 * 文档文件过滤器
 *
 * @description 判断文件是否应该被处理
 * 排除特定的持久化配置文件和临时文件
 *
 * @param {string} item - 文件路径
 *
 * @returns {boolean} 如果应该处理返回 true
 *
 * @example
 * filterForDocuments('plan/index.md') // 返回 true
 * filterForDocuments('requirements/persistent/content.md') // 返回 false
 */
export const filterForDocuments = (item = '') => {
  const keywords = [
    'plan/frontend/routes.md',
    'requirements/persistent/content.md',
    'requirements/persistent/ignore-section.md',
    'requirements/persistent/ignore-content.md',
    'requirements/persistent/content-',
    'requirements/persistent/design-',
    'requirements/persistent/ignored-content-',
  ];

  const some = (keyword) => !item.includes(keyword);
  const useful = keywords.every(some);

  return useful;
};

/**
 * 匹配所有项的过滤器
 *
 * @description 总是返回 true，用于不需要条件过滤的场景
 *
 * @returns {boolean} 总是返回 true
 */
export const matchAll = () => true;

/**
 * 文件内容处理器列表
 *
 * @description 定义了一系列文件内容处理规则
 * 每个处理器可以有条件匹配和替换函数
 * 按顺序应用到文件内容
 *
 * @type {Array<Object>}
 * @property {Function} match - 条件匹配函数（可选）
 * @property {Function} replace - 内容替换函数
 *
 * @example
 * // 处理器会按顺序应用：
 * // 1. 移除所有 HTML 注释
 * // 2. 为前端视图文件添加设计链接
 * // 3. 省略无关内容
 * // 4. 修复表格格式
 * // 5. 合并多余的空行
 */
export const handlers = [
  {
    replace: (rootDir) => (source) =>
      source.replace(/<!--[^<>]*-->/g, (string) => {
        return string === PENDING ? string : '';
      }),
  },
  {
    match: (item) => item?.includes?.('plan/frontend/view-'),
    replace: (rootDir) => (source, absoluteFilePath) => {
      // 使用 parseOnlyForTitile 解析文件的中文标题
      const parsed = parseOnlyForTitile(source) || {};
      const { cn, title } = parsed;

      if (!cn || !title) {
        return source;
      }

      const replaceForRequirementLink = (label, relativeFilePath) => (current) => {
        const absoluteFilePath = getAbsoluteFilePathWhenExisted(rootDir)(relativeFilePath);

        if (!absoluteFilePath || current.includes(relativeFilePath)) {
          return current;
        }

        const defaultPrefix = `${title}\n`;
        const reg = /\-[^\n]*生成时间[^\n]+/g;
        const [prefix = defaultPrefix] = current.match(reg) || [];
        const replacement = `${prefix}\n- **${label}**：${absoluteFilePath}\n`;

        return current.replace(prefix, replacement);
      };

      const replaceForDesign = replaceForRequirementLink(
        '视觉需求',
        `requirements/standard/design-${cn}.md`,
      );

      const replaceForChecklistModule = replaceForRequirementLink(
        '需求要点',
        `requirements/persistent/checklist-module-${cn}.md`,
      );

      const callbacks = [replaceForDesign, replaceForChecklistModule];
      const reduce = (current, callback) => callback(current);

      return callbacks.reduce(reduce, source);
    },
  },
  {
    match: (item) => item?.includes?.('plan/ui-design.md'),
    replace: (rootDir) => (source, absoluteFilePath) => {
      // 使用 parseOnlyForTitile 解析文件的中文标题
      const parsed = parseOnlyForTitile(source) || {};
      const { title } = parsed;

      const designRelativeFilePath = 'requirements/standard/content-design.md';
      const designAbsoluteFilePath = getAbsoluteFilePathWhenExisted(rootDir)(designRelativeFilePath);

      if (!designAbsoluteFilePath || source.includes(designRelativeFilePath)) {
        return source;
      }

      const defaultPrefix = `${title}\n`;
      const reg = /\-[^\n]*生成时间[^\n]+/g;
      const [prefix = defaultPrefix] = source.match(reg) || [];
      const replacement = `${prefix}\n- **视觉需求**：${designAbsoluteFilePath}\n`;

      return source.replace(prefix, replacement);
    },
  },
  {
    replace: (rootDir) => omitContentByTitleKeywords(omitKeywords, '无匹配内容'),
  },
  {
    match: (item) => item?.endsWith?.('requirements/standard/terms.md'),
    replace: (rootDir) => (source) => source.replace(/\|[\n\s]+\|/g, '|\n|'),
  },
  {
    replace: (rootDir) => (source) => source.replace(/\n{3,}/g, '\n\n'),
  },
];

/**
 * 初始化占位符文件
 *
 * @description 为规范初始化创建必要的占位符文件
 * 包括变更日志目录、需求文档和预检查文件
 * 如果这些文件不存在，则创建空的占位符文件
 *
 * @param {string} rootDir - 项目根目录
 *
 * @example
 * writeForPlaceholder('/path/to/project');
 * // 创建以下文件（如果不存在）：
 * // - .changelogs/plan/placeholder.md
 * // - .changelogs/requirements/placeholder.md
 * // - requirements/persistent/precheck.md
 */
export const writeForPlaceholder = (() => {
  const relativeFilePaths = [
    '.changelogs/plan/placeholder.md',
    '.changelogs/requirements/placeholder.md',
    'requirements/persistent/precheck.md',
  ];

  const writeToRootDir = (rootDir) => (relativeFilePath) => {
    const activeSpecDir = getActiveSpecDir(rootDir);

    if (!activeSpecDir) {
      return;
    }

    const absoulteFilePath = path.resolve(activeSpecDir, relativeFilePath);

    const find = (item) => item.endsWith(relativeFilePath);
    const found = findUnderSpecs(rootDir)(find);

    !found && writeToFileSync('', absoulteFilePath)('');
  };

  return (rootDir) => {
    const write = writeToRootDir(rootDir);

    relativeFilePaths.forEach(write);
  };
})();

/**
 * 处理临时文件
 *
 * @description 查找并重命名所有临时文件（temp- 前缀）
 * 移除 temp- 前缀，使其成为正式文件
 *
 * @param {string} rootDir - 项目根目录
 *
 * @example
 * writeForTemps('/path/to/project');
 * // 将 plan/data-model/temp-User.md 重命名为 plan/data-model/User.md
 */
export const writeForTemps = (rootDir) => {
  const filterForTempFiles = (item = '') => {
    const inDataModel = item.includes('plan/data-model/temp-');
    const inFrontend = item.includes('plan/frontend/temp-');
    const inBackend = item.includes('plan/backend/temp-');

    return inDataModel || inFrontend || inBackend;
  };

  const bundles = filterUnderSpecs(rootDir)(filterForTempFiles) || [];

  bundles.forEach((bundle = {}, index) => {
    const { fileName, absoluteDir, absoluteFilePath } = bundle;

    const newFileName = fileName.replace(/^temp-/, '');
    const newPath = path.join(absoluteDir, newFileName);

    fs.renameSync(absoluteFilePath, newPath);
  });
};

/**
 * 写入ER图
 *
 * @description 扫描所有entity文件，从表格中提取属性，补充到ER图中
 * 只做补充操作：
 * 1. 如果ER图中没有该实体，则补充实体定义
 * 2. 如果ER图中该实体缺少属性，则补充属性
 *
 * @param {string} rootDir - 项目根目录
 *
 * @example
 * writeToERDiagram('/path/to/project');
 * // 扫描所有entity文件，补充缺失的实体和属性到ER图
 */
export const writeToERDiagram = (rootDir = '') => {
  try {
    rootDir = rootDir || process.cwd();

    // 1. Locate er-diagram.md
    const erBundle = findUnderSpecs(rootDir)((item) => item.includes('plan/data-model/er-diagram.md'));
    if (!erBundle) return;

    const { absoluteFilePath: erPath } = erBundle;
    const erContent = readFileSync(erPath);
    if (!erContent) return;

    // Extract mermaid block (open tag, body, close tag)
    const mermaidMatch = erContent.match(/(```mermaid\n)([\s\S]*?)(\n```)/);
    if (!mermaidMatch) return;

    const [, mermaidOpen, originalBody, mermaidClose] = mermaidMatch;

    // 2. Collect all entity-*.md files (skip temp- files)
    const entityBundles =
      filterUnderSpecs(rootDir)(
        (item) => /plan\/data-model\/entity-[^/]+\.md$/.test(item) && !item.includes('/temp-')
      ) || [];

    if (!entityBundles.length) return;

    // 3. Parse the attribute table from an entity file
    // Table format:
    //   | 字段名 | 标题 | 数据类型 | 字段特性（主键、唯一、非空、外键等） |
    //   | --- | --- | --- | --- |
    //   | id  | 主键 | Integer | 主键、非空 |
    const parseEntityFields = (content) => {
      const fields = [];
      const lines = content.split('\n');
      let inTable = false;
      let pastSeparator = false;

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith('|')) {
          if (inTable && pastSeparator) break; // table ended
          continue;
        }

        if (!inTable) {
          if (trimmed.includes('字段名') && trimmed.includes('标题') && trimmed.includes('数据类型')) {
            inTable = true;
          }
          continue;
        }

        if (!pastSeparator) {
          if (trimmed.includes('---')) pastSeparator = true;
          continue;
        }

        const cols = trimmed
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);

        if (cols.length >= 4) {
          const [fieldName, title, dataType, characteristics] = cols;
          if (fieldName && fieldName !== '字段名') {
            fields.push({ fieldName, title, dataType, characteristics: characteristics || '' });
          }
        }
      }

      return fields;
    };

    const extractForeignEntity = (characteristics = '') => {
      const matched = String(characteristics).match(/外键(?:关联实体)?\s*([A-Za-z][A-Za-z0-9_]*)/);

      return matched?.[1] || '';
    };

    // 4. Map entity data type to ER diagram type keyword
    const mapType = (dataType = '') => {
      const normalized = String(dataType).trim()
        .replace(/^app\.enums\./, '')   // strip app.enums. prefix
        .replace(/\s+(PK|FK)$/i, '');   // strip trailing PK/FK marker (avoid double FK)
      const lower = normalized.toLowerCase();
      if (lower === 'integer' || lower === 'long' || lower === 'int') return 'integer';
      if (lower === 'date') return 'date';
      if (lower === 'datetime') return 'datetime';
      if (lower === 'decimal' || lower === 'float' || lower === 'double') return 'decimal';
      if (lower === 'boolean') return 'boolean';

      if (normalized && !['string', 'text'].includes(lower)) {
        return normalized;
      }

      return 'string';
    };

    // 5. Build a single ER field line: "    type fieldName [PK|FK] \"title\""
    const buildFieldLine = ({ fieldName, title, dataType, characteristics }) => {
      const foreignEntity = extractForeignEntity(characteristics);
      const type = foreignEntity || mapType(dataType);
      const isPK = /主键/.test(characteristics);
      const isFK = /外键/.test(characteristics);
      const marker = isPK ? ' PK' : isFK ? ' FK' : '';
      return `    ${type} ${fieldName}${marker} "${title}"`;
    };

    const toSnakeCase = (source = '') =>
      String(source)
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();

    const toPlural = (source = '') => {
      if (!source) {
        return source;
      }

      if (source.endsWith('y') && !/[aeiou]y$/.test(source)) {
        return `${source.slice(0, -1)}ies`;
      }

      if (/(s|x|z|ch|sh)$/.test(source)) {
        return `${source}es`;
      }

      return `${source}s`;
    };

    const buildRelationLabel = (entityName = '') => {
      const snake = toSnakeCase(entityName);

      return `has_${toPlural(snake)}`;
    };

    const buildRelationLine = ({ entityName, fieldName, characteristics }) => {
      const foreignEntity = extractForeignEntity(characteristics);

      if (!foreignEntity) {
        return;
      }

      const relationLabel = buildRelationLabel(entityName || fieldName);

      return `  ${foreignEntity} ||--o{ ${entityName} : "${relationLabel}"`;
    };

    // 6. Parse entities already present in the mermaid body
    //    Returns Map<entityName, { fieldSet, rawBlock }>
    const parseExistingEntities = (body) => {
      const map = new Map();
      const entityReg = /^  (\w+)\s*\{([\s\S]*?)\n  \}/gm;
      let m;

      while ((m = entityReg.exec(body)) !== null) {
        const name = m[1];
        const bodyStr = m[2];
        const fieldSet = new Set();
        const fieldReg = /^\s+\S+\s+(\w+)/gm;
        let fm;

        while ((fm = fieldReg.exec(bodyStr)) !== null) {
          fieldSet.add(fm[1]);
        }

        map.set(name, { fieldSet, rawBlock: m[0] });
      }

      return map;
    };

    const parseExistingRelations = (body = '') =>
      body
        .split('\n')
        .map((line = '') => line.trim())
        .map((line = '') => line.match(/^([A-Za-z][A-Za-z0-9_]*)\s+[|}{o]+--[|}{o]+\s+([A-Za-z][A-Za-z0-9_]*)\s*:/))
        .filter(Boolean)
        .map((matched = []) => `${matched[1]}=>${matched[2]}`);

    const stripEntityBlocks = (body = '') => body.replace(/^  (\w+)\s*\{[\s\S]*?\n  \}\n*/gm, '').trimEnd();

    // 7. Load and parse all entity files
    const allEntities = entityBundles
      .map((bundle = {}) => {
        const { absoluteFilePath, fileName } = bundle;
        const nameMatch = fileName.match(/^entity-(.+)\.md$/);
        if (!nameMatch) return null;
        const content = readFileSync(absoluteFilePath);
        if (!content) return null;
        const fields = parseEntityFields(content);
        const relations = fields
          .map((field = {}) => buildRelationLine({ entityName: nameMatch[1], ...field }))
          .filter(Boolean);
        return { entityName: nameMatch[1], fields, relations };
      })
      .filter(Boolean);

    // 8. Rebuild entity blocks from entity documents and supplement missing relation lines
    const existingEntities = parseExistingEntities(originalBody);
    const existingRelations = new Set(parseExistingRelations(originalBody));
    const relationLinesToAppend = [];

    allEntities.forEach(({ entityName, relations = [] }) => {
      relations.forEach((relationLine = '') => {
        const matched = relationLine.match(/^  ([A-Za-z][A-Za-z0-9_]*) \|\|--o\{ ([A-Za-z][A-Za-z0-9_]*) : /);

        if (!matched) {
          return;
        }

        const key = `${matched[1]}=>${matched[2]}`;

        if (existingRelations.has(key)) {
          return;
        }

        existingRelations.add(key);
        relationLinesToAppend.push(relationLine);
      });
    });

    const entityOrder = [
      ...existingEntities.keys(),
      ...allEntities.map((item = {}) => item.entityName).filter((name) => !existingEntities.has(name)),
    ];
    const entityMap = new Map(allEntities.map((item = {}) => [item.entityName, item]));
    const entityBlocks = entityOrder
      .map((entityName) => {
        const current = entityMap.get(entityName);
        const fields = current?.fields || [];

        if (fields.length) {
          const fieldLines = fields.map(buildFieldLine).join('\n');

          return `  ${entityName} {\n${fieldLines}\n  }`;
        }

        return existingEntities.get(entityName)?.rawBlock;
      })
      .filter(Boolean);

    const skeletonBody = stripEntityBlocks(originalBody);
    const bodyParts = [skeletonBody];

    if (relationLinesToAppend.length) {
      bodyParts.push(relationLinesToAppend.join('\n'));
    }

    if (entityBlocks.length) {
      bodyParts.push(entityBlocks.join('\n\n'));
    }

    const newBody = bodyParts.filter(Boolean).join('\n\n');

    if (newBody === originalBody) return;

    // 9. Write back the updated er-diagram.md
    const newErContent = erContent.replace(
      /```mermaid\n[\s\S]*?\n```/,
      () => `${mermaidOpen}${newBody}${mermaidClose}`
    );

    fs.writeFileSync(erPath, newErContent);
  } catch (error) {
    // 错误处理：静默失败，不中断流程
    return;
  }
};

/**
 * 修正文件内容
 *
 * @description 对规范目录下的所有文件应用内容处理器
 * 包括：初始化必要文件、处理临时文件、应用内容转换规则
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 * @param {boolean} onlyForPath - 是否仅处理路径，不处理内容
 *
 * @example
 * correctToFile('/path/to/project');
 * // 处理所有文件，应用内容转换规则
 */
export const correctToFile = (rootDir = '', onlyForPath = false) => {
  rootDir = rootDir || process.cwd();

  writeForPlaceholder(rootDir);
  writeForTemps(rootDir);
  writeToERDiagram(rootDir);

  const store = {};
  const activeSpecDir = getActiveSpecDir(rootDir);

  const activeSpecList = readdirSync(activeSpecDir);
  const filePaths = activeSpecList.filter((item) => item.endsWith('.md')).filter(filterForDocuments);

  const toString = filePathToString(rootDir, store, filePaths);

  filePaths.forEach((filePath) => {
    const absoluteFilePath = path.resolve(activeSpecDir, filePath);
    const content = readFileSync(absoluteFilePath);

    const initial = handlers.reduce((result, hanlder = {}) => {
      if (onlyForPath) {
        return result;
      }

      const { replace, match = matchAll } = hanlder;

      const matched = match(absoluteFilePath);
      const handled = matched && replace(rootDir)(result, absoluteFilePath);

      return handled || result;
    }, content);

    const replaced = initial.replace(/[^\n]*\.md[^\n]*/g, (line = '') => {
      const filePathReg = getPathReg();
      const todoReg = /\[\s*\]/g;
      const quoteReg = /[\[(].+[\])]/g;
      const rawQuoteReg = /^\[L[0-9]+/g;
      const usefulQuoteReg = /^\[[^()\[\]\.]+\]\((specs|inputs)[^()\[\]]+\.md\)$/g;

      const [filePath = '', ...extra] = line.match(filePathReg) || [];
      const [quote = ''] = line.replace(todoReg, '').match(quoteReg) || [];

      const useful = usefulQuoteReg.test(quote) || rawQuoteReg.test(quote);
      const multi = extra.some((item) => item !== filePath);

      if (useful || multi) {
        return toRelativeFilePath(rootDir)(line);
      }

      if (!filePath) {
        return line;
      }

      const got = toString(filePath);

      return line.replace(quote || filePath, got);
    });

    if (replaced === content) {
      return;
    }

    fs.writeFileSync(absoluteFilePath, replaced);
  });
};

/**
 * 合并多个内容组
 *
 * @description 将多个内容组合并为一个字符串
 * 使用指定的分隔符连接，并移除多余的空行
 *
 * @param {string} spliter - 分隔符，默认为 '\n\n'
 *
 * @returns {Function} 返回一个函数，接收多个内容组参数
 *
 * @example
 * const merger = mergeGroups('\n\n');
 * const result = merger('# 标题', '内容1', '内容2');
 * // 返回 '# 标题\n\n内容1\n\n内容2'
 */
export const mergeGroups =
  (spliter = '\n\n') =>
  (...groups) => {
    const array = groups.flat();

    return array.join(spliter).replace(/\n{3,}/g, '\n\n');
  };

/**
 * 从仓库中同步读取文件
 *
 * @description 从 .specify/warehouse 目录中读取对应的文件
 * 用于获取文件的原始版本或模板
 *
 * @param {string} absoluteFilePath - 文件的绝对路径
 *
 * @returns {string|undefined} 仓库中对应文件的内容
 *
 * @example
 * const content = readWarehouseFileSync('/path/to/specs/001-crm/plan/index.md');
 * // 返回 .specify/warehouse/plan/index.md 的内容
 */
export const readWarehouseFileSync = (absoluteFilePath = '') => {
  // 添加类型检查，确保 absoluteFilePath 是字符串
  if (typeof absoluteFilePath !== 'string') {
    absoluteFilePath = '';
  }
  const reg = /(?<=\/specs\/[^\/]+\/).*/g;
  const [matched = absoluteFilePath] = absoluteFilePath.match(reg) || [];
  const filePath = matched && `.specify/warehouse/${matched}`;

  return filePath && readFileSync(filePath);
};

/**
 * 提取重要标记的内容
 *
 * @description 从文本中提取所有标记为 IMPORTANT 的行
 * 用于保留重要内容
 *
 * @param {string} source - 源文本
 *
 * @returns {string} 所有重要内容的合并字符串
 *
 * @example
 * const text = '<!-- IMPORTANT --> 重要内容\n普通内容\n<!-- IMPORTANT --> 另一个重要内容';
 * extractImportant(text);
 * // 返回 '<!-- IMPORTANT --> 重要内容\n<!-- IMPORTANT --> 另一个重要内容'
 */
export const extractImportant = (source = '') => {
  const reg = new RegExp(`[^\\n\\s]*<!--\\s*${IMPORTANT}[^\\n]+`, 'g');
  const matched = source.match(reg) || [];

  return matched.join('\n');
};

/**
 * 同步写入文件
 *
 * @description 将内容写入文件，支持多种处理模式
 * 对于 entity- 或 logic- 前缀的文件，会添加 temp- 前缀
 * 自动保留重要标记的内容
 *
 * @param {string} name - 文件名称（用于生成 Markdown 链接）
 * @param {string} absoluteFilePath - 文件的绝对路径
 * @param {string} spliter - 内容分隔符，默认为 '\n\n'
 *
 * @returns {Function} 返回一个函数，接收多个内容组参数
 *
 * @example
 * const writer = writeToFileSync('项目设计', '/path/to/plan/index.md');
 * const link = writer('# 标题', '内容1', '内容2');
 * // 返回 '[项目设计](/path/to/plan/index.md)'
 */
export const writeToFileSync =
  (name = '', absoluteFilePath = '', spliter = '\n\n') =>
  (...groups) => {
    const isMD = absoluteFilePath.endsWith('.md');
    const fileName = path.basename(absoluteFilePath);

    // 检查文件名是否包含 entity- 或 logic- 或 view- 前缀
    const isEntityOrLogicFile = /^(entity-|logic-|view-)/.test(fileName);
    const read = readWarehouseFileSync(absoluteFilePath);

    let result;
    let targetPath = absoluteFilePath;
    const temp = isEntityOrLogicFile && read;

    if (temp) {
      // 如果命中 entity- 或 logic- 或 view- 前缀，添加 temp- 前缀
      const dir = path.dirname(absoluteFilePath);
      const newFileName = `temp-${fileName}`;
      targetPath = path.join(dir, newFileName);

      result = read.replaceAll(PENDING, '');
    } else {
      // 原逻辑处理
      const merge = mergeGroups(spliter);
      const merged = merge(...groups);

      const important = (isMD && extractImportant(merged)) || '';
      const readWithImportand = important ? merge(important, read) : read;

      result = read ? readWithImportand : merged;
    }

    const absoluteDir = path.dirname(targetPath);

    fs.mkdirSync(absoluteDir, { recursive: true });
    fs.writeFileSync(targetPath, result);

    return temp ? '' : `[${name}](${targetPath})`;
  };

/**
 * 提交内容到文件
 *
 * @description 将内容直接写入文件，不进行任何处理
 * 用于最终提交文件
 *
 * @param {string} name - 文件名称（用于生成 Markdown 链接）
 * @param {string} absoluteFilePath - 文件的绝对路径
 * @param {string} spliter - 内容分隔符，默认为 '\n\n'
 *
 * @returns {Function} 返回一个函数，接收多个内容组参数
 *
 * @example
 * const committer = commitToFileSync('最终文件', '/path/to/final.md');
 * const link = committer('# 标题', '内容');
 * // 返回 '[最终文件](/path/to/final.md)'
 */
export const commitToFileSync =
  (name = '', absoluteFilePath = '', spliter = '\n\n') =>
  (...groups) => {
    const merged = groups.flat().join(spliter);
    const absoluteDir = path.dirname(absoluteFilePath);

    fs.mkdirSync(absoluteDir, { recursive: true });
    fs.writeFileSync(absoluteFilePath, merged);

    return `[${name}](${absoluteFilePath})`;
  };

/**
 * 同步写入 JSON 文件
 *
 * @description 将 JavaScript 对象转换为 JSON 并写入文件
 *
 * @param {string} name - 文件名称（用于生成 Markdown 链接）
 * @param {string} absoluteFilePath - JSON 文件的绝对路径
 *
 * @returns {Function} 返回一个函数，接收 JavaScript 对象参数
 *
 * @example
 * const writer = writeToJSONSync('配置文件', '/path/to/config.json');
 * const link = writer({ key: 'value', count: 42 });
 * // 返回 '[配置文件](/path/to/config.json)'
 */
export const writeToJSONSync =
  (name = '', absoluteFilePath = '') =>
  (object) => {
    const json = JSON.stringify(object);

    return writeToFileSync(name, absoluteFilePath)(json);
  };

/**
 * 写入日志文件
 *
 * @description 将日志信息追加到日志文件
 * 自动添加时间戳
 *
 * @type {Function}
 *
 * @example
 * writeToLog('操作名称', '详细信息1', '详细信息2');
 * // 在 .data/_spec.log 中添加：[2024-01-01 12:00:00] 操作名称: 详细信息1 详细信息2
 */
export const writeToLog = (() => {
  const rootDir = process.cwd();
  const absoluteFilePath = `${rootDir}/.data/_spec.log`;

  return (source, ...rest) => {
    const date = new Date();
    const dateString = date.toLocaleString('zh');
    const message = rest.join(' ');
    const more = `[${dateString}] ${source}: ${message}`;

    const read = readFileSync(absoluteFilePath);
    const list = [more, read];
    const merged = list.filter(Boolean).join('\n');

    writeToFileSync('log', absoluteFilePath)(merged);
  };
})();

/**
 * 复制文件到标准目录
 *
 * @description 将持久化目录中的设计文件复制到标准目录
 * 用于规范化文件结构
 *
 * @param {string} rootDir - 项目根目录
 *
 * @example
 * copyToStandard('/path/to/project');
 * // 将 requirements/persistent/design-*.md 复制到 requirements/standard/design-*.md
 */
export const copyToStandard = (rootDir) => {
  const standardPrefix = 'standard';
  const persistentPrefix = 'persistent';
  const suffixs = ['/design-', '/content-design.md'];

  const filterByPrefix =
    (prefix) =>
    (item = '') => {
      const some = (keyword) => item.includes(keyword);
      const map = (suffix) => `/${prefix}${suffix}`;

      const keywords = suffixs.map(map);

      return keywords.some(some);
    };

  const filterForPersistent = filterByPrefix(persistentPrefix);
  const filterForStandard = filterByPrefix(standardPrefix);

  const activeSpecDir = getActiveSpecDir(rootDir);
  const persistentBundles = filterUnderSpecs(rootDir)(filterForPersistent);
  const standardBundles = filterUnderSpecs(rootDir)(filterForStandard);

  if (persistentBundles.length === standardBundles.length) {
    return;
  }

  removeUnderSpecs(rootDir)(filterForStandard);

  persistentBundles.forEach((bundle = {}) => {
    const { fileName, absoluteFilePath } = bundle;

    const source = readFileSync(absoluteFilePath);
    const targetRelativeFilePath = `requirements/${standardPrefix}/${fileName}`;
    const targetAbsoluteFilePath = path.resolve(activeSpecDir, targetRelativeFilePath);

    writeToFileSync('', targetAbsoluteFilePath)(source);
  });
};
