import { FOREIGN } from './tools.mjs';
import { queryRagCallback } from './service.mjs';

/**
 * 检索结果的默认数量
 *
 * @description 每次查询返回的最大结果数
 *
 * @type {number}
 */
export const COUNT = 10;

/**
 * 数组去重
 *
 * @description 移除数组中的重复元素，保留唯一值
 *
 * @param {Array} source - 源数组
 *
 * @returns {Array} 去重后的数组
 *
 * @example
 * toUnique(['a', 'b', 'a', 'c']) // 返回 ['a', 'b', 'c']
 */
export const toUnique = (source = []) => {
  if (!Array.isArray(source)) {
    return [];
  }
  return Array.from(new Set(source));
};

/**
 * 合并数组为字符串
 *
 * @description 使用指定的分隔符将数组元素连接为字符串
 *
 * @param {Array} array - 源数组
 * @param {string} joinner - 分隔符，默认为 '\n\n'
 *
 * @returns {string} 合并后的字符串
 *
 * @example
 * merge(['item1', 'item2', 'item3'], '\n')
 * // 返回 'item1\nitem2\nitem3'
 */
export const merge = (array = [], joinner = '\n\n') => {
  if (!Array.isArray(array)) {
    return '';
  }
  return array.join(joinner);
};

/**
 * 将普通项转换为 Markdown 消息
 *
 * @description 将对象转换为 Markdown 格式的消息
 * 格式：**名称**：描述
 *
 * @param {Object} item - 项对象，包含 name 和 description
 *
 * @returns {string} Markdown 格式的消息
 *
 * @example
 * normalToMessage({ name: '用户管理', description: '管理系统用户' })
 * // 返回 '**用户管理**：管理系统用户'
 */
export const normalToMessage = (item = {}) => {
  if (typeof item !== 'object' || item === null) {
    return '';
  }

  const { name, description } = item;

  // 只有当 name 存在且不为空时才添加前缀
  const prefix = name ? `**${name}**` : '';
  const parts = [prefix, description].filter(Boolean);

  return parts.join('：');
};

/**
 * 将逻辑项转换为 Markdown 列表项
 *
 * @description 将逻辑项转换为 Markdown 列表格式
 *
 * @param {Object} item - 逻辑项对象
 *
 * @returns {string} Markdown 列表项
 *
 * @example
 * logicToMessage({ name: '查询用户', description: '根据 ID 查询用户信息' })
 * // 返回 '- **查询用户**：根据 ID 查询用户信息'
 */
export const logicToMessage = (item = {}) => {
  const got = normalToMessage(item);

  return `- ${got}`;
};

/**
 * 将接口项转换为 Markdown 消息
 *
 * @description 将 API 接口项转换为 Markdown 格式
 * 包含接口名称、路径、方法、协议等信息
 *
 * @param {Object} item - 接口项对象
 * @param {string} item.name - 接口名称
 * @param {string} item.path - 接口路径
 * @param {string} item.method - HTTP 方法
 * @param {string} item.protocol - 协议
 * @param {string} item.description - 接口描述
 *
 * @returns {string} Markdown 格式的接口信息
 *
 * @example
 * interfaceToMessage({
 *   name: '获取用户',
 *   path: '/api/users/:id',
 *   method: 'GET',
 *   protocol: 'HTTP',
 *   description: '获取指定用户的信息'
 * })
 */
export const interfaceToMessage = (item = {}) => {
  if (typeof item !== 'object' || item === null) {
    return '';
  }

  const { name, path, method, protocol, description } = item;

  // 如果没有有效的接口信息，返回空字符串
  if (!name && !path && !method && !protocol && !description) {
    return '';
  }

  const object = { protocol, method, path };
  const json = JSON.stringify(object);

  const parts = [logicToMessage(item), `  - **接口细节**：\` ${json} \``];

  return merge(parts, '\n');
};

/**
 * 检索结果分类信息配置
 *
 * @description 定义了不同类型检索结果的分类信息和转换方法
 * 包括连接器、后端依赖库、API 服务等分类
 *
 * @type {Array<Object>}
 * @property {string} category - 分类标识符
 * @property {string} label - 分类显示标签
 * @property {Function} toChildren - 将源对象转换为子项数组的函数
 *
 * @example
 * categoryInfos.find(info => info.category === 'connector')
 * // 返回连接器分类的配置信息
 */
export const categoryInfos = [
  {
    category: 'connector',
    label: '连接器',
    toChildren: (source = {}) => {
      const { details = {} } = source;
      const { logics = [], interfaces = [] } = details;

      const result = [];

      logics.forEach((item = {}) => {
        const message = logicToMessage(item);

        result.push(message);
      });

      interfaces.forEach((item = {}) => {
        const message = interfaceToMessage(item);

        result.push(message);
      });

      return result;
    },
  },
  {
    category: 'library',
    label: '后端依赖库',
    toChildren: (source = {}) => {
      const { details = {} } = source;
      const { logics = [] } = details;

      return logics.map(logicToMessage);
    },
  },
  {
    category: 'interface',
    label: 'API 服务',
    toChildren: (source = {}) => {
      const { details = {} } = source;
      const { interfaces = [] } = details;

      return interfaces.map(interfaceToMessage);
    },
  },
];

/**
 * 提取项的分类标识符
 *
 * @description 从项对象中提取 category 属性值
 * 用于分类和分组检索结果
 *
 * @param {Object} item - 项对象
 *
 * @returns {string|undefined} 项的分类标识符
 *
 * @example
 * mapForCategory({ category: 'connector', name: 'test' })
 * // 返回 'connector'
 */
export const mapForCategory = (item) => item?.category;

/**
 * 解析项的声明信息
 *
 * @description 将项对象中的 declaration 字符串解析为 JSON 对象
 * 并保留原始项的引用以供后续使用
 *
 * @param {Object} item - 项对象，包含 declaration 属性
 * @param {string} item.declaration - JSON 格式的声明字符串
 *
 * @returns {Object|null} 解析后的对象，包含 raw 属性指向原始项；
 *                        如果解析失败或输入无效则返回 null
 *
 * @example
 * mapForParse({
 *   declaration: '{"symbol":"User","version":"1.0"}',
 *   provider: 'backend'
 * })
 * // 返回 { symbol: 'User', version: '1.0', raw: {...} }
 */
export const mapForParse = (item) => {
  if (!item || typeof item !== 'object' || !item.declaration) {
    return null;
  }

  try {
    const object = JSON.parse(item.declaration);
    object.raw = item;
    return object;
  } catch (error) {
    return null;
  }
};

/**
 * 将检索项转换为 Markdown 内容
 *
 * @description 高阶函数，将检索项转换为格式化的 Markdown 内容
 * 包含标题、详情和子项信息
 *
 * @param {string} titlePrefix - 标题前缀，用于 Markdown 标题级别
 *
 * @returns {Function} 返回一个函数，接收检索项对象并返回 Markdown 字符串
 *
 * @example
 * const converter = mapForContent('#');
 * converter({
 *   symbol: 'UserService',
 *   version: '1.0.0',
 *   category: 'connector',
 *   details: { logics: [], interfaces: [] }
 * })
 * // 返回格式化的 Markdown 内容
 */
export const mapForContent =
  (titlePrefix = '') =>
  (item = {}) => {
    const { symbol = '', version = '', category = '', details = {}, raw = {} } = item;
    const { distance = '' } = raw;

    const find = (item) => item?.category === category;
    const found = categoryInfos.find(find) || {};
    const { toChildren } = found;

    const main = version ? `${symbol}@${version}` : `${symbol}`;

    const detail = (() => {
      const baisc = { symbol };

      version && Object.assign(baisc, { version });
      distance && Object.assign(baisc, { distance });

      const rest = JSON.stringify(baisc);

      return `**${main}**：\`${rest}\``;
    })();

    const parts = [`#${titlePrefix} ${main}${FOREIGN.UNKOWN}`, , detail];
    const children = toUnique(toChildren ? toChildren(item) : []) || [];

    parts.push(...children);
    return merge(parts);
  };

/**
 * 查询单个检索结果
 *
 * @description 根据查询字符串调用 RAG 回调函数获取检索结果
 * 并将结果解析为结构化对象数组
 *
 * @param {string} query - 查询字符串
 *
 * @returns {Promise<Array>} 返回解析后的检索结果数组
 *                           如果查询失败或输入无效则返回空数组
 *
 * @example
 * const results = await querySingleRetrievalkResult('用户管理');
 * // 返回 [{ symbol: 'User', version: '1.0', ... }, ...]
 */
export const querySingleRetrievalkResult = async (query = '') => {
  if (typeof query !== 'string') {
    return [];
  }

  try {
    const options = { query, score: 0.6 };

    const type = process.env.RETRIEVAL_SOURCE_TYPE;
    switch (type) {
      case 'platform':
        options.topK = {
          "bc": 0,
          "et_platform": 10,
          "et_tenant": 0,
          "et_market": 0
        }
        break;
      case 'tenant':
        options.topK = {
          "bc": 0,
          "et_platform": 0,
          "et_tenant": 10,
          "et_market": 0
        }
        break;
      case 'market':
        options.topK = {
          "bc": 0,
          "et_platform": 0,
          "et_tenant": 0,
          "et_market": 10
        }
        break;
      default:
        break;
    }

    const got = await queryRagCallback(options);
    const array = got?.result || [];

    return array.map(mapForParse);
  } catch (error) {
    return [];
  }
};

/**
 * 查询多个检索结果并去重
 *
 * @description 批量查询多个查询字符串，合并结果并按照
 * 分类、符号、版本、提供者进行去重
 *
 * @param {Array|string} group - 查询字符串数组或单个查询字符串
 *
 * @returns {Promise<Array>} 返回去重后的检索结果数组
 *                           如果查询失败则返回空数组
 *
 * @example
 * const results = await queryRetrievalkResult(['用户管理', '权限控制']);
 * // 返回合并去重后的结果数组
 */
export const queryRetrievalkResult = async (group = []) => {
  group = Array.isArray(group) ? group : [group];

  try {
    const promises = group.map(querySingleRetrievalkResult);
    const waited = await Promise.all(promises);
    const merged = waited.flat();

    const set = new Set();

    return merged.filter((item = {}) => {
      const { category, symbol, version, raw = {}, details = {} } = item;
      const { logics = [], interfaces = [] } = details;
      const { provider } = raw;

      const [first] = [...logics, ...interfaces].filter(Boolean);
      const message = first && normalToMessage(first);

      const parts = [category, symbol, version, provider, message];
      const key = parts.filter(Boolean).join('-');

      if (set.has(key)) {
        return false;
      }

      set.add(key);
      return true;
    });
  } catch (error) {
    return [];
  }
};

/**
 * 查询检索结果并转换为 Markdown 消息
 *
 * @description 查询检索结果，按分类组织，并转换为格式化的 Markdown 消息
 * 每个分类最多返回 COUNT 个结果
 *
 * @param {Array|string} group - 查询字符串数组或单个查询字符串
 * @param {string} titlePrefix - Markdown 标题前缀，默认为 '#'
 *
 * @returns {Promise<string>} 返回格式化的 Markdown 消息字符串
 *                            如果查询失败则返回空字符串
 *
 * @example
 * const message = await queryRetrievalkMessage(['用户管理', '权限控制'], '##');
 * // 返回按分类组织的 Markdown 格式消息
 */
export const queryRetrievalkMessage = async (group = [], titlePrefix = '#') => {
  try {
    const array = await queryRetrievalkResult(group);

    const categories = array.map(mapForCategory).filter(Boolean);

    const unique = toUnique(categories);

    const combined = unique.map((category) => {
      const matchCategory = (item) => item?.category === category;
      const filtered = array.filter(matchCategory).slice(0, COUNT);
      const found = categoryInfos.find(matchCategory) || {};
      const { label } = found;

      const matched = filtered.map(mapForContent(titlePrefix));
      const useful = toUnique(matched);
      const parts = [`${titlePrefix} ${label}（${category}）`, ...useful];

      return merge(parts);
    });

    return merge(combined);
  } catch (error) {
    return '';
  }
};
