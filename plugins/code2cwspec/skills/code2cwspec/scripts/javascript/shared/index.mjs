/**
 * Shared 工具库导出索引
 *
 * @description 这是 shared 工具库的主入口文件
 * 导出所有子模块的公共 API，方便其他模块统一导入
 *
 * 包含的模块：
 * - tools.mjs: 基础工具函数（文件操作、路径处理等）
 * - parse.mjs: Markdown 解析工具（标题、列表、表格解析）
 * - write.mjs: 文件写入工具（生成、修改文件）
 * - check.mjs: 检查验证工具（关键词检查等）
 * - quotes.mjs: 引用处理工具（代码引用、关系追踪）
 * - service.mjs: 服务相关工具（API 调用、认证等）
 * - retrieval.mjs: 检索工具（数据检索、转换等）
 *
 * @example
 * // 导入所有工具
 * import { readFileSync, parse, writeToFileSync } from './shared/index.mjs';
 *
 * // 或者导入特定模块
 * import { readFileSync } from './shared/tools.mjs';
 * import { parse } from './shared/parse.mjs';
 */

export * from './tools.mjs';
export * from './parse.mjs';
export * from './write.mjs';
export * from './check.mjs';
export * from './quotes.mjs';
export * from './service.mjs';
export * from './retrieval.mjs';
export * from './er-diagram.mjs';
