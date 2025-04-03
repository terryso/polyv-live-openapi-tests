/**
 * 数组处理相关的辅助函数
 */
import { get } from 'lodash';

/**
 * 验证数组中的每个元素都包含指定字段
 * @param array 要验证的数组
 * @param fieldName 字段名
 * @returns 验证结果，如果通过返回true，否则返回包含错误信息的对象
 */
export function validateArrayElementsHaveField(array: any[], fieldName: string): true | {error: string, index: number} {
  if (!Array.isArray(array)) {
    return {error: `不是有效的数组`, index: -1};
  }
  
  if (array.length === 0) {
    // 空数组不需要验证
    return true;
  }
  
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (!item || typeof item !== 'object' || !Object.prototype.hasOwnProperty.call(item, fieldName)) {
      return {error: `数组中第 ${i + 1} 个元素缺少字段 ${fieldName}`, index: i};
    }
  }
  
  return true;
}

/**
 * 验证数组中的每个元素都包含多个指定字段和类型
 * @param array 要验证的数组
 * @param fields 字段定义列表，包含字段名、类型和描述
 * @returns 验证结果，如果通过返回true，否则返回包含错误信息的对象
 */
export function validateArrayElementsFields(
  array: any[], 
  fields: {字段: string, 类型: string, 描述?: string}[]
): true | {error: string, index: number, field: string} {
  if (!Array.isArray(array)) {
    return {error: `不是有效的数组`, index: -1, field: ''};
  }
  
  if (array.length === 0) {
    // 空数组不需要验证
    return true;
  }
  
  // 定义可以为null的字段列表
  const nullableFields = ['icon', 'description'];  // 可以根据需要扩展
  
  // 遍历数组中的每个对象
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    
    for (const field of fields) {
      const fieldName = field['字段'];
      const fieldType = field['类型'];
      const description = field['描述'] || '';
      
      // 验证字段存在性
      if (!Object.prototype.hasOwnProperty.call(item, fieldName)) {
        return {
          error: `第${i + 1}个对象缺少字段 ${fieldName}(${description})`,
          index: i,
          field: fieldName
        };
      }
      
      // 如果字段值为null且在可空字段列表中，跳过类型验证
      if (item[fieldName] === null && nullableFields.includes(fieldName)) {
        continue;
      }
      
      // 根据字段类型进行验证
      switch (fieldType.toLowerCase()) {
        case '整数':
        case 'integer':
        case 'int':
          if (typeof item[fieldName] !== 'number' || !Number.isInteger(item[fieldName])) {
            return {
              error: `第${i + 1}个对象的字段 ${fieldName}(${description}) 应该是整数，实际值: ${item[fieldName]}`,
              index: i,
              field: fieldName
            };
          }
          break;
          
        case '字符串':
        case 'string':
          if (item[fieldName] !== null && typeof item[fieldName] !== 'string') {
            return {
              error: `第${i + 1}个对象的字段 ${fieldName}(${description}) 应该是字符串，实际值: ${item[fieldName]}`,
              index: i,
              field: fieldName
            };
          }
          break;
          
        case '布尔值':
        case 'boolean':
        case 'bool':
          if (typeof item[fieldName] !== 'boolean') {
            return {
              error: `第${i + 1}个对象的字段 ${fieldName}(${description}) 应该是布尔值，实际值: ${item[fieldName]}`,
              index: i,
              field: fieldName
            };
          }
          break;
          
        case '对象':
        case 'object':
          if (typeof item[fieldName] !== 'object' || item[fieldName] === null || Array.isArray(item[fieldName])) {
            return {
              error: `第${i + 1}个对象的字段 ${fieldName}(${description}) 应该是对象，实际值: ${item[fieldName]}`,
              index: i,
              field: fieldName
            };
          }
          break;
          
        case '数组':
        case 'array':
          if (!Array.isArray(item[fieldName])) {
            return {
              error: `第${i + 1}个对象的字段 ${fieldName}(${description}) 应该是数组，实际值: ${item[fieldName]}`,
              index: i,
              field: fieldName
            };
          }
          break;
      }
    }
  }
  
  return true;
}

/**
 * 在数组中查找包含特定字段值的元素
 * @param array 要搜索的数组
 * @param fieldName 字段名
 * @param expectedValue 期望的字段值
 * @returns 找到的元素或undefined
 */
export function findArrayElementByFieldValue(array: any[], fieldName: string, expectedValue: any): any | undefined {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  
  // 转换期望值为数字（如果可能），以支持数值比较
  let numericExpectedValue: number | undefined;
  if (typeof expectedValue === 'string' && !isNaN(Number(expectedValue))) {
    numericExpectedValue = Number(expectedValue);
  }
  
  // 查找匹配的元素
  return array.find(item => {
    const fieldValue = get(item, fieldName);
    
    // 如果我们有数值期望值，则尝试数值比较
    if (numericExpectedValue !== undefined && typeof fieldValue === 'number') {
      return fieldValue === numericExpectedValue;
    }
    
    // 否则使用字符串比较，支持精确匹配和包含匹配
    if (typeof fieldValue === 'string' && typeof expectedValue === 'string') {
      // 先尝试精确匹配
      if (fieldValue === expectedValue) {
        return true;
      }
      
      // 对于机器人名称等特殊字段，尝试包含匹配
      if (fieldName === 'name' && fieldValue.includes(expectedValue)) {
        return true;
      }
    }
    
    // 默认使用严格相等
    return String(fieldValue) === String(expectedValue);
  });
}

/**
 * 创建指定数量的对象数组，基于模板对象
 * @param template 模板对象，其中X将被替换为索引
 * @param count 要创建的对象数量
 * @returns 创建的对象数组
 */
export function createArrayFromTemplate(template: Record<string, any>, count: number): any[] {
  const resultArray = [];
  
  for (let i = 1; i <= count; i++) {
    // 复制模板对象
    const obj = { ...template };
    
    // 替换对象中的X为索引
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace('X', String(i));
      }
    });
    
    resultArray.push(obj);
  }
  
  return resultArray;
} 