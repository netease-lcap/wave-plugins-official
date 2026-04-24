import fs from 'fs';
import path from 'path';

import {
  getTextInRange,
  getTextInBetween,
  getActiveSpecDir,
  getPathReg,
  readFile,
  readdirSync,
  readFileSync,
  readJSONSync,
  toAbsoluteFilePath,
  readRawSpecContentSync,
  relativeFilePathToBundle,
} from './tools.mjs';

import { parseQuote, parseTitle, parseToList } from './parse.mjs';

import { mergeGroups, commitToFileSync, writeToJSONSync } from './write.mjs';

/**
 * 判断值是否在范围内
 *
 * @description 创建一个范围检查函数，判断值是否在 [a, b] 范围内
 *
 * @param {number} a - 范围下界
 * @param {number} b - 范围上界
 *
 * @returns {Function} 返回一个函数，接收要检查的值
 *
 * @example
 * const inRange = isInBewteen(10, 20);
 * inRange(15) // 返回 true
 * inRange(25) // 返回 false
 */
export const isInBewteen = (a, b) => (c) => a <= c && c <= b;

/**
 * 判断两个范围是否相交
 *
 * @description 检查两个数字范围是否有重叠
 *
 * @param {Array<number>} a - 第一个范围 [start, end]
 *
 * @returns {Function} 返回一个函数，接收第二个范围参数
 *
 * @example
 * const crossCheck = isCross([10, 20]);
 * crossCheck([15, 25]) // 返回 true（有重叠）
 * crossCheck([25, 30]) // 返回 false（无重叠）
 */
export const isCross =
  (a = []) =>
  (b = []) => {
    // 确保a和b都是数组
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return false;
    }

    const someA = a.some(isInBewteen(...b));
    const someB = b.some(isInBewteen(...a));

    return someA || someB;
  };

/**
 * 获取关系文件信息
 *
 * @description 获取关系配置文件（relation.json）的完整路径信息
 *
 * @param {string} rootDir - 项目根目录
 *
 * @returns {Object} 文件信息对象，包含路径、目录等
 *
 * @example
 * const bundle = getRelationsBundle('/path/to/project');
 * // 返回 { absoluteFilePath: '...', relativeFilePath: '...', ... }
 */
export const getRelationsBundle = (rootDir) => {
  const relativeFilePath = 'requirements/persistent/relation.json';

  return relativeFilePathToBundle(rootDir)(relativeFilePath);
};

/**
 * 按行号范围获取文件内容
 *
 * @description 从文件中提取指定行号范围的内容
 *
 * @param {string} absoluteFilePath - 文件的绝对路径
 *
 * @returns {Function} 返回一个函数，接收 [startLine, endLine] 范围参数
 *
 * @example
 * const getter = getContentByRange('/path/to/file.md');
 * const content = getter([10, 20]); // 获取第 10-20 行
 */
export const getContentByRange =
  (absoluteFilePath = '') =>
  (range = []) => {
    const source = readFileSync(absoluteFilePath) || '';

    return getTextInRange(source)(...range);
  };

/**
 * 从引用关系中获取传递关系
 *
 * @description 分析引用关系，找出传递的引用关系
 * 用于追踪间接引用
 *
 * @param {Object} quote - 引用对象，包含 filePath 和 range
 *
 * @returns {Function} 返回一个函数，接收关系列表参数
 *
 * @example
 * const getter = getRelationsFromPassthrough({ filePath: 'file.md', range: [10, 20] });
 * const result = getter(relations);
 */
export const getRelationsFromPassthrough =
  (quote = {}) =>
  (relations = []) => {
    // 确保quote是一个对象
    if (!quote || typeof quote !== 'object') {
      quote = {};
    }

    // 确保relations是一个数组
    if (!Array.isArray(relations)) {
      relations = [];
    }

    const { filePath, range = [] } = quote;

    if (relations.length !== 1) {
      return;
    }

    const [relation = {}] = relations;
    const { range: relationRange = [], quotes: relationQuotes = [] } = relation;

    if (relationQuotes.length !== 1) {
      return;
    }

    const absoluteFilePath = toAbsoluteFilePath(filePath);

    const [first = {}] = relationQuotes;
    const { filePath: firstFilePath, range: firstRange = [] } = first;

    const targetAbsoluteFilePath = toAbsoluteFilePath(filePath);
    const sourceAbsoluteFilePath = toAbsoluteFilePath(firstFilePath);

    const target = readFileSync(targetAbsoluteFilePath);
    const source = readFileSync(sourceAbsoluteFilePath);

    const targetText = getTextInRange(target)(relationRange);
    const sourceText = getTextInRange(source)(firstRange);

    if (targetText !== sourceText) {
      return;
    }

    const gap = range[1] - range[0];
    const gapRelation = range[0] - relationRange[0];
    const resultRange = [firstRange[0] + gapRelation, firstRange[0] + gapRelation + gap];

    return [
      {
        range,
        quotes: [
          {
            ...quote,
            range: resultRange,
            filePath: firstFilePath,
          },
        ],
      },
    ];
  };

export const traceRelations =
  (rootDir) =>
  (relations = []) => {
    const bundle = getRelationsBundle(rootDir) || {};
    const { absoluteFilePath: relationAbsoluteFilePath } = bundle;

    const read = readJSONSync(relationAbsoluteFilePath) || [];
    const store = read.reduce((result = {}, item = {}) => {
      const { absoluteFilePath } = item;

      result[absoluteFilePath] = item;
      return result;
    }, {});

    const traceQuote = (quote = {}) => {
      const { filePath, range: quoteRange = [] } = quote;
      const { [filePath]: { relations: gotRelations = [] } = {} } = store;

      if (!gotRelations.length) {
        return [quote];
      }

      const isMatched = isCross(quoteRange);
      const filterForRange = (item) => isMatched(item?.range);
      const filterForQuotes = (item) => item?.quotes?.length;
      const mapForQuotes = (item) => item.quotes || [];

      const filtered = gotRelations.filter(filterForRange);

      const getRelations = getRelationsFromPassthrough(quote);
      const got = getRelations(filtered) || filtered;

      const source = got.filter(filterForQuotes).map(mapForQuotes).flat();

      const traced = source.map(traceQuote).flat();

      if (!traced?.length) {
        return [quote];
      }

      return traced;
    };

    const traceQuotes = (quotes = []) => quotes.map(traceQuote).flat();

    return relations.map((item = {}, index) => {
      const { quotes: itemQuotes = [] } = item;
      const quotes = traceQuotes(itemQuotes);

      return { ...item, quotes };
    });
  };

export const writeRelations =
  (rootDir) =>
  (absoluteFilePath, relations = []) => {
    const bundle = getRelationsBundle(rootDir) || {};
    const { absoluteFilePath: relationAbsoluteFilePath } = bundle;

    const read = readJSONSync(relationAbsoluteFilePath) || [];
    const found = read.find((item) => item.absoluteFilePath === absoluteFilePath);

    relations = traceRelations(rootDir)(relations);

    if (found) {
      found.relations = relations;
    } else {
      read.push({ absoluteFilePath, relations });
    }

    writeToJSONSync('关联关系', relationAbsoluteFilePath)(read);
  };

export const writeQuoteToContent =
  (rootDir = '', displayName = '') =>
  (quotesAbsoluteFilePath, contentAbsoluteFilePath) => {
    rootDir = rootDir || process.cwd();
    displayName = displayName || path.basename(contentAbsoluteFilePath);

    const quotesSource = readFileSync(quotesAbsoluteFilePath) || '';
    const parsed = parseToList({ rootDir })(quotesSource) || [];

    const mapForChild = (item = {}) => {
      const { content = '' } = item;

      const reg = /^[^：]*：/g;
      const description = content.includes('：') ? content.replace(reg, '') : '';

      const [first = {}] = parseQuote(content) || [];

      const { filePath = '', range = [] } = first;

      if (!filePath || !range.length) {
        return;
      }

      const sourceFilePath = (() => {
        const reg = /spec\.(txt|md)$/g;
        const matched = reg.test(filePath);
        const filename = path.basename(filePath);

        return matched ? `inputs/${filename}` : filePath;
      })();

      const sourceAbsoluteFilePath = toAbsoluteFilePath(rootDir)(sourceFilePath);
      const read = readFileSync(sourceAbsoluteFilePath) || readRawSpecContentSync(rootDir) || '';
      const paragraph = getTextInRange(read)(...range) || '';

      return {
        ...first,
        description,
        paragraph,
        filePath: sourceAbsoluteFilePath,
      };
    };

    const mapped = parsed.map((item = {}) => {
      const { title, children: itemChildren = [] } = item;
      const children = itemChildren.map(mapForChild).filter(Boolean);

      return { title, children };
    });

    let total = 1;
    const parts = [];
    const relations = [];

    const push = (current) => {
      const merged = current ? `\n\n${current}\n\n` : '';
      const splitted = merged.split('\n');

      total += splitted.length - 3;
      parts.push(current);
    };

    mapped.forEach((item = {}) => {
      const { title, children = [] } = item;

      if (!title) {
        return;
      }

      const forEach = (current = {}) => {
        const { paragraph = '', ...rest } = current;

        const start = total;
        push(paragraph);
        const end = Math.max(total - 2, start);

        const relation = {
          range: [start, end],
          quotes: [rest],
        };

        relations.push(relation);
      };

      push(`# ${title}【标题】`);
      children.forEach(forEach);
    });

    writeRelations(rootDir)(contentAbsoluteFilePath, relations);
    return commitToFileSync(displayName, contentAbsoluteFilePath)(parts);
  };
