import { CustomWorld } from '../support/world';
import { getPolyvMD5Sign } from './api-helpers';
import { logApiRequest, logApiResponse } from './debug';

/**
 * 获取有效的响应并进行验证
 * @param world CustomWorld实例
 * @returns 响应对象
 */
export function getValidResponse(world: CustomWorld): any {
  const response = world.getLastResponse();
  
  if (!response) {
    console.error(`步骤响应诊断:`);
    console.error(`当前步骤: ${world.getCurrentStepNumber()}`);
    console.error(`所有已保存的步骤响应: ${Array.from(world.stepResponses.keys()).join(', ')}`);
    throw new Error('未收到有效的API响应');
  }
  
  return response;
}

/**
 * 处理数据表格，返回有效数据行和表头信息
 * @param dataTable 数据表格
 * @returns 处理后的表格信息
 */
export function processDataTable(dataTable: any): { rows: any[][], hasHeader: boolean, startRow: number } {
  // 直接使用raw格式处理表格数据
  const rows = dataTable.raw();
  
  // 检查是否有表头行
  const hasHeader = rows.length > 0 && rows[0].length >= 2 && 
                   (rows[0][0] === '字段名' || rows[0][0] === '参数名' || rows[0][0] === 'param_name' || 
                    rows[0][0] === 'key' || rows[0][1] === '值' || rows[0][1] === '参数值' || 
                    rows[0][1] === 'param_value' || rows[0][1] === 'value');
  
  // 从第二行开始处理（如果有表头）
  const startRow = hasHeader ? 1 : 0;
  
  return { rows, hasHeader, startRow };
}

/**
 * 处理字符串中的上下文变量替换
 * @param world CustomWorld实例
 * @param value 字符串值
 * @returns 处理后的值
 */
export function processContextVariables(world: CustomWorld, value: string): any {
  if (typeof value !== 'string' || !value.includes('{context.')) {
    return value;
  }
  
  // 检查是否是完整的上下文变量引用，例如 "{context.channelId}"
  const completeContextMatch = value.match(/^\{context\.([^}]+)\}$/);
  if (completeContextMatch) {
    const key = completeContextMatch[1];
    const contextValue = world.context[key];
    if (contextValue === undefined) {
      console.warn(`警告: 上下文中不存在变量 ${key}`);
      return value; // 如果变量不存在，保持原样
    }
    
    // 根据值类型返回适当的数据类型
    if (typeof contextValue === 'number') {
      return contextValue; // 返回数字类型
    } else if (typeof contextValue === 'boolean') {
      return contextValue; // 返回布尔类型
    } else if (contextValue === null) {
      return null; // 返回 null
    } else if (typeof contextValue === 'object') {
      return contextValue; // 返回对象或数组
    }
    
    // 默认返回字符串
    return String(contextValue);
  }
  
  // 处理部分上下文变量引用，例如 "频道ID: {context.channelId}"
  const result = value.replace(/\{context\.([^}]+)\}/g, (match, key) => {
    const contextValue = world.context[key];
    if (contextValue === undefined) {
      console.warn(`警告: 上下文中不存在变量 ${key}`);
      return match; // 如果变量不存在，保持原样
    }
    return String(contextValue); // 在字符串中间的变量必须转为字符串
  });
  
  // 处理替换后的数组字符串 (如 "[12345]")
  if ((result.startsWith('[') && result.endsWith(']')) ||
      (result.startsWith('{') && result.endsWith('}'))) {
    try {
      return JSON.parse(result);
    } catch (e) {
      // 解析失败，保持字符串格式
      console.warn(`警告: 无法解析替换后的JSON字符串: ${result}`);
    }
  }
  
  return result;
}

/**
 * 处理字符串中的动态时间戳替换
 * @param value 字符串值
 * @returns 处理后的字符串
 */
export function processTimestamp(value: string): string {
  if (typeof value === 'string' && value.includes('<timestamp>')) {
    const timestamp = Date.now();
    return value.replace(/<timestamp>/g, timestamp.toString());
  }
  return value;
}

/**
 * 处理请求数据中的所有数组参数
 * @param jsonData 请求数据对象
 * @param world CustomWorld实例
 * @returns 处理后的请求数据对象
 */
export function processArrayParameters(jsonData: any, world: CustomWorld): any {
  if (!jsonData || typeof jsonData !== 'object') {
    return jsonData;
  }
  
  const result = { ...jsonData };
  
  // 处理所有属性
  Object.keys(result).forEach(key => {
    const value = result[key];
    
    // 检查是否是字符串形式的数组
    if (typeof value === 'string' && 
        value.trim().startsWith('[') && 
        value.trim().endsWith(']')) {
      try {
        // 尝试解析数组字符串
        let arrayValue = JSON.parse(value);
        
        // 确保是数组
        if (Array.isArray(arrayValue)) {
          // 处理数组中的每个元素
          arrayValue = arrayValue.map(item => {
            // 处理上下文变量
            if (typeof item === 'string' && item.includes('{context.')) {
              return processContextVariables(world, item);
            }
            return item;
          });
          
          // 更新处理后的数组
          result[key] = arrayValue;
        }
      } catch (e) {
        // 确保明确调用console.warn，以便测试可以捕获
        console.warn(`无法解析参数 ${key} 的数组值: ${e instanceof Error ? e.message : String(e)}`);
        // 无效的JSON字符串数组，保持原样
      }
    } else if (Array.isArray(value)) {
      // 如果已经是数组，处理数组中的每个元素
      result[key] = value.map(item => {
        if (typeof item === 'string' && item.includes('{context.')) {
          return processContextVariables(world, item);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      // 递归处理嵌套对象
      result[key] = processArrayParameters(value, world);
    }
  });
  
  return result;
}

/**
 * 准备请求参数和签名
 * @param world CustomWorld实例
 * @param appSecret 应用密钥
 * @param includeJsonDataInSign 是否将JSON数据包含在签名计算中（默认false，为JSON请求）
 * @returns 处理后的参数对象
 */
export function prepareRequestParams(world: CustomWorld, appSecret: string, includeJsonDataInSign: boolean = false): { 
  allParams: Record<string, string>, 
  timestamp: string,
  jsonData: Record<string, any> 
} {
  // 获取保利威API参数
  const appId = process.env.POLYV_APP_ID;
  const userId = process.env.POLYV_USER_ID;
  
  if (!appId || !appSecret) {
    throw new Error('环境变量中缺少POLYV_APP_ID或POLYV_APP_SECRET');
  }
  
  // 准备签名参数 - 认证相关参数
  const timestamp = Date.now().toString();
  const authParams: Record<string, string> = {
    appId,
    timestamp
  };
  
  // 如果有userId，添加到参数中
  if (userId) {
    authParams.userId = userId;
  }
  
  // 创建allParams副本，用于最终返回
  const allParams = { ...authParams };
  
  // 仅用于签名计算的参数对象
  const signParams = { ...authParams };
  
  // 获取JSON数据并处理数组参数
  let jsonData = world.context.jsonData || {};
  jsonData = processArrayParameters(jsonData, world);
  
  // 处理表单数据和查询参数，这些始终添加到签名计算中
  const formData = world.context.formData || {};
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '')) {
      allParams[key] = String(value);
      signParams[key] = String(value);
    }
  });
  
  const queryParams = world.context.queryParams || {};
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '')) {
      allParams[key] = String(value);
      signParams[key] = String(value);
    }
  });
  
  // 如果需要将JSON数据包含在签名计算中
  if (includeJsonDataInSign) {
    Object.entries(jsonData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && 
          !(typeof value === 'string' && value.trim() === '') &&
          typeof value !== 'object') {
        signParams[key] = String(value);
      }
    });
  }
  
  // 计算MD5签名 (默认使用MD5算法)
  const sign = getPolyvMD5Sign(signParams, appSecret);
  
  // 添加签名到参数中
  allParams.sign = sign;
  
  return { allParams, timestamp, jsonData };
}

/**
 * 发送请求
 * @param world CustomWorld实例
 * @param method 请求方法
 * @param url 请求URL
 * @param spec 请求规范对象
 * @param options 请求选项
 * @returns 响应结果
 */
export async function sendRequest(
  world: CustomWorld, 
  method: string, 
  url: string, 
  spec: any, 
  options: { 
    withForm?: Record<string, any>, 
    withJson?: Record<string, any>,
    contentType?: string,
    isMultipartFile?: boolean 
  } = {}
): Promise<any> {
  // 设置请求头
  if (options.contentType) {
    spec.withHeaders({
      'Content-Type': options.contentType
    });
  }
  
  // 设置表单数据
  if (options.withForm) {
    if (options.isMultipartFile) {
      // 如果是文件上传，使用 withMultiPartFormData 而不是 withForm
      spec.withMultiPartFormData(options.withForm);
    } else {
      spec.withForm(options.withForm);
    }
  }
  
  // 设置JSON数据
  if (options.withJson) {
    spec.withJson(options.withJson);
  }
  
  // 记录请求信息
  try {
    const requestOptions = spec?.requestOptions || {};
    logApiRequest(
      'sendRequest', 
      url, 
      method, 
      requestOptions.headers, 
      options.withJson || options.withForm || requestOptions.formData || requestOptions.multiPartFormData
    );
  } catch (error) {
    console.error('记录请求信息失败:', error);
  }
  
  // 发送请求
  let response;
  try {
    // 确保方法字符串被正确处理
    const httpMethod = method.toUpperCase().trim();
    
    // 使用原有的switch方法发送请求
    switch(httpMethod) {
      case 'GET':
        response = await spec.get(url).toss();
        break;
      case 'POST':
        response = await spec.post(url).toss();
        break;
      case 'PUT':
        response = await spec.put(url).toss();
        break;
      case 'DELETE':
        response = await spec.delete(url).toss();
        break;
      case 'PATCH':
        response = await spec.patch(url).toss();
        break;
      default:
        throw new Error(`不支持的请求方法: ${httpMethod}`);
    }
    
    // 记录响应信息
    try {
      logApiResponse(
        'sendRequest', 
        url, 
        response.statusCode, 
        response.headers, 
        response.json || response.body
      );
    } catch (error) {
      console.error('记录响应信息失败:', error);
    }
    
    return response;
  } catch (error) {
    // 记录错误信息
    console.error('API请求失败:', error);
    throw error;
  }
} 