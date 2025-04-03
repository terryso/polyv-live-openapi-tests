// debug.ts - 用于调试和日志记录

import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as dotenv from 'dotenv';

dotenv.config();

const DEBUG_ENABLED = process.env.DEBUG || false;
const LOG_DIR = path.join(process.cwd(), 'logs');

// 确保日志目录存在
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.error('无法创建日志目录:', err);
}

/**
 * 记录调试信息到文件
 * @param prefix 日志前缀，通常表示日志类别
 * @param message 日志信息
 * @param data 要记录的数据对象，会被转成JSON格式
 */
export function logDebug(prefix: string, message: string, data?: any): void {
  if (!DEBUG_ENABLED) return;

  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${prefix}] ${message}\n`;
  
  let dataString = '';
  if (data !== undefined) {
    try {
      dataString = util.inspect(data, { depth: null, colors: false }) + '\n';
    } catch (err) {
      dataString = `[无法序列化数据对象: ${err}]\n`;
    }
  }

  const logFile = path.join(LOG_DIR, `debug-${new Date().toISOString().split('T')[0]}.log`);
  
  try {
    fs.appendFileSync(logFile, logLine + dataString);
    if (prefix.includes('api') || prefix.includes('error')) {
      console.log(logLine, dataString);
    }
  } catch (err) {
    console.error('写入日志文件失败:', err);
  }
}

/**
 * 记录API请求相关的调试信息
 * @param context 上下文信息
 * @param url 请求URL
 * @param method 请求方法
 * @param headers 请求头
 * @param body 请求体
 */
export function logApiRequest(context: string, url: string, method: string, headers?: any, body?: any): void {
  logDebug('api:request', `${context} - ${method} ${url}`, {
    headers,
    body
  });
}

/**
 * 记录API响应相关的调试信息
 * @param context 上下文信息
 * @param url 请求URL
 * @param statusCode 响应状态码
 * @param headers 响应头
 * @param body 响应体
 */
export function logApiResponse(context: string, url: string, statusCode: number, headers?: any, body?: any): void {
  logDebug('api:response', `${context} - ${statusCode} ${url}`, {
    headers,
    body
  });
}

/**
 * 记录错误信息
 * @param context 上下文信息
 * @param error 错误对象
 * @param extraData 额外数据
 */
export function logError(context: string, error: Error, extraData?: any): void {
  logDebug('error', `${context} - ${error.message}`, {
    stack: error.stack,
    extraData
  });
} 