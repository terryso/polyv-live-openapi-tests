import * as crypto from 'crypto';

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
 * SHA1加密 - 保利威API签名使用
 * @param text 待加密文本
 * @returns SHA1哈希值
 */
export function sha1Hex(text: string): string {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex').toLowerCase();
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