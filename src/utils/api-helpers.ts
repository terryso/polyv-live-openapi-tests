import * as crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { processContextVariables } from './step-helpers';

/**
 * 连接参数为字符串 - 保利威API签名使用
 * @param params 参数对象
 * @returns 拼接后的字符串
 */
export function concatPolyvParams(params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  let result = '';
  
  for (const key of keys) {
    const value = params[key];
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      continue;
    }
    result += key + value;
  }
  
  return result;
}

/**
 * MD5加密 - 保利威API签名使用
 * @param text 待加密文本
 * @returns MD5哈希值
 */
export function md5Hex(text: string): string {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex').toLowerCase();
}

/**
 * SHA256加密 - 保利威API签名使用
 * @param text 待加密文本
 * @returns SHA256哈希值
 */
export function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').toLowerCase();
}

/**
 * 计算保利威MD5签名
 * @param params 参数对象
 * @param appSecret 应用密钥
 * @returns MD5签名
 */
export function getPolyvMD5Sign(params: Record<string, string>, appSecret: string): string {
  const concatStr = concatPolyvParams(params);
  const plain = appSecret + concatStr + appSecret;
  return md5Hex(plain).toUpperCase();
}

/**
 * 计算保利威SHA256签名
 * @param params 参数对象
 * @param appSecret 应用密钥
 * @returns SHA256签名
 */
export function getPolyvSHA256Sign(params: Record<string, string>, appSecret: string): string {
  const concatStr = concatPolyvParams(params);
  const plain = appSecret + concatStr + appSecret;
  return sha256Hex(plain).toUpperCase();
}

/**
 * 要忽略的动态字段列表
 * 这些字段在每次响应中可能都会变化，不需要比较
 */
export const IGNORED_FIELDS = ['requestId', 'timestamp', 'authToken', 'aiChatToken'];

/**
 * 清理对象中的动态字段
 * @param obj 要清理的对象
 * @returns 清理后的对象副本
 */
export function cleanDynamicFields(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // 创建对象副本
  const result = Array.isArray(obj) ? [...obj] : {...obj};
  
  // 移除忽略的字段
  IGNORED_FIELDS.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(result, field)) {
      delete result[field];
    }
  });
  
  // 递归处理嵌套对象
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key) && 
        result[key] && 
        typeof result[key] === 'object') {
      result[key] = cleanDynamicFields(result[key]);
    }
  }
  
  return result;
}

/**
 * 深度匹配两个对象，支持通配符
 */
export function deepMatch(actual: any, expected: any, path: string = '', context?: any): { match: boolean; message?: string } {
  // 如果期望值是通配符"*"，则任何值都匹配
  if (expected === "*") return { match: true };
  
  // 如果期望值包含上下文引用 {context.xxx}
  if (typeof expected === 'string' && expected.includes('{context.')) {
    // 使用通用函数处理上下文变量
    if (context) {
      try {
        const replacedExpected = processContextVariables({ context } as any, expected);
        
        // 如果替换后的类型不是字符串，则直接使用新值进行匹配
        if (typeof replacedExpected !== 'string') {
          return deepMatch(actual, replacedExpected, path, context);
        }
        
        // 替换后仍然是字符串，继续处理
        expected = replacedExpected;
      } catch (e) {
        return {
          match: false,
          message: `路径 "${path}" 中的上下文变量替换失败: ${e}`
        };
      }
    }
  }
  
  // 如果期望值包含环境变量引用 {env.xxx}
  if (typeof expected === 'string' && expected.includes('{env.')) {
    const envPathMatches = expected.match(/{env\.([^}]+)}/);
    if (envPathMatches && envPathMatches[1]) {
      const envKey = envPathMatches[1];
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        // 替换环境变量值后重新匹配
        const replacedExpected = expected.replace(/{env\.[^}]+}/, String(envValue));
        return deepMatch(actual, replacedExpected, path, context);
      } else {
        return {
          match: false,
          message: `路径 "${path}" 引用的环境变量 ${envKey} 未定义`
        };
      }
    }
  }
  
  // 如果期望是null，实际值必须也是null
  if (expected === null) {
    if (actual === null) return { match: true };
    return { match: false, message: `路径 "${path}" 期望为null，实际为${actual}` };
  }
  
  // 处理字符串类型的通配符匹配
  if (typeof expected === 'string' && typeof actual === 'string') {
    // 如果期望值包含通配符模式（如 "*categoryId*"）
    if (expected.startsWith('*') && expected.endsWith('*') && expected.length > 2) {
      // 提取要匹配的子字符串 (去掉两端的 *)
      const substring = expected.substring(1, expected.length - 1);
      if (actual.includes(substring)) {
        return { match: true };
      }
      return { 
        match: false, 
        message: `路径 "${path}" 值不匹配: 期望包含 ${substring}，实际 ${actual}` 
      };
    } 
    // 匹配结尾（如 "*测试"）
    else if (expected.startsWith('*') && !expected.endsWith('*') && expected.length > 1) {
      const suffix = expected.substring(1);
      if (actual.endsWith(suffix)) {
        return { match: true };
      }
      return { 
        match: false, 
        message: `路径 "${path}" 值不匹配: 期望以 ${suffix} 结尾，实际 ${actual}` 
      };
    } 
    // 匹配开头（如 "测试*"）
    else if (!expected.startsWith('*') && expected.endsWith('*') && expected.length > 1) {
      const prefix = expected.substring(0, expected.length - 1);
      if (actual.startsWith(prefix)) {
        return { match: true };
      }
      return { 
        match: false, 
        message: `路径 "${path}" 值不匹配: 期望以 ${prefix} 开头，实际 ${actual}` 
      };
    }
  }
  
  // 类型不同，直接不匹配
  if (typeof expected !== typeof actual) {
    return { 
      match: false, 
      message: `路径 "${path}" 类型不匹配: 期望 ${typeof expected}，实际 ${typeof actual}` 
    };
  }
  
  // 如果期望是对象，检查actual是否包含所有预期的键和值
  if (typeof expected === 'object' && !Array.isArray(expected)) {
    if (typeof actual !== 'object' || Array.isArray(actual)) {
      return { 
        match: false, 
        message: `路径 "${path}" 期望为对象，实际为 ${Array.isArray(actual) ? 'array' : typeof actual}` 
      };
    }
    
    for (const key of Object.keys(expected)) {
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        return { match: false, message: `路径 "${path}.${key}" 缺少字段` };
      }
      
      const result = deepMatch(actual[key], expected[key], path ? `${path}.${key}` : key, context);
      if (!result.match) {
        return result;
      }
    }
    
    return { match: true };
  }
  
  // 如果期望是数组，检查长度是否匹配并且每个元素都匹配
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return { 
        match: false, 
        message: `路径 "${path}" 期望为数组，实际为 ${typeof actual === 'object' ? '对象' : typeof actual}` 
      };
    }
    
    if (expected.length !== actual.length) {
      return { 
        match: false, 
        message: `路径 "${path}" 数组长度不匹配: 期望 ${expected.length}，实际 ${actual.length}` 
      };
    }
    
    for (let i = 0; i < expected.length; i++) {
      const result = deepMatch(actual[i], expected[i], `${path}[${i}]`, context);
      if (!result.match) {
        return result;
      }
    }
    
    return { match: true };
  }
  
  // 对于基本类型，执行严格相等检查
  if (actual === expected) {
    return { match: true };
  }
  
  return { 
    match: false, 
    message: `路径 "${path}" 值不匹配: 期望 ${expected}，实际 ${actual}` 
  };
}

/**
 * 获取快照目录路径
 */
export function getSnapshotDir(): string {
  return process.env.NODE_ENV === 'test'
    ? path.join(process.cwd(), 'test-snapshots')
    : path.join(process.cwd(), 'src', 'snapshots');
}

/**
 * 快照目录路径
 */
export const SNAPSHOT_DIR = getSnapshotDir();

/**
 * 检查快照目录是否存在且可写
 * @param dirPath 目录路径
 * @throws {Error} 如果目录不存在或没有写入权限
 */
export function checkSnapshotDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`快照目录不存在: ${dirPath}，请确保目录已在代码仓库中创建`);
  }
  try {
    fs.accessSync(dirPath, fs.constants.W_OK);
  } catch (error) {
    throw new Error(`快照目录没有写入权限: ${dirPath}`);
  }
}

/**
 * 确保快照目录存在
 * 如果目录不存在，会尝试创建，支持多级目录结构
 * @param dirPath 需要确保存在的目录路径，如果不提供则使用默认SNAPSHOT_DIR
 * @throws {Error} 如果无法创建目录或没有写入权限
 */
export function ensureSnapshotDirExists(dirPath?: string): void {
  const targetPath = dirPath || SNAPSHOT_DIR;
  if (!fs.existsSync(targetPath)) {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log(`已创建快照目录: ${targetPath}`);
    } catch (error) {
      console.error(`创建快照目录失败: ${error}`);
      throw error;
    }
  }
  checkSnapshotDir(targetPath);
}

/**
 * 生成快照文件名
 * @param snapshotName 快照名称，可以包含子目录路径（如 "user/login_response"）
 * @returns 快照文件路径
 */
export function getSnapshotFilePath(snapshotName: string): string {
  return path.join(SNAPSHOT_DIR, `${snapshotName}.json`);
}

/**
 * 保存响应快照
 * @param name 快照名称，可以包含子目录路径（如 "user/login_response"）
 * @param response 响应数据
 * @throws {Error} 如果保存失败
 */
export function saveSnapshot(name: string, response: any): void {
  // 确保基础快照目录存在
  ensureSnapshotDirExists();
  
  const filePath = getSnapshotFilePath(name);
  const dirPath = path.dirname(filePath);
  
  // 确保子目录存在
  if (!fs.existsSync(dirPath)) {
    ensureSnapshotDirExists(dirPath);
  }
  
  const cleanedResponse = cleanDynamicFields(response);
  try {
    fs.writeFileSync(filePath, JSON.stringify(cleanedResponse, null, 2));
    console.log(`已保存快照: ${filePath}`);
  } catch (error) {
    console.error(`保存快照失败: ${error}`);
    throw error;
  }
}

/**
 * 加载响应快照
 * @param snapshotName 快照名称
 * @returns 快照内容
 */
export function loadSnapshot(snapshotName: string): any {
  const snapshotPath = getSnapshotFilePath(snapshotName);
  const snapshotDir = path.dirname(snapshotPath);
  
  // 确保快照目录存在
  if (!fs.existsSync(snapshotDir)) {
    ensureSnapshotDirExists(snapshotDir);
  }
  
  if (!fs.existsSync(snapshotPath)) {
    // 如果处于快照更新模式，创建一个空的快照文件
    if (isSnapshotUpdateMode()) {
      console.log(`创建空快照文件: ${snapshotPath}`);
      fs.writeFileSync(snapshotPath, JSON.stringify({}));
      return {};
    } else {
      // 提供友好错误信息，指导用户如何创建快照
      throw new Error(
        `快照文件不存在: ${snapshotPath}\n` +
        `请使用 SNAPSHOT_UPDATE=true 环境变量运行测试以创建快照，例如:\n` +
        `SNAPSHOT_UPDATE=true npm test -- --tags '@${snapshotName.split('/')[0]}'`
      );
    }
  }
  
  try {
    const snapshotContent = fs.readFileSync(snapshotPath, 'utf8');
    return JSON.parse(snapshotContent);
  } catch (error) {
    console.error(`加载快照失败: ${error}`);
    throw error;
  }
}

/**
 * 判断是否处于快照更新模式
 * 当环境变量 UPDATE_SNAPSHOTS=true 时，会更新快照而不是验证
 */
export function isSnapshotUpdateMode(): boolean {
  return process.env.UPDATE_SNAPSHOTS === 'true';
}

/**
 * 添加一个处理表格数据中值的替换函数
 */
export function processValue(value: any, context: any): any {
  if (typeof value === 'string') {
    // 替换 {now} 为时间戳
    if (value.includes('{now}')) {
      const timestamp = context.timestamp || Date.now();
      return value.replace('{now}', timestamp.toString());
    }
  }
  return value;
}

// 重新导出以确保值被更新
export { SNAPSHOT_DIR as default }; 