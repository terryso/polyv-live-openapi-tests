/**
 * 生成一个随机的标签名称
 * @param prefix 标签名称前缀
 * @returns 带随机数的标签名称
 */
export function generateRandomLabelName(prefix: string = '测试标签'): string {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}`;
} 