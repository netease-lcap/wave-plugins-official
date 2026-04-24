/**
 * 请求接口查询是否存在组件
 *
 * 用法: API_BASE_URL=https://api.example.com node query-frontend-components.mjs [query...]
 * 示例: API_BASE_URL=https://api.example.com node query-frontend-components.mjs "表格组件" "按钮" "表单"
 */

import crypto from 'crypto';
import { spawnSync } from 'child_process';

/**
 * OpenAPI 访问密钥
 *
 * @description 用于 API 认证的访问密钥
 * 可通过环境变量 LCAP_OPENAPI_AK_V2 设置，默认值为 'low-code'
 *
 * @type {string}
 */
export const AK = process.env.LCAP_OPENAPI_AK_V2 || 'low-code';

/**
 * OpenAPI 访问密钥对应的密钥
 *
 * @description 用于生成签名的密钥
 * 可通过环境变量 LCAP_OPENAPI_SK_V2 设置，默认值为 'ATVby0mjxHju'
 *
 * @type {string}
 */
export const SK = process.env.LCAP_OPENAPI_SK_V2 || 'ATVby0mjxHju';

/**
 * API 服务器基础 URL
 *
 * @description NASL 服务器的基础 URL
 * 可通过环境变量 NASL_SERVER_BASE_URL 设置，默认值为 'https://nasl.lcap.163yun.com'
 *
 * @type {string}
 */
export const BASE_URL = process.env.NASL_SERVER_BASE_URL || 'https://nasl.lcap.163yun.com';

/**
 * 租户 ID
 *
 * @description 当前租户的唯一标识
 * 可通过环境变量 CW_TENANT 设置，默认值为 'defaulttenant'
 *
 * @type {string}
 */
export const tenantId = process.env.CW_TENANT || 'defaulttenant';

/**
 * IDE 版本
 *
 * @description 当前使用的 IDE 版本
 * 可通过环境变量 NASL_IDE_VERSION 设置，默认值为 '4.4.0'
 *
 * @type {string}
 */
export const ideVersion = process.env.NASL_IDE_VERSION || '4.4.0';

/**
 * 构建 API 请求签名
 *
 * @description 使用 MD5 算法生成 API 请求的签名
 * 签名用于验证请求的合法性
 *
 * @param {string} ak - 访问密钥
 * @param {string} nonce - 随机数
 * @param {string} timestamp - 时间戳
 * @param {string} sk - 密钥
 *
 * @returns {string} MD5 签名字符串
 *
 * @example
 * const signature = buildSignature('key', 'nonce123', '1234567890', 'secret');
 * // 返回 MD5 哈希值
 */
export const buildSignature = (ak, nonce, timestamp, sk) => {
  const plainText = `${ak}&${nonce}&${timestamp}&${sk}`;

  return crypto.createHash('md5').update(plainText).digest('hex');
};

/**
 * 发送 API 请求
 *
 * @description 使用 curl 发送 HTTP 请求到 API 服务器
 * 自动处理签名、认证头等
 *
 * @param {string} urlPath - API 路径（相对于 BASE_URL）
 * @param {Object} options - 请求选项
 * @param {string} options.method - HTTP 方法，默认为 'GET'
 * @param {Object} options.data - 请求数据（会自动转换为 JSON）
 * @param {string} options.body - 原始请求体（优先于 data）
 *
 * @returns {Promise<Object>} API 响应数据
 *
 * @throws {Error} 如果请求失败或响应错误
 *
 * @example
 * const result = await query('/openapi/v2/components', {
 *   method: 'POST',
 *   data: { query: '表格' }
 * });
 */
export const query = async (urlPath = '', options = {}) => {
  if (!BASE_URL) {
    throw new Error(
      '请设置环境变量 API_BASE_URL，例如: API_BASE_URL=https://api.example.com node query-frontend-components.mjs'
    );
  }

  if (!urlPath) {
    throw new Error('请输入参数 urlPath');
  }

  const nonce = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildSignature(AK, nonce, timestamp, SK);

  const url = `${BASE_URL}${urlPath}`;

  const headers = {
    'X-AppKey': AK,
    'X-Nonce': nonce,
    'X-Signature': signature,
    'X-Timestamp': timestamp.toString(),
    'Content-Type': 'application/json',
  };

  const { data, method = 'GET', body: optionsBody, ...rest } = options;

  const body = (() => {
    if (optionsBody) {
      return optionsBody;
    }

    return data && JSON.stringify(data);
  })();

  const merged = {
    headers,
    method,
    body,
    ...rest,
  };

  const headerArgs = Object.entries(headers).flatMap(([k, v]) => ['-H', `${k}: ${v}`]);
  const curlArgs = ['-s', '-w', '\n%{http_code}', '-X', method, ...headerArgs, ...(body ? ['-d', body] : []), url];
  const {
    stdout,
    stderr,
    status: curlStatus,
  } = spawnSync('curl', curlArgs, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (curlStatus !== 0) {
    console.log(url, merged);
    throw new Error(`curl 执行失败: ${stderr || stdout || curlStatus}`);
  }

  const lastNewline = stdout.lastIndexOf('\n');
  const bodyStr = lastNewline >= 0 ? stdout.slice(0, lastNewline) : stdout;
  const httpStatus = lastNewline >= 0 ? parseInt(stdout.slice(lastNewline + 1), 10) : 0;

  if (httpStatus < 200 || httpStatus >= 300) {
    console.log(url, merged);
    throw new Error(`请求失败: ${httpStatus}`);
  }

  const result = bodyStr ? JSON.parse(bodyStr) : {};

  if (result?.code && result?.code !== 200) {
    throw new Error(`请求失败: ${result.code} ${result.msg}`);
  }

  return result;
};

/**
 * 查询 RAG 回调信息
 *
 * @description 查询前端组件是否存在，用于 RAG（检索增强生成）功能
 *
 * @param {Object} options - 查询选项
 * @param {string} [options.query='前端组件'] - 查询关键词
 * @param {string} [options.tenantId] - 租户 ID，默认使用全局 tenantId
 * @param {string} [options.ideVersion] - IDE 版本，默认使用全局 ideVersion
 *
 * @returns {Promise<Object>} 查询结果
 *
 * @throws {Error} 如果租户 ID 未设置或请求失败
 *
 * @example
 * const result = await queryRagCallback({ query: '表格组件' });
 */
export const queryRagCallback = async (options = {}) => {
  if (!tenantId) {
    throw new Error('请设置环境变量 CW_TENANT，例如：defaulttenant');
  }

  const data = {
    tenantId,
    ideVersion,
    frontendType: null,
    frontendFrameWork: null,
    frontendFrameWorkUI: null,
    topK: {
      "bc": 0,
      "et_platform": 10,
      "et_tenant": 10,
      "et_market": 10
    },
    ...options,
  };

  const urlPath = '/openapi/v2/aiService/rag/callback';
  const merged = { method: 'POST', data };

  return query(urlPath, merged);
};
