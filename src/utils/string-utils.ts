/**
 * 字符串工具函数模块
 * 提供各种常用的字符串处理实用函数
 */

/**
 * 将驼峰命名法转换为下划线命名法
 * 例如：userId -> user_id, channelId -> channel_id, UserInfo -> user_info
 * @param text 驼峰命名法字符串
 * @returns 下划线命名法字符串
 */
export function camelCaseToSnakeCase(text: string): string {
  return text
    // 在大写字母前添加下划线
    .replace(/([A-Z])/g, '_$1')
    // 确保字符串以小写字母开头
    .toLowerCase()
    // 移除可能在字符串开头的下划线
    .replace(/^_/, '');
}

/**
 * 将下划线命名法转换为驼峰命名法
 * 例如：user_id -> userId, channel_id -> channelId
 * @param text 下划线命名法字符串
 * @returns 驼峰命名法字符串
 */
export function snakeCaseToCamelCase(text: string): string {
  return text
    // 将下划线和后面的字符替换为大写字母
    .replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * 将字符串首字母大写
 * @param str 输入字符串
 * @returns 首字母大写的字符串
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 将字符串首字母小写
 * @param str 输入字符串
 * @returns 首字母小写的字符串
 */
export function lowercaseFirstLetter(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * 生成包含时间戳的唯一字符串
 * @param prefix 前缀字符串
 * @returns 包含时间戳的唯一字符串
 */
export function generateUniqueString(prefix: string = ''): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}_${randomStr}`;
}

/**
 * 截断字符串到指定长度，并添加省略号
 * @param str 输入字符串
 * @param maxLength 最大长度
 * @returns 截断后的字符串
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
} 