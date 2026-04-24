import fs from 'fs';
import path from 'path';

/**
 * 重要标记常量
 *
 * @description 用于在 Markdown 文件中标记重要内容的注释标记
 * 格式：<!-- IMPORTANT -->
 * 用途：标记需要特别关注的内容，在文件处理时会被保留
 *
 * @type {string}
 *
 * @example
 * // 在 Markdown 中使用
 * <!-- IMPORTANT --> 这是一个重要的说明
 */
export const IMPORTANT = 'IMPORTANT';

/**
 * 待处理标记常量
 *
 * @description 用于在 Markdown 文件中标记待处理内容的注释标记
 * 格式：<!-- PENDING -->
 * 用途：标记尚未完成的内容，在文件处理时会被移除
 *
 * @type {string}
 *
 * @example
 * // 在 Markdown 中使用
 * <!-- PENDING --> 这是待处理的内容
 */
export const PENDING = '<!-- PENDING -->';

/**
 * 业务功能相关性标记对象
 *
 * @description 用于标记内容是否与当前业务功能相关
 * 包含三种状态：未知、相关、无关
 * 用于在内容检查和过滤时判断是否需要处理
 *
 * @type {Object}
 * @property {string} UNKOWN - 未知状态：【是否与当前业务功能相关】
 * @property {string} MATCHED - 相关状态：【当前业务功能相关】
 * @property {string} NONMATCHED - 无关状态：【当前业务功能无关】
 *
 * @example
 * // 在 Markdown 中使用
 * 【当前业务功能相关】 这是与业务相关的内容
 * 【当前业务功能无关】 这是与业务无关的内容
 */
export const FOREIGN = {
  TITLE: '依赖的外部能力',
  UNKOWN: '【是否与当前业务功能相关】',
  MATCHED: '【当前业务功能相关】',
  NONMATCHED: '【当前业务功能无关】',
};

/**
 * 权限中心配置对象
 *
 * @description 定义权限中心的完整配置，包括实体、枚举、页面和路由信息
 * 用于权限相关的检查和路由判断
 *
 * @type {Object}
 * @property {string} cn - 中文名称：权限中心
 * @property {string} en - 英文名称：PermissionCenter
 * @property {string} viewPathPrefix - 视图路径前缀：/permissionCenter
 * @property {Array<Object>} entities - 实体列表（用户、角色、权限等）
 * @property {Array<Object>} enums - 枚举列表（用户状态、用户来源等）
 * @property {Array<Object>} views - 页面列表（登录、用户管理、角色管理等）
 *
 * @example
 * // 访问权限中心的实体
 * permission.entities.forEach(entity => {
 *   console.log(entity.cn, entity.en); // 用户 LcapUser
 * });
 *
 * // 访问权限中心的页面
 * permission.views.forEach(view => {
 *   console.log(view.cn, view.route.path); // 用户管理 /permissionCenter/userManagement
 * });
 */
export const permission = {
  cn: '权限中心',
  en: 'PermissionCenter',
  viewPathPrefix: '/permissionCenter',
  entities: [
    { cn: '用户', en: 'LcapUser' },
    { cn: '角色', en: 'LcapRole' },
    { cn: '权限', en: 'LcapPermission' },
    { cn: '资源', en: 'LcapResource' },
    { cn: '部门', en: 'LcapDepartment' },
    { cn: '角色与权限映射', en: 'LcapRolePerMapping' },
    { cn: '用户与角色映射', en: 'LcapUserRoleMapping' },
    { cn: '权限与资源映射', en: 'LcapPerResMapping' },
    { cn: '用户与部门映射', en: 'LcapUserDeptMapping' },
    // { cn: '数据权限', en: 'LcapDataPermission' },
    // { cn: '行权限', en: 'LcapRowRuleItem' },
    // { cn: '列权限', en: 'LcapColumnRule' },
  ],
  enums: [
    { cn: '用户状态', en: 'UserStatusEnum' },
    { cn: '用户来源', en: 'UserSourceEnum' },
  ],
  views: [
    {
      cn: '登录',
      en: 'login',
      route: {
        type: 'login',
        path: '/login',
        alias: 'login',
        levels: ['登录'],
      },
    },
    {
      cn: '无权限页',
      en: 'noAuth',
      route: {
        type: 'other',
        path: '/noAuth',
        alias: 'noAuth',
        levels: ['无权限页'],
      },
    },
    {
      cn: '权限中心',
      en: 'permissionCenter',
      route: {
        type: 'router_container',
        path: '/permissionCenter',
        alias: 'permissionCenter',
        levels: ['权限中心'],
      },
    },
    {
      cn: '用户管理',
      en: 'userManagement',
      entities: [{ cn: '用户', en: 'LcapUser' }],
      route: {
        type: 'crud',
        isIndex: true,
        path: '/permissionCenter/userManagement',
        alias: 'userManagement',
        levels: ['权限中心', '用户管理'],
      },
    },
    {
      cn: '角色管理',
      en: 'roleManagement',
      entities: [{ cn: '角色', en: 'LcapRole' }],
      route: {
        type: 'crud',
        path: '/permissionCenter/roleManagement',
        alias: 'roleManagement',
        levels: ['权限中心', '角色管理'],
      },
    },
    {
      cn: '权限管理',
      en: 'permissionManagement',
      entities: [{ cn: '权限', en: 'LcapPermission' }],
      route: {
        type: 'crud',
        path: '/permissionCenter/permissionManagement',
        alias: 'permissionManagement',
        levels: ['权限中心', '权限管理'],
      },
    },
    {
      cn: '部门管理',
      en: 'departmentManagement',
      entities: [{ cn: '部门', en: 'LcapDepartment' }],
      route: {
        type: 'crud',
        path: '/permissionCenter/departmentManagement',
        alias: 'departmentManagement',
        levels: ['权限中心', '部门管理'],
      },
    },
  ],
};

/** 权限中心子页面/路由的英文 alias 集合，供路径判断复用 */
export const PERMISSION_VIEW_ALIASES = new Set(
  (permission?.views ?? []).map((v) => v?.route?.alias ?? v?.en).filter(Boolean)
);

/** 路径或 alias 中用于识别「权限相关」的关键词（小写），与 PERMISSION_VIEW_ALIASES 一起使用 */
export const PERMISSION_PATH_KEYWORDS = [
  'permission',
  'rolemanagement',
  'permissioncenter',
  'permissionmanagement',
  'usermanagement',
  'departmentmanagement',
  'login',
  'noauth',
];

/**
 * 高层级规划文件不参与「权限相关」判定，避免误判。
 * 如 plan 下的 index.md、routes.md、cores.md、entities.md 等。
 */
export const PERMISSION_EXCLUDED_BASENAMES = ['index.md', 'routes.md', 'cores.md', 'entities.md', 'er-diagram.md'];

/** 路径（完整路径或片段）中是否包含上述高层级文件名（任一路径段匹配即排除） */
export const isExcludedByPath = (p) => {
  if (p?.includes?.('requirements/')) {
    return true;
  }

  const normalized = String(p ?? '').replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const set = new Set(PERMISSION_EXCLUDED_BASENAMES.map((n) => n.toLowerCase()));
  return segments.some((seg) => set.has(seg.toLowerCase()));
};

/**
 * 根据路径或拼接字符串（如 alias + path + levels）判断是否属于权限相关。
 * 供 check-keywords、check-frontend-routes 等复用。
 * 若路径中包含高层级文件名（如 index.md、routes.md、cores.md、entities.md）任一段则排除，不判为权限相关。
 */
export const isPermissionRelatedPath = (pathOrCombined = '') => {
  const raw = String(pathOrCombined ?? '');
  if (!raw) return false;
  if (isExcludedByPath(raw)) return false;

  const lower = raw.toLowerCase();
  if ([...PERMISSION_VIEW_ALIASES].some((alias) => lower.includes(alias.toLowerCase()))) return true;
  return PERMISSION_PATH_KEYWORDS.some((kw) => lower.includes(kw));
};

/** 内容中用于识别「权限相关」的标记与关键词（与 readPrompts 等约定一致） */
const PERMISSION_CONTENT_MARKERS = [
  '# 权限中心-',
  '.Lcap',
  'permission',
  '权限中心',
  '用户管理',
  '角色管理',
  '权限管理',
  '部门管理',
  '根部门',
  '登录',
  '认证',
  '鉴权',
  '无权限',
  'noAuth',
  'permissioncenter',
  'usermanagement',
  'rolemanagement',
  'permissionmanagement',
  'departmentmanagement',
  'login',
  'auth',
  'rbac',
];

/**
 * 根据文件内容判断是否属于权限相关（用于关键字长度等检查的排除）。
 */
export const isPermissionRelatedContent = (source = '') => {
  const s = String(source ?? '');
  if (PERMISSION_CONTENT_MARKERS.some((m) => s.includes(m))) return true;
  if (/\b[Ll]cap[A-Za-z0-9_]+\b/.test(s)) return true;
  return false;
};

/**
 * 综合路径 + 内容判断是否属于权限相关（如 plan 下的 view/logic 文件）。
 * 权限相关文档不参与关键字冲突检查（长度、NASL 关键字等均跳过）。
 * 高层级文件（index.md、routes.md、cores.md、entities.md）一律不判为权限相关。
 */
export const isPermissionRelated = (absoluteFilePath = '', source = '') => {
  if (isExcludedByPath(absoluteFilePath)) return false;
  if (isPermissionRelatedPath(absoluteFilePath)) return true;
  if (isPermissionRelatedContent(source)) return true;
  return false;
};

/**
 * 将字符串转换为数字
 *
 * @description 简单的类型转换函数，将任何值转换为数字类型
 *
 * @param {*} source - 要转换的值
 *
 * @returns {number} 转换后的数字，如果无法转换则返回 NaN
 *
 * @example
 * toNumber('123') // 返回 123
 * toNumber('45.67') // 返回 45.67
 * toNumber('abc') // 返回 NaN
 */
export const toNumber = (source) => Number(source);

/**
 * 获取文件路径的正则表达式
 *
 * @description 返回一个正则表达式，用于匹配文件路径格式（包含目录和文件名）
 * 匹配格式：目录/文件名.扩展名
 *
 * @returns {RegExp} 匹配文件路径的全局正则表达式
 *
 * @example
 * const reg = getPathReg();
 * const paths = 'path/to/file.md and another/file.txt'.match(reg);
 * // 返回 ['path/to/file.md', 'another/file.txt']
 */
export const getPathReg = () => /[0-9a-zA-Z\-/\\]+\/[^./\\]+\.[a-zA-Z]+/g;

/**
 * 从文本中提取指定范围内的内容
 *
 * @description 根据起始行号和结束行号，从多行文本中提取指定范围的内容
 * 行号从 1 开始计数（1-based）
 *
 * @param {string} source - 源文本内容
 *
 * @returns {Function} 返回一个函数，接收 (startLineNumber, endLineNumber) 参数
 *
 * @example
 * const text = 'line1\nline2\nline3\nline4';
 * const extractor = getTextInRange(text);
 * const result = extractor(2, 3); // 返回 'line2\nline3'
 */
export const getTextInRange =
  (source = '') =>
  (startLineNumber, endLineNumber) => {
    const isMatch = (i) => {
      const start = startLineNumber - 1;
      const end = endLineNumber - 1;

      return start <= i && i <= end;
    };

    const parts = source.split('\n');
    const matched = parts.filter((item, index) => isMatch(index));

    return matched.join('\n');
  };

/**
 * 从文本中提取两个标记之间的内容
 *
 * @description 查找文本中两个指定标记之间的内容，支持单向提取（只指定起始标记）
 *
 * @param {string} source - 源文本内容
 *
 * @returns {Function} 返回一个函数，接收 (start, end) 参数
 *
 * @example
 * const text = 'prefix【内容】suffix';
 * const extractor = getTextInBetween(text);
 * const result = extractor('【', '】'); // 返回 '内容'
 *
 * // 只指定起始标记
 * const text2 = 'start-content-end';
 * const result2 = getTextInBetween(text2)('start-', ''); // 返回 'content-end'
 */
export const getTextInBetween =
  (source = '') =>
  (start = '', end = '') => {
    const startIndex = source.indexOf(start);
    const partIndex = startIndex + start.length;
    const sliced = source.slice(partIndex);
    const partEndIndex = end ? sliced.indexOf(end) : sliced.length;

    if (partEndIndex < 0 || startIndex < 0) {
      return;
    }

    const endIndex = partEndIndex + partIndex;

    const got = source.slice(startIndex + start.length, endIndex);

    return got;
  };

/**
 * 同步读取目录内容
 *
 * @description 同步读取指定目录下的所有文件和文件夹，支持递归读取
 * 如果目录不存在，返回空数组
 *
 * @param {string} absoluteDir - 目录的绝对路径
 * @param {Object} options - 读取选项，默认 { recursive: true }
 * @param {boolean} options.recursive - 是否递归读取子目录
 *
 * @returns {Array<string>} 目录内容列表，如果目录不存在返回空数组
 *
 * @example
 * const files = readdirSync('/path/to/dir');
 * // 返回 ['file1.txt', 'file2.md', 'subdir', ...]
 */
export const readdirSync = (absoluteDir = '', options = { recursive: true }) => {
  const existed = fs.existsSync(absoluteDir);

  return existed ? fs.readdirSync(absoluteDir, options) : [];
};

/**
 * 同步读取文件内容
 *
 * @description 同步读取指定文件的内容，返回 UTF-8 编码的字符串
 * 只有当文件路径包含扩展名时才会读取，否则返回 undefined
 * 如果文件不存在，返回 undefined
 *
 * @param {string} absoluteFilePath - 文件的绝对路径
 *
 * @returns {string|undefined} 文件内容，如果文件不存在或路径无效返回 undefined
 *
 * @example
 * const content = readFileSync('/path/to/file.md');
 * // 返回文件的完整内容
 *
 * const invalid = readFileSync('/path/to/dir'); // 返回 undefined（无扩展名）
 */
export const readFileSync = (absoluteFilePath = '') => {
  const reg = /\.[a-zA-Z0-9]+$/g;
  const useful = reg.test(absoluteFilePath);

  if (!useful) {
    return;
  }

  const options = { encoding: 'utf8' };
  const existed = fs.existsSync(absoluteFilePath);

  return existed ? fs.readFileSync(absoluteFilePath, options) : undefined;
};

/**
 * 同步读取并解析 JSON 文件
 *
 * @description 同步读取 JSON 文件并将其解析为 JavaScript 对象
 * 如果解析失败，会输出错误日志并返回 undefined
 *
 * @param {string} absoluteFilePath - JSON 文件的绝对路径
 *
 * @returns {Object|undefined} 解析后的 JavaScript 对象，解析失败返回 undefined
 *
 * @example
 * const config = readJSONSync('/path/to/config.json');
 * // 返回 { key: 'value', ... }
 */
export const readJSONSync = (absoluteFilePath = '') => {
  const source = readFileSync(absoluteFilePath);

  try {
    return source && JSON.parse(source);
  } catch (error) {
    console.log(`[文件](${absoluteFilePath})解析出错`);
  }
};

/**
 * 异步读取文件内容
 *
 * @description 异步读取指定文件的内容，返回 Promise
 * 如果文件不存在，返回 undefined
 *
 * @param {string} absoluteFilePath - 文件的绝对路径
 *
 * @returns {Promise<string|undefined>} 文件内容的 Promise，如果文件不存在返回 undefined
 *
 * @example
 * const content = await readFile('/path/to/file.md');
 * console.log(content); // 文件的完整内容
 */
export const readFile = (absoluteFilePath = '') => {
  const options = { encoding: 'utf8' };
  const existed = fs.existsSync(absoluteFilePath);

  return existed ? fs.promises.readFile(absoluteFilePath, options) : undefined;
};

/**
 * 异步读取并解析 JSON 文件
 *
 * @description 异步读取 JSON 文件并将其解析为 JavaScript 对象
 * 如果解析失败，会输出错误日志并返回 undefined
 *
 * @param {string} absoluteFilePath - JSON 文件的绝对路径
 *
 * @returns {Promise<Object|undefined>} 解析后的 JavaScript 对象的 Promise
 *
 * @example
 * const config = await readJSON('/path/to/config.json');
 * console.log(config); // { key: 'value', ... }
 */
export const readJSON = async (absoluteFilePath = '') => {
  const source = await readFile(absoluteFilePath);

  try {
    return source && JSON.parse(source);
  } catch (error) {
    console.log(`[文件](${absoluteFilePath})解析出错`);
  }
};

export const a = '_sp';
export const b = 'ec';

/**
 * 获取当前活跃的规范目录
 *
 * @description 根据 .specify.json 配置文件或 status.json 状态文件，
 * 自动定位当前活跃的规范目录（specs/001-xxx 格式）
 * 优先级：1. 配置文件指定的目录 2. 最新有 status.json 的目录 3. 最后一个目录
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {string|undefined} 活跃规范目录的绝对路径，如果未找到返回 undefined
 *
 * @example
 * const specDir = getActiveSpecDir('/path/to/project');
 * // 返回 '/path/to/project/specs/001-crm-financial'
 */
export const getActiveSpecDir = (rootDir = '') => {
  rootDir = rootDir || process.cwd();

  const root = path.resolve(rootDir, 'specs');
  const specAbsoluteFilePath = path.resolve(rootDir, `${a + b}.json`);
  const specJSON = readJSONSync(specAbsoluteFilePath) || {};

  const filter = (item = '') => /^[0-9]{3,3}/g.test(item);
  const find = (item = '') => specJSON?.entry?.endsWith(item);

  const sort = (a = '', b = '') => {
    const [aString] = a.match(/[0-9]+/g) || [];
    const [bString] = b.match(/[0-9]+/g) || [];

    const aNumber = toNumber(aString);
    const bNumber = toNumber(bString);

    return aNumber > bNumber ? 1 : -1;
  };

  const dirs = readdirSync(root, {}).filter(filter).sort(sort);

  const dir = (() => {
    const foundBySpec = dirs.find(find);

    if (foundBySpec) {
      return foundBySpec;
    }

    const reversed = dirs.slice().reverse();
    const filteredByStatus = reversed.find((item) => {
      const dir = path.resolve(root, item);
      const filePath = path.resolve(dir, 'status.json');

      return readFileSync(filePath);
    });

    if (filteredByStatus) {
      return filteredByStatus;
    }

    return dirs[dirs.length - 1];
  })();

  return dir && path.resolve(root, dir);
};

/**
 * 获取原始规范文件的相对路径
 *
 * @description 在 inputs 目录下查找规范文件（spec.txt 或 spec.md）
 * 返回相对于项目根目录的路径
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {string|undefined} 规范文件的相对路径（如 'inputs/spec.md'），未找到返回 undefined
 *
 * @example
 * const relPath = getRawSpecRelativeFilePath('/path/to/project');
 * // 返回 'inputs/spec.md'
 */
export const getRawSpecRelativeFilePath = (rootDir = '') => {
  rootDir = rootDir || process.cwd();

  const inputsDir = `${rootDir}/inputs`;
  const inputsList = readdirSync(inputsDir);
  const found = inputsList.find((item) => /spec\.(txt|md)$/.test(item));

  return found && `inputs/${found}`;
};

/**
 * 获取原始规范文件的绝对路径
 *
 * @description 在 inputs 目录下查找规范文件（spec.txt 或 spec.md）
 * 返回绝对路径
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {string|undefined} 规范文件的绝对路径，未找到返回 undefined
 *
 * @example
 * const absPath = getRawSpecAbsoluteFilePath('/path/to/project');
 * // 返回 '/path/to/project/inputs/spec.md'
 */
export const getRawSpecAbsoluteFilePath = (rootDir = '') => {
  rootDir = rootDir || process.cwd();

  const specFilePath = getRawSpecRelativeFilePath(rootDir);

  return specFilePath && path.resolve(rootDir, specFilePath);
};

/**
 * 同步读取原始规范文件内容
 *
 * @description 在 inputs 目录下查找并读取规范文件（spec.txt 或 spec.md）的内容
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {string|undefined} 规范文件的内容，未找到返回 undefined
 *
 * @example
 * const content = readRawSpecContentSync('/path/to/project');
 * // 返回规范文件的完整内容
 */
export const readRawSpecContentSync = (rootDir = '') => {
  const absoluteFilePath = getRawSpecAbsoluteFilePath(rootDir);

  return readFileSync(absoluteFilePath);
};

/**
 * 将相对路径转换为完整的文件信息对象
 *
 * @description 根据相对路径生成包含多种路径格式的文件信息对象
 * 包括：相对路径、绝对路径、目录路径、文件名、引用路径等
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {Function} 返回一个函数，接收 relativeFilePath 参数
 *
 * @example
 * const converter = relativeFilePathToBundle('/path/to/project');
 * const bundle = converter('plan/index.md');
 * // 返回 {
 * //   quoteFilePath: 'specs/001-crm/plan/index.md',
 * //   relativeFilePath: 'plan/index.md',
 * //   absoluteFilePath: '/path/to/project/specs/001-crm/plan/index.md',
 * //   absoluteDir: '/path/to/project/specs/001-crm/plan',
 * //   fileName: 'index.md'
 * // }
 */
export const relativeFilePathToBundle =
  (rootDir = '') =>
  (relativeFilePath) => {
    const activeSpecDir = getActiveSpecDir(rootDir);
    const absoluteFilePath = path.resolve(activeSpecDir, relativeFilePath);
    const absoluteDir = path.dirname(absoluteFilePath);
    const fileName = path.basename(absoluteFilePath);
    const quoteFilePath = absoluteFilePath.replace(`${rootDir}/`, '');

    return {
      quoteFilePath,
      relativeFilePath,
      absoluteFilePath,
      absoluteDir,
      fileName,
    };
  };

/**
 * 规范目录下的文件过滤器
 *
 * @description 判断文件是否应该被处理（文件夹、JSON 文件或 Markdown 文件）
 *
 * @param {string} source - 文件或文件夹名称
 *
 * @returns {boolean} 如果是文件夹、JSON 或 Markdown 文件返回 true
 *
 * @example
 * filterForSpec('folder') // 返回 true
 * filterForSpec('config.json') // 返回 true
 * filterForSpec('readme.md') // 返回 true
 * filterForSpec('image.png') // 返回 false
 */
export const filterForSpec = (source = '') => {
  const isFolder = !source.includes('.');
  const isJSON = source.endsWith('.json');
  const isMarkdown = source.endsWith('.md');

  return isFolder || isJSON || isMarkdown;
};

/**
 * 在规范目录下查找单个文件
 *
 * @description 在活跃规范目录下查找满足条件的第一个文件
 * 返回包含完整路径信息的文件对象
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {Function} 返回一个函数，接收回调函数作为查找条件
 *
 * @example
 * const finder = findUnderSpecs('/path/to/project');
 * const result = finder((item) => item.endsWith('plan/index.md'));
 * // 返回 { absoluteFilePath: '...', relativeFilePath: '...', ... }
 */
export const findUnderSpecs =
  (rootDir = '') =>
  (callback) => {
    const activeSpecDir = getActiveSpecDir(rootDir);
    const activeSpecList = readdirSync(activeSpecDir);

    const filtered = activeSpecList.filter(filterForSpec);
    const relativeFilePath = filtered.find(callback);

    return relativeFilePath && relativeFilePathToBundle(rootDir)(relativeFilePath);
  };

/**
 * 在规范目录下查找多个文件
 *
 * @description 在活跃规范目录下查找所有满足条件的文件
 * 返回包含完整路径信息的文件对象数组
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {Function} 返回一个函数，接收回调函数作为查找条件
 *
 * @example
 * const filter = filterUnderSpecs('/path/to/project');
 * const results = filter((item) => item.endsWith('.md'));
 * // 返回 [{ absoluteFilePath: '...', ... }, { absoluteFilePath: '...', ... }]
 */
export const filterUnderSpecs =
  (rootDir = '') =>
  (callback) => {
    const activeSpecDir = getActiveSpecDir(rootDir);
    const activeSpecList = readdirSync(activeSpecDir);

    const filtered = activeSpecList.filter(filterForSpec);
    const relativeFilePaths = filtered.filter(callback);
    const map = relativeFilePathToBundle(rootDir);

    return relativeFilePaths.map(map);
  };

/**
 * 在规范目录下删除文件
 *
 * @description 在活跃规范目录下查找并删除所有满足条件的文件
 * 只删除文件，不删除文件夹
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {Function} 返回一个函数，接收回调函数作为删除条件
 *
 * @example
 * const remover = removeUnderSpecs('/path/to/project');
 * remover((item) => item.endsWith('temp.md')); // 删除所有 temp.md 文件
 */
export const removeUnderSpecs =
  (rootDir = '') =>
  (callback) => {
    const list = filterUnderSpecs(rootDir)(callback);

    const forEach = (item) => {
      const isFile = item?.absoluteFilePath?.includes?.('.');

      if (isFile && fs.existsSync(item.absoluteFilePath)) {
        fs.rmSync(item.absoluteFilePath);
      }
    };

    list.forEach(forEach);
  };

/**
 * 格式化已写入的文件列表
 *
 * @description 将文件路径数组格式化为 Markdown 列表格式
 *
 * @param {string} title - 列表的标题
 *
 * @returns {Function} 返回一个函数，接收文件数组参数
 *
 * @example
 * const formatter = formatWritedFiles('生成的文件');
 * const result = formatter(['file1.md', 'file2.md']);
 * // 返回：
 * // # 生成的文件
 * //
 * // - file1.md
 * // - file2.md
 */
export const formatWritedFiles =
  (title) =>
  (files = []) => {
    const map = (item) => `- ${item}`;
    const array = files.filter(Boolean).map(map);

    const prefixs = [`# ${title}`, ''];
    const merged = [...prefixs, ...array];

    return merged.join('\n');
  };

export const keywords = ['inputs', 'specs'];

/**
 * 将相对路径转换为绝对路径
 *
 * @description 智能转换文件路径为绝对路径，支持多种路径格式
 * 支持：绝对路径、inputs/ 前缀、specs/ 前缀、相对路径等
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {Function} 返回一个函数，接收 filePath 参数
 *
 * @example
 * const converter = toAbsoluteFilePath('/path/to/project');
 *
 * // 已是绝对路径
 * converter('/absolute/path/file.md') // 返回 '/absolute/path/file.md'
 *
 * // inputs 目录下的文件
 * converter('inputs/spec.md') // 返回 '/path/to/project/inputs/spec.md'
 *
 * // specs 目录下的文件
 * converter('specs/001-crm/plan/index.md') // 返回 '/path/to/project/specs/001-crm/plan/index.md'
 *
 * // 相对路径（在活跃规范目录下）
 * converter('plan/index.md') // 返回 '/path/to/project/specs/001-crm/plan/index.md'
 */
export const toAbsoluteFilePath =
  (rootDir = '') =>
  (filePath = '') => {
    const absoluted = filePath?.startsWith?.('/');
    const existed = absoluted && fs.existsSync(filePath);

    if (existed) {
      return filePath;
    }

    const reg = /(\/(inputs|specs)\/)/g;
    const [splited = ''] = filePath.match(reg) || [];

    if (splited) {
      const [, matchedFilePath] = filePath.split(splited);

      if (splited === '/inputs/') {
        return path.resolve(rootDir, `inputs/${matchedFilePath}`);
      }
      filePath = matchedFilePath;
    }

    rootDir = rootDir || process.cwd();
    filePath = filePath.replace(/^\//g, '');

    if (!filePath) {
      return;
    }

    const some = (item) => filePath.startsWith(item);
    const matched = keywords.some(some);

    if (matched) {
      return path.resolve(rootDir, filePath);
    }

    const find = (item) => item.endsWith(filePath);
    const found = findUnderSpecs(rootDir)(find);

    return found?.absoluteFilePath;
  };

/**
 * 获取存在的文件的绝对路径
 *
 * @description 将路径转换为绝对路径，但只有当文件实际存在时才返回
 * 用于验证文件是否存在
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {Function} 返回一个函数，接收 filePath 参数
 *
 * @example
 * const converter = getAbsoluteFilePathWhenExisted('/path/to/project');
 * const path = converter('plan/index.md');
 * // 如果文件存在返回绝对路径，否则返回 undefined
 */
export const getAbsoluteFilePathWhenExisted =
  (rootDir = '') =>
  (filePath = '') => {
    const absoluted = filePath?.startsWith?.('/');
    const existed = absoluted && fs.existsSync(filePath);

    if (existed) {
      return filePath;
    }

    if (absoluted) {
      return;
    }

    const activeSpecDir = getActiveSpecDir(rootDir);
    const absoluteFilePath = path.resolve(activeSpecDir, filePath);

    return getAbsoluteFilePathWhenExisted(rootDir)(absoluteFilePath);
  };

/**
 * 同步读取状态文件
 *
 * @description 读取活跃规范目录下的 status.json 文件
 * 用于获取当前规范的状态信息
 *
 * @param {string} rootDir - 项目根目录，默认为 process.cwd()
 *
 * @returns {Object|undefined} 解析后的状态对象，文件不存在返回 undefined
 *
 * @example
 * const status = readStatusSync('/path/to/project');
 * // 返回 { completed: true, lastUpdate: '2024-01-01', ... }
 */
export const readStatusSync = (rootDir = '') => {
  rootDir = rootDir || process.cwd();

  const activeSpecDir = getActiveSpecDir(rootDir);
  const absoluteFilePath = path.resolve(activeSpecDir, 'status.json');

  return readJSONSync(absoluteFilePath);
};

/**
 * 根据标题列表省略内容
 *
 * @description 从文本中删除或替换指定标题及其下的所有内容
 * 支持按标题名称精确匹配，会删除该标题及其所有子内容
 * 占位符处理：只保留紧跟在标题后面的占位符，删除非标题后的占位符
 *
 * @param {Array<string>} titles - 要删除的标题列表
 * @param {string} placeholder - 替换占位符，如果为空则直接删除
 *
 * @returns {Function} 返回一个函数，接收源文本参数
 *
 * @example
 * const text = '# 标题1\n内容1\n## 子标题\n子内容\n# 标题2\n内容2';
 * const result = omitContentByTitles(['标题1'])('')(text);
 * // 返回 '# 标题2\n内容2'
 *
 * // 使用占位符
 * const result2 = omitContentByTitles(['标题1'], '[已省略]')(text);
 * // 返回 '[已省略]\n# 标题2\n内容2'
 *
 * // 占位符处理示例
 * const text3 = '# 标题\n【占位符】\n内容\n【占位符】';
 * const result3 = omitContentByTitles(['标题'], '[省略]')(text3);
 * // 返回 '[省略]\n内容'（只保留标题后的占位符，删除其他占位符）
 */
export const omitContentByTitles =
  (titles = [], placeholder = '') =>
  (source = '') => {
    titles = Array.from(new Set(titles));

    const parts = source.split('\n') || [];

    const lines = parts.map((content = '', index) => {
      const trimmed = content.trim();

      const title = content.replace(/^#+/g, '').trim();
      const [chars] = content.match(/^#+/g) || [];

      const level = chars?.length;
      const main = { index, content };
      const rest = level ? { level, title } : {};

      return { ...main, ...rest };
    });

    titles.forEach((title = '') => {
      const filter = (item) => item.title === title;
      const filtered = lines.filter(filter);

      filtered.forEach((line = {}) => {
        const { index, level } = line;

        const find = (item) => item.level <= level;

        const start = index;
        const sliced = lines.slice(index + 1);
        const found = sliced.find(find) || {};
        const { index: end = lines.length } = found;

        const matched = lines.slice(start, end);

        matched.forEach((item = {}) => {
          if (placeholder) {
            item.content = '【占位符】';
          } else {
            item.omitted = true;
          }
        });
      });
    });

    const joined = lines
      .filter((item) => !item.omitted)
      .map((item) => item.content)
      .join('\n');

    return joined
      .replace(/(?<=(\n[^#\n]+))[\n\s]*(\n?【占位符】)+/g, '\n')
      .replace(/(\n?【占位符】)+/g, `\n${placeholder}\n`);
  };

/**
 * 根据标题关键词省略内容
 *
 * @description 从文本中删除或替换包含指定关键词的标题及其下的所有内容
 * 支持按关键词模糊匹配
 *
 * @param {Array<string>} keywords - 标题关键词列表
 * @param {string} placeholder - 替换占位符，如果为空则直接删除
 *
 * @returns {Function} 返回一个函数，接收源文本参数
 *
 * @example
 * const text = '# 用户管理\n内容1\n# 权限管理\n内容2';
 * const result = omitContentByTitleKeywords(['权限'], '')(text);
 * // 返回 '# 用户管理\n内容1'
 */
export const omitContentByTitleKeywords =
  (keywords = [], placeholder = '') =>
  (source) => {
    const titles = source
      .split('\n')
      .filter((item = '') => {
        item = item.trim();
        return item.startsWith('#');
      })
      .map((item = '') => {
        const reg = /^[#\s]+/g;

        return item.replace(reg, '');
      })
      .filter((item = '') => keywords.some((keyword = '') => item.includes(keyword)));

    return omitContentByTitles(titles, placeholder)(source);
  };

/**
 * 自动执行脚本（当直接运行时）
 *
 * @description 检查当前脚本是否被直接执行（而不是被导入），如果是则执行回调函数
 * 用于支持脚本既可以被导入使用，也可以被直接执行
 *
 * @param {Object} meta - import.meta 对象，包含脚本的元信息
 *
 * @returns {Function} 返回一个异步函数，接收回调函数参数
 *
 * @example
 * // 在脚本末尾
 * auto(import.meta)(async () => {
 *   const result = await toRaw();
 *   console.log(result);
 * });
 *
 * // 当直接运行脚本时，回调函数会被执行
 * // 当脚本被导入时，回调函数不会被执行
 */
export const auto = (meta) => async (callback) => {
  const file = meta?.filename;
  const arg = process.argv[1];
  const included = file && arg && file.includes(arg);

  included && console.log(await callback());
};
