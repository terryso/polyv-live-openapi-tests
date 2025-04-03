/**
 * 请求处理相关的辅助函数
 * 从api.steps.ts中提取的通用请求处理逻辑
 */
import { CustomWorld } from '../support/world';
import { processContextVariables, processTimestamp } from './step-helpers';

/**
 * 处理JSON请求体数据
 * @param jsonString JSON字符串
 * @returns 处理后的JSON对象
 */
export function processJsonBody(jsonString: string): any {
  try {
    // 解析JSON字符串
    let jsonBody = JSON.parse(jsonString);
    
    // 处理动态时间戳替换
    jsonBody = processJsonTimestamps(jsonBody);
    
    return jsonBody;
  } catch (error) {
    throw new Error(`无法解析JSON请求体: ${error}`);
  }
}

/**
 * 递归处理JSON中的动态时间戳
 * @param obj JSON对象
 * @returns 处理后的对象
 */
export function processJsonTimestamps(obj: any): any {
  if (typeof obj === 'string' && obj.includes('<timestamp>')) {
    const timestamp = Date.now();
    return obj.replace(/<timestamp>/g, timestamp.toString());
  } else if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(item => processJsonTimestamps(item));
    } else {
      const result: any = {};
      for (const key in obj) {
        result[key] = processJsonTimestamps(obj[key]);
      }
      return result;
    }
  }
  return obj;
}

/**
 * 值处理器类型定义
 * 定义如何处理表格中的字段值
 */
type ValueProcessor = (fieldValue: any, world: CustomWorld) => any;

/**
 * 通用表格数据处理函数
 * @param rows 表格行数据
 * @param hasHeader 是否有表头
 * @param startRow 开始处理的行索引
 * @param world CustomWorld实例
 * @param valueProcessor 值处理器函数
 * @returns 处理后的数据对象
 */
export function processTableData<T extends Record<string, any>>(
  rows: any[][],
  hasHeader: boolean,
  startRow: number,
  world: CustomWorld,
  valueProcessor: ValueProcessor
): T {
  const result: Record<string, any> = {};
  
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    
    if (row.length < 2) {
      continue;
    }
    
    const fieldName = row[0];
    let fieldValue = row[1];
    
    // 安全处理：确保字段名和值都不是undefined或null
    if (!fieldName || fieldName.trim() === '') {
      continue;
    }
    
    // 跳过表头行的字段名和值
    if (hasHeader && (fieldName === '字段名' || fieldName === '参数名' || fieldName === 'param_name' || 
                      fieldName === 'key' || fieldValue === '值' || fieldValue === '参数值' || 
                      fieldValue === 'param_value' || fieldValue === 'value')) {
      continue;
    }
    
    // 处理上下文变量替换
    if (typeof fieldValue === 'string' && fieldValue.includes('{context.')) {
      fieldValue = processContextVariables(world, fieldValue);
    }
    
    // 使用传入的值处理器处理字段值
    const finalValue = valueProcessor(fieldValue, world);
    
    // 保存结果
    result[fieldName] = finalValue;
  }
  
  return result as T;
}

/**
 * JSON值处理器
 * 适用于处理JSON请求体数据的字段值
 */
const jsonValueProcessor: ValueProcessor = (fieldValue: any, world: CustomWorld) => {
  let finalValue: any = fieldValue;

  // 空字符串保持为空字符串
  if (fieldValue === undefined || fieldValue === null) {
    finalValue = '';
  }
  // 尝试转换数字
  else if (typeof fieldValue === 'string' && !isNaN(Number(fieldValue)) && fieldValue.trim() !== '') {
    finalValue = Number(fieldValue);
  }
  // 处理布尔值
  else if (typeof fieldValue === 'string' && fieldValue.toLowerCase() === 'true') {
    finalValue = true;
  }
  else if (typeof fieldValue === 'string' && fieldValue.toLowerCase() === 'false') {
    finalValue = false;
  }
  // 处理动态时间戳替换
  else if (typeof fieldValue === 'string' && fieldValue.includes('<timestamp>')) {
    finalValue = processTimestamp(fieldValue);
  }
  
  return finalValue;
};

/**
 * 查询参数值处理器
 * 适用于处理URL查询参数的字段值
 */
const queryParamValueProcessor: ValueProcessor = (fieldValue: any, world: CustomWorld) => {
  let finalValue = fieldValue;
  
  // 处理动态时间戳替换
  if (typeof finalValue === 'string' && finalValue.includes('<timestamp>')) {
    finalValue = processTimestamp(finalValue);
  }
  
  return finalValue;
};

/**
 * 表单数据值处理器
 * 适用于处理表单数据的字段值
 */
const formDataValueProcessor: ValueProcessor = (fieldValue: any, world: CustomWorld) => {
  let finalValue: any = fieldValue;
  
  // 尝试转换数字
  if (typeof fieldValue === 'string' && !isNaN(Number(fieldValue)) && fieldValue.trim() !== '') {
    finalValue = Number(fieldValue);
  } 
  // 处理布尔值
  else if (typeof fieldValue === 'string' && fieldValue.toLowerCase() === 'true') {
    finalValue = true;
  }
  else if (typeof fieldValue === 'string' && fieldValue.toLowerCase() === 'false') {
    finalValue = false;
  }
  // 处理动态时间戳替换
  else if (typeof fieldValue === 'string' && fieldValue.includes('<timestamp>')) {
    finalValue = processTimestamp(fieldValue);
  }
  
  return finalValue;
};

/**
 * 处理表格数据生成JSON请求体
 * @param rows 表格行数据
 * @param hasHeader 是否有表头
 * @param startRow 开始处理的行索引
 * @param world CustomWorld实例
 * @returns 处理后的JSON对象
 */
export function processTableToJson(
  rows: any[][],
  hasHeader: boolean,
  startRow: number,
  world: CustomWorld
): Record<string, any> {
  return processTableData<Record<string, any>>(
    rows, 
    hasHeader, 
    startRow, 
    world, 
    jsonValueProcessor
  );
}

/**
 * 处理表格数据生成查询参数
 * @param rows 表格行数据
 * @param hasHeader 是否有表头
 * @param startRow 开始处理的行索引
 * @param world CustomWorld实例
 * @returns 处理后的查询参数对象
 */
export function processTableToQueryParams(
  rows: any[][],
  hasHeader: boolean,
  startRow: number,
  world: CustomWorld
): Record<string, any> {
  return processTableData<Record<string, any>>(
    rows, 
    hasHeader, 
    startRow, 
    world, 
    queryParamValueProcessor
  );
}

/**
 * 处理表格数据生成表单数据
 * @param rows 表格行数据
 * @param hasHeader 是否有表头
 * @param startRow 开始处理的行索引
 * @param world CustomWorld实例
 * @returns 处理后的表单数据对象
 */
export function processTableToFormData(
  rows: any[][],
  hasHeader: boolean,
  startRow: number,
  world: CustomWorld
): Record<string, any> {
  return processTableData<Record<string, any>>(
    rows, 
    hasHeader, 
    startRow, 
    world, 
    formDataValueProcessor
  );
} 