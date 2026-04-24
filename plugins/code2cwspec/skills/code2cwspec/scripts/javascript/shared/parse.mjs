import fs from 'fs';
import path from 'path';

import {
  toNumber,
  getTextInRange,
  getTextInBetween,
  getActiveSpecDir,
  getPathReg,
  readFile,
  readdirSync,
  readFileSync,
  findUnderSpecs,
  toAbsoluteFilePath,
  relativeFilePathToBundle,
} from './tools.mjs';

/**
 * 从文本中提取文件路径
 *
 * @description 使用正则表达式从文本中提取第一个匹配的文件路径
 * 支持 Markdown 链接格式和纯路径格式
 *
 * @param {string} source - 源文本，可以是 Markdown 链接或纯路径
 *
 * @returns {string} 提取到的文件路径，未找到返回空字符串
 *
 * @example
 * parsePath('[人员（Person）](/a/b/Person.md)') // 返回 '/a/b/Person.md'
 * parsePath('path/to/file.md') // 返回 'path/to/file.md'
 */
export const parsePath = (source = '') => {
  if (typeof source !== 'string') {
    source = '';
  }
  const reg = getPathReg(source);
  const [got = ''] = source.match(reg) || [];

  return got;
};

/**
 * 从文件路径中提取英文名称
 *
 * @description 从文件路径中提取文件名（不含扩展名）
 * 例如：/a/b/Person.md → Person
 *
 * @param {string} source - 文件路径
 *
 * @returns {string} 文件名（不含扩展名）
 *
 * @example
 * parseEnFromPath('/a/b/Person.md') // 返回 'Person'
 * parseEnFromPath('path/to/file.txt') // 返回 'file'
 */
export const parseEnFromPath = (source = '') => {
  const parsed = parsePath(source);

  return parsed.replace(/.*(-|\/)|\..*/g, '');
};

/**
 * 提取英文名称
 *
 * @description 从各种格式的文本中智能提取英文名称
 * 支持：Markdown 链接、括号标记、文件路径等多种格式
 * 优先级：括号内容 > 路径文件名 > 首个英文单词
 *
 * @param {string} source - 源文本
 *
 * @returns {string} 提取到的英文名称
 *
 * @example
 * parseEn('[人员（Person）](/a/b/Person.md)') // 返回 'Person'
 * parseEn('Customer（客户）') // 返回 'Customer'
 * parseEn('path/to/MyFile.md') // 返回 'MyFile'
 */
export const parseEn = (source = '') => {
  const [got = ''] = source.match(/[a-zA-Z0-9]+/g) || [];
  const en = getTextInBetween(source)('（', '）') || got;
  const replaced = en.replace(/[\W]*/g, '');
  const parsedPath = parsePath(source);

  const isMultiple = source.includes('\n');
  const isMarkdown = source.includes('.md');
  const isNASLBook = source.includes('nasl-book');

  if (isMarkdown && !isMultiple && !isNASLBook) {
    return parseEnFromPath(source);
  }

  if (parsedPath?.startsWith(replaced)) {
    return parseEnFromPath(source);
  }

  return replaced || parseEnFromPath(source);
};

/**
 * 提取标题文本
 *
 * @description 从标题行中移除 Markdown 标记符号（#、空格、-、*、：等）
 * 返回纯净的标题文本
 *
 * @param {string} source - 标题行文本
 *
 * @returns {string} 清理后的标题文本
 *
 * @example
 * parseTitle('## 用户管理（UserManagement）') // 返回 '用户管理（UserManagement）'
 * parseTitle('# 核心领域') // 返回 '核心领域'
 */
export const parseTitle = (source = '') => {
  const reg = /(#|(^|\n)-)[^\n]+/;
  const [matched = ''] = source.match(reg) || [];

  const replaced = matched
    .replace(/[\s#*：\n]+/g, '')
    .replace(/^[\-]+/g, '');

  const [first = ''] = source.split('\n');

  return replaced || first;
};

/**
 * 提取代码引用信息
 *
 * @description 从文本中提取代码引用（文件路径 + 行号范围）
 * 格式：path/to/file.js#L10,20 表示第 10-20 行
 *
 * @param {string} source - 源文本
 *
 * @returns {Array<Object>} 引用信息数组，每个对象包含 { filePath, range }
 *
 * @example
 * parseQuote('src/utils.js#L10,20 and src/main.js#L5')
 * // 返回 [
 * //   { filePath: 'src/utils.js', range: [10, 20] },
 * //   { filePath: 'src/main.js', range: [5] }
 * // ]
 */
export const parseQuote = (source = '') => {
  const reg = /([\/0-9a-zA-Z\-_]+\/[^\/\n]+.[a-z]+)#(L[0-9]+(,[0-9]+)?)/g;
  const matched = source.match(reg) || [];
  const merged = Array.from(new Set(matched));

  const map = (item = '') => {
    const [filePath = ''] = item.match(/([\/0-9a-zA-Z\-_]+\/[^\/\n]+.[a-z]+)/g) || [];
    const strings = item.replace(filePath).match(/[0-9]+/g) || [];
    const range = strings.map(toNumber);

    if (!filePath) {
      return;
    }

    return { filePath, range };
  };

  return merged.map(map).filter(Boolean);
};

/**
 * 将文本解析为信息对象
 *
 * @description 从文本中提取中文名、英文名、标题、文件路径等信息
 * 返回结构化的信息对象
 *
 * @param {Object} options - 配置选项
 * @param {Array<string>} options.starts - 要移除的前缀列表
 * @param {string} options.rootDir - 项目根目录
 * @param {string} options.specDir - 规范目录
 *
 * @returns {Function} 返回一个函数，接收源文本参数
 *
 * @example
 * const parser = parseToInformation({ rootDir: '/project' });
 * const info = parser('- **用户管理（UserManagement）**：[链接](/specs/001-crm/user.md)');
 * // 返回 {
 * //   cn: '用户管理',
 * //   en: 'UserManagement',
 * //   title: '用户管理（UserManagement）',
 * //   relativeFilePath: 'user.md',
 * //   absoluteFilePath: '/project/specs/001-crm/user.md'
 * // }
 */
export const parseToInformation =
  (options = {}) =>
  (source = '') => {
    const { starts = [], rootDir = process.cwd(), specDir = getActiveSpecDir(rootDir) } = options;

    if (starts.length) {
      source = starts.reduce((result, start) => result.replaceAll(start, ''), source);
    }

    const reg = /[\*#（）()\[\]\s\-]/g;
    const splited = source.split(reg) || [];
    const cn = splited.find(Boolean);
    const en = parseEn(source);
    const title = parseTitle(source);
    const basic = { cn, en, title };

    const filePath = parsePath(source) || '';
    const absoluted = filePath.startsWith('/');
    const withSpecs = !absoluted && /^(inputs|specs)\//.test(filePath);
    const rootPath = withSpecs ? rootDir : specDir;

    if (!filePath) {
      return basic;
    }

    const relativeFilePath = absoluted ? filePath.replace(rootPath, '') : filePath;
    const absoluteFilePath = absoluted ? filePath : path.resolve(rootPath, filePath);

    return { ...basic, relativeFilePath, absoluteFilePath };
  };

/**
 * 格式化标题级别
 *
 * @description 将标题级别数组标准化，使最小级别为 0
 * 用于处理不同起始级别的标题结构
 *
 * @param {Array<Object>} source - 包含 level 属性的对象数组
 *
 * @returns {Array<Object>} 标准化后的数组，level 从 0 开始
 *
 * @example
 * const items = [
 *   { level: 2, title: 'A' },
 *   { level: 3, title: 'B' },
 *   { level: 4, title: 'C' }
 * ];
 * formatLevels(items);
 * // 返回 [
 * //   { level: 0, title: 'A' },
 * //   { level: 1, title: 'B' },
 * //   { level: 2, title: 'C' }
 * // ]
 */
export const formatLevels = (source = []) => {
  const levels = source.map((item) => item.level);
  const minest = Math.min(...levels);

  return source.map((item = {}) => {
    const { level: itemLevel = 0 } = item;

    const level = itemLevel - minest;

    return { ...item, level };
  });
};

/**
 * 按级别合并项目为树形结构
 *
 * @description 将平面的项目列表按 level 属性转换为树形结构
 * 每个项目可以有 children 属性包含子项
 *
 * @param {Array<Object>} source - 包含 level 属性的项目数组
 *
 * @returns {Array<Object>} 树形结构的根节点数组
 *
 * @example
 * const items = [
 *   { level: 0, title: 'A' },
 *   { level: 1, title: 'B' },
 *   { level: 1, title: 'C' },
 *   { level: 0, title: 'D' }
 * ];
 * mergedByLevel(items);
 * // 返回 [
 * //   { level: 0, title: 'A', children: [
 * //     { level: 1, title: 'B' },
 * //     { level: 1, title: 'C' }
 * //   ]},
 * //   { level: 0, title: 'D' }
 * // ]
 */
export const mergedByLevel = (source = []) => {
  source = formatLevels(source);

  const roots = [];
  const recorder = new Map();

  const findIndex = (item) => item.level === 0;
  const index = source.findIndex(findIndex);

  let parent;

  source.slice(index).forEach((item = {}) => {
    const { level = 0 } = item;

    if (level === 0) {
      parent = item;
      roots.push(item);
      return;
    }

    parent = parent || roots[roots.length - 1];

    while (parent?.level >= level) {
      parent = recorder.get(parent);
    }

    if (!parent) {
      return;
    }

    parent.children = parent.children || [];

    parent.children.push(item);
    recorder.set(item, parent);

    parent = item;
  });

  return roots;
};

/**
 * 将 Markdown 列表解析为结构化数据
 *
 * @description 从 Markdown 文本中提取列表项（- 开头的行）
 * 根据缩进级别构建树形结构
 *
 * @param {Object} options - 配置选项
 * @param {number} options.start - 起始行号（用于计算行号）
 *
 * @returns {Function} 返回一个函数，接收源文本参数
 *
 * @example
 * const text = `
 * - 项目1
 *   - 子项1
 *   - 子项2
 * - 项目2
 * `;
 * const parser = parseToList({ start: 0 });
 * const result = parser(text);
 * // 返回树形结构的列表项数组
 */
export const parseToList =
  (options = {}) =>
  (source = '') => {
    const { start: optionsStart = 0 } = options;

    const parseInformation = parseToInformation(options);
    const isUseful = (item = '') => /^\s*-\s/g.test(item);

    const list = [];
    const parts = source.split('\n');

    parts.forEach((item = '', index) => {
      const useful = isUseful(item);
      const information = parseInformation(item) || {};

      if (!useful) {
        return;
      }

      const line = optionsStart + index + 1;

      const [spaces = ''] = item.match(/^\s*/) || [];
      const level = spaces.length / 2;
      const more = { start: line, end: line, content: item };
      const current = { level, ...more, ...information };

      list.push(current);
    });

    return mergedByLevel(list);
  };

/**
 * 将 Markdown 表格解析为二维数组
 *
 * @description 从 Markdown 文本中提取表格数据
 * 返回表格行的二维数组（不包含表头和分隔符）
 *
 * @param {Object} options - 配置选项
 * @param {Array<number>} options.tableRange - 列范围，用于 slice 操作
 *
 * @returns {Function} 返回一个函数，接收源文本参数
 *
 * @example
 * const text = `
 * | 列1 | 列2 | 列3 |
 * |----|----|----|
 * | A  | B  | C  |
 * | D  | E  | F  |
 * `;
 * const parser = parseToTable();
 * const result = parser(text);
 * // 返回 [['A', 'B', 'C'], ['D', 'E', 'F']]
 */
export const parseToTable =
  (options = {}) =>
  (source = '') => {
    const { tableRange = [] } = options;

    const filter = (item = '') => item.startsWith('|');
    const findIndex = (item) => /^[|\s-]+$/.test(item);

    const parts = source.split('\n').filter(filter);
    const index = parts.findIndex(findIndex);

    const body = parts.slice(index + 1).map((item) => {
      const strings = item
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(...tableRange);

      return strings;
    });

    return body;
  };

/**
 * 将解析后的树形结构转换回原始文本
 *
 * @description 递归遍历树形结构，将其转换回 Markdown 文本格式
 *
 * @param {Object} current - 当前节点对象
 * @param {string} current.content - 节点内容
 * @param {Array<Object>} current.children - 子节点数组
 *
 * @returns {string} 转换后的 Markdown 文本
 *
 * @example
 * const parsed = {
 *   content: '# 标题',
 *   children: [
 *     { content: '## 子标题', children: [] }
 *   ]
 * };
 * parsedToRaw(parsed);
 * // 返回 '# 标题\n\n## 子标题'
 */
export const parsedToRaw = (current = {}) => {
  const { content, children = [] } = current;

  const mapped = children.map(parsedToRaw);
  const parts = [content, ...mapped];

  return parts.filter(Boolean).join('\n\n');
};

/**
 * 解析菜单结构
 *
 * @description 从文件中读取并解析菜单表格
 * 提取菜单的层级、分类、描述等信息
 *
 * @param {string} absoluteFilePath - 菜单文件的绝对路径
 *
 * @returns {Object} 菜单信息对象，包含：
 *   - levels: 菜单层级数
 *   - maxLength: 最长菜单项的列数
 *   - menus: 解析后的菜单数组
 *   - extraHead: 额外的表头列表
 *
 * @example
 * const menus = parseMenus('/path/to/menus.md');
 * // 返回 {
 * //   levels: 3,
 * //   maxLength: 5,
 * //   menus: [...],
 * //   extraHead: ['功能类别', '隐藏子项']
 * // }
 */
export const parseMenus = (absoluteFilePath = '') => {
  const content = readFileSync(absoluteFilePath);
  const parsed = parseToTable()(content) || [];

  const categories = ['页面', '逻辑'];
  const numbers = parsed.map((item) => item.length);
  const maxLength = Math.max(...numbers);

  const extraHead = [];

  const menus = parsed.map((item = []) => {
    const findIndex = (item) => categories.includes(item);
    const index = item.findIndex(findIndex);

    const category = item[index];
    const descritpion = item[index + 1];

    const map = (item) => item.replace(/\p{P}/gu, '');
    const compressed = item.slice(0, index).map(map);
    const first = compressed[0];
    const last = compressed[compressed.length - 1];
    const combined = compressed.join('-');

    const gap = maxLength - item.length;
    const more = Array.from({ length: gap }).fill('');
    const fulfilled = [...compressed, ...more];
    const fulfilledRaw = [...fulfilled, category];

    descritpion && fulfilledRaw.push(descritpion);

    return {
      category,
      descritpion,
      first,
      last,
      combined,
      compressed,
      fulfilled,
      fulfilledRaw,
      compressedRaw: item,
    };
  });

  const levels = menus?.[0]?.fulfilled?.length || 0;
  const hadCategory = menus?.some((item) => item.category);
  const hadDescription = menus?.some((item) => item.descritpion);

  hadCategory && extraHead.push('功能类别');
  hadDescription && extraHead.push('隐藏子项');

  return {
    levels,
    maxLength,
    menus,
    extraHead,
  };
};

/**
 * 将菜单转换为表格格式
 *
 * @description 从菜单文件中提取并转换为表格数据
 *
 * @param {string} absoluteFilePath - 菜单文件的绝对路径
 *
 * @returns {Array<Array<string>>} 表格数据（二维数组）
 *
 * @example
 * const table = parseMenusToTable('/path/to/menus.md');
 * // 返回 [['菜单1', '子菜单1'], ['菜单2', '子菜单2'], ...]
 */
export const parseMenusToTable = (absoluteFilePath = '') => {
  const parsed = parseMenus(absoluteFilePath) || {};
  const map = (item) => item.compressed;

  return parsed?.menus?.map(map);
};

/**
 * 获取源文本（支持文件路径或直接文本）
 *
 * @description 如果输入是文件路径则读取文件，否则直接使用文本
 * 同时移除文本开头的非 Markdown 标记内容
 *
 * @param {string} source - 文件路径或文本内容
 *
 * @returns {string} 处理后的文本内容
 *
 * @example
 * getSource('/path/to/file.md') // 读取文件内容
 * getSource('# 标题\n内容') // 直接返回文本
 */
export const getSource = (source = '') => {
  const reg = /^\/.+\.\w+$/g;
  const matched = reg.test(source);

  source = matched ? readFileSync(source) : source;

  return source?.replace?.(/^[^#]+#/g, '#');
};

/**
 * 仅解析标题信息
 *
 * @description 从文本或文件中提取第一个标题及其信息
 * 用于快速获取文档的标题信息
 *
 * @param {string} source - 文件路径或文本内容
 *
 * @returns {Object} 标题信息对象，包含 cn、en、title 等
 *
 * @example
 * parseOnlyForTitile('/path/to/file.md')
 * // 返回 { cn: '用户管理', en: 'UserManagement', title: '# 用户管理（UserManagement）' }
 */
export const parseOnlyForTitile = (source = '') => {
  source = getSource(source);

  const parseInformation = parseToInformation({});
  const [title = ''] = source?.match?.(/#[^\n]+/g) || [];
  const splited = title.split('-') || [];
  const got = splited[splited.length - 1];

  const result = parseToInformation()(got) || {};

  return { ...result, title };
};

/**
 * 解析 Markdown 文件为结构化数据
 *
 * @description 这是最核心的解析函数，将 Markdown 文件解析为树形结构
 * 自动识别标题级别、列表、表格等元素
 * 支持按标题名称过滤返回特定部分
 *
 * @param {Object} options - 配置选项
 * @param {string} options.title - 要提取的标题名称（可选）
 * @param {string} options.rootDir - 项目根目录
 * @param {string} options.specDir - 规范目录
 *
 * @returns {Function} 返回一个函数，接收源文本或文件路径参数
 *
 * @example
 * // 解析整个文件
 * const parser = parse({ rootDir: '/project' });
 * const result = parser('/path/to/file.md');
 * // 返回树形结构的标题和内容
 *
 * // 只提取特定标题部分
 * const result2 = parser({ title: '核心领域' })('/path/to/file.md');
 * // 返回只包含"核心领域"及其子内容的结构
 */
export const parse =
  (options = {}) =>
  (source = '') => {
    const { title, rootDir = process.cwd(), specDir = getActiveSpecDir(rootDir) } = options;

    const parseTable = parseToTable(options);
    const parseInformation = parseToInformation(options);

    source = getSource(source);

    if (!source) {
      return [];
    }

    let total = 0;

    let parts = source.split(/\n(?=#)/g).map((item = '') => {
      const table = parseTable(item) || [];
      const information = parseInformation(item) || {};
      const lines = item.split('\n');

      const listOptions = { ...options, start: total };
      const list = parseToList(listOptions)(item) || [];
      const { title = item } = information;

      const keyword = '【标题】';
      const included = title.includes(keyword);
      const [spaces = ''] = item.match(/^#*/) || [];
      const level = included ? -1 : spaces.length - 1;

      const content = item.replace(keyword, '');

      const object = {
        level,
        list,
        table,
        content: item,
        start: total + 1,
        end: total + lines.length,
        ...information,
      };

      total += lines.length;
      return object;
    });

    if (title) {
      const findIndex = (item) => item.title === title;
      const foundIndex = parts.findIndex(findIndex);
      const found = parts[foundIndex];

      if (!found) {
        return [];
      }

      const { level } = found;

      const findEndIndex = (item = {}, index) => {
        const { level: itemLevel } = item;

        const a = itemLevel <= level;
        const b = index > foundIndex;

        return a && b;
      };

      const foundEndIndex = parts.findIndex(findEndIndex);

      const useless = foundEndIndex < 0;
      const endIndex = useless ? parts.length : foundEndIndex;

      const sliced = parts.slice(foundIndex, endIndex);

      parts = sliced.map((item = {}, index) => {
        const { level: itemLevel } = item;

        return { ...item, level: itemLevel - level };
      });
    }

    return mergedByLevel(parts);
  };

/**
 * 为树形结构添加层级路径
 *
 * @description 递归遍历树形结构，为每个节点添加 levels 属性
 * levels 是一个数组，表示该节点在树中的路径
 *
 * @param {Array<Object>} list - 树形结构的节点数组
 * @param {Array<number>} parentLevels - 父节点的层级路径
 *
 * @returns {Array<Object>} 添加了 levels 属性的树形结构
 *
 * @example
 * const tree = [
 *   { title: 'A', children: [
 *     { title: 'B', children: [] }
 *   ]}
 * ];
 * levelUp(tree);
 * // 返回 [
 * //   { title: 'A', levels: [0], children: [
 * //     { title: 'B', levels: [0, 'children', 0], children: [] }
 * //   ]}
 * // ]
 */
export const levelUp = (list = [], parentLevels = []) =>
  list.map((item = {}, index) => {
    const { children: itemChildren = [] } = item;

    const levels = parentLevels.concat(index);
    const childrenLevels = levels.concat('children');
    const children = levelUp(itemChildren, childrenLevels);

    return { ...item, children, levels };
  });

/**
 * 从解析结果中提取所有列表项
 *
 * @description 递归遍历树形结构，收集所有的列表项（list 属性）
 * 并为每个列表项添加层级路径信息
 *
 * @param {Array<Object>} parsed - 解析后的树形结构
 * @param {Array<number>} levels - 当前的层级路径
 *
 * @returns {Array<Object>} 所有列表项的扁平数组
 *
 * @example
 * const parsed = [
 *   { title: 'A', list: [{cn: 'item1'}, {cn: 'item2'}], children: [] }
 * ];
 * getListFromParsed(parsed);
 * // 返回 [{cn: 'item1', levels: [0, 'list', 0]}, {cn: 'item2', levels: [0, 'list', 1]}]
 */
export const getListFromParsed = (parsed = [], levels = []) => {
  const result = [];

  parsed.forEach((item = {}, index) => {
    const { list = [], children = [] } = item;
    const parentLevels = levels.concat(index);

    if (list?.length) {
      const currentLevels = parentLevels.concat('list');
      const more = levelUp(list, currentLevels) || [];

      result.push(...more);
    }

    if (children?.length) {
      const currentLevels = parentLevels.concat('children');
      const more = getListFromParsed(children, currentLevels) || [];

      result.push(...more);
    }
  });

  return result;
};

/**
 * 根据层级路径从解析结果中获取值
 *
 * @description 使用层级路径数组从嵌套的树形结构中获取特定值
 * 支持深层嵌套访问
 *
 * @param {*} parsed - 要访问的对象或数组
 *
 * @returns {Function} 返回一个函数，接收 levels 数组参数
 *
 * @example
 * const data = {
 *   children: [
 *     { title: 'A', list: [{cn: 'item1'}] }
 *   ]
 * };
 * const getter = getFromParsedByLevels(data);
 * getter([0, 'children', 0, 'list', 0, 'cn']); // 返回 'item1'
 */
export const getFromParsedByLevels =
  (parsed) =>
  (levels = []) => {
    const [key, ...rest] = levels;

    if (key === undefined) {
      return parsed;
    }

    const got = parsed?.[key];

    return getFromParsedByLevels(got)(rest);
  };

/**
 * 查找核心领域文件
 *
 * @description 判断文件是否是核心领域定义文件
 *
 * @param {string} item - 文件路径
 *
 * @returns {boolean} 如果是核心领域文件返回 true
 *
 * @example
 * findCores('plan/application-structure/cores.md') // 返回 true
 * findCores('plan/index.md') // 返回 false
 */
export const findCores = (item) => item?.endsWith?.('/application-structure/cores.md');

/**
 * 获取解析后的核心领域列表
 *
 * @description 读取并解析核心领域定义文件
 * 返回所有核心领域的中文名称列表
 *
 * @param {string} rootDir - 项目根目录
 *
 * @returns {Array<string>} 核心领域名称列表
 *
 * @example
 * const cores = getParsedCores('/path/to/project');
 * // 返回 ['商机管理', '客户管理', '任务管理', ...]
 */
export const getParsedCores = (rootDir) => {
  rootDir = rootDir || process.cwd();

  const options = { rootDir };
  const bundle = findUnderSpecs(rootDir)(findCores);
  const parsed = parse(options)(bundle?.absoluteFilePath) || [];

  const map = (item) => item?.cn;
  const mapped = parsed?.[0]?.children?.map(map)?.filter(Boolean);

  return mapped || [];
};

/**
 * 获取所有归属的核心领域
 *
 * @description 获取项目中所有的核心领域，包括自定义核心领域和通用领域
 *
 * @param {string} rootDir - 项目根目录
 *
 * @returns {Array<string>} 所有核心领域名称列表
 *
 * @example
 * const allCores = getBelongCores('/path/to/project');
 * // 返回 ['商机管理', '客户管理', ..., '业务模块', '领域服务', '数据建模', '通用业务模块', ...]
 */
export const getBelongCores = (rootDir) => {
  const cores = getParsedCores(rootDir) || [];
  const more = ['业务模块', '领域服务', '数据建模'];
  const rest = ['通用业务模块', '通用领域服务', '通用数据建模'];

  return [...cores, ...more, ...rest];
};

/**
 * 根据核心领域生成文件名前缀列表
 *
 * @description 为每个核心领域生成对应的文件名前缀
 * 包括：核心领域本身、核心领域-实体、核心领域-枚举、核心领域-逻辑
 * 按长度降序排列，用于文件名匹配
 *
 * @param {string} rootDir - 项目根目录
 *
 * @returns {Array<string>} 文件名前缀列表，按长度降序排列
 *
 * @example
 * const starts = getStartsByCores('/path/to/project');
 * // 返回 ['商机管理-', '商机管理-实体-', '商机管理-枚举-', '商机管理-逻辑-', ...]
 */
export const getStartsByCores = (rootDir) => {
  const cores = getBelongCores(rootDir) || [];

  const result = [...cores];
  const types = ['实体', '枚举', '逻辑'];

  cores.forEach((item) => {
    types.forEach((type) => {
      const current = `${item}-${type}`;

      result.push(current);
    });
  });

  const map = (item) => `${item}-`;
  const sort = (a, b) => (a.length > b.length ? -1 : 1);

  return result.map(map).sort(sort);
};
