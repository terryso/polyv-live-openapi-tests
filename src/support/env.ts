import * as dotenv from 'dotenv';
import * as path from 'path';

// 根据环境加载对应的.env文件
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// 导出环境变量
export const config = {
  api: {
    baseUrl: process.env.POLYV_API_BASE_URL || 'https://api.polyv.net',
  },
  test: {
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '10000', 10),
  }
};

// 验证必要的环境变量
export function validateEnv(): void {
  const requiredVars = ['POLYV_API_BASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`缺少必要的环境变量: ${missingVars.join(', ')}`);
  }
} 