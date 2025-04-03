/**
 * 响应验证相关的辅助函数
 * 从api.steps.ts中提取的通用验证逻辑
 */

/**
 * 判断参数是否应该在请求体中
 * @param contentType 内容类型
 * @returns 参数是否应该在请求体中
 */
export function isParamInBody(contentType: string): boolean {
  return contentType === 'application/json';
}

/**
 * 递归检查对象是否包含预期模式
 * 支持多种匹配模式：通配符、前缀匹配、后缀匹配、子字符串匹配
 * @param actual 实际值
 * @param expected 预期值/模式
 * @returns 是否匹配
 */
export function checkJsonLike(actual: any, expected: any): boolean {
  // 如果预期值是通配符"*"，则任何值都匹配
  if (expected === "*") return true;
  
  // 如果预期值是字符串且包含通配符模式（如 "*测试*"）
  if (typeof expected === 'string' && typeof actual === 'string') {
    if (expected.startsWith('*') && expected.endsWith('*') && expected.length > 2) {
      // 提取要匹配的子字符串 (去掉两端的 *)
      const substring = expected.substring(1, expected.length - 1);
      return actual.includes(substring);
    } else if (expected.startsWith('*') && !expected.endsWith('*') && expected.length > 1) {
      // 匹配结尾（如 "*测试"）
      const suffix = expected.substring(1);
      return actual.endsWith(suffix);
    } else if (!expected.startsWith('*') && expected.endsWith('*') && expected.length > 1) {
      // 匹配开头（如 "测试*"）
      const prefix = expected.substring(0, expected.length - 1);
      return actual.startsWith(prefix);
    }
  }
  
  // 如果预期是对象，检查actual是否包含所有预期的键和值
  if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
    if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) return false;
    
    return Object.keys(expected).every(key => {
      return Object.prototype.hasOwnProperty.call(actual, key) && 
        checkJsonLike(actual[key], expected[key]);
    });
  }
  
  // 如果预期是数组，检查长度是否匹配并且每个元素都匹配
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    if (expected.length !== actual.length) return false;
    
    return expected.every((item, index) => checkJsonLike(actual[index], item));
  }
  
  // 对于基本类型，执行严格相等检查
  return actual === expected;
}

/**
 * 验证基本的JSON Schema
 * 简单实现，仅支持基本类型验证
 * @param data 要验证的数据
 * @param schema 简化的JSON Schema
 * @returns 是否符合Schema
 */
export function validateBasicSchema(data: any, schema: any): boolean {
  if (schema.type === 'object' && (typeof data !== 'object' || data === null || Array.isArray(data))) {
    return false;
  }
  
  if (schema.type === 'array' && !Array.isArray(data)) {
    return false;
  }
  
  if (schema.type === 'string' && typeof data !== 'string') {
    return false;
  }
  
  if (schema.type === 'number' && typeof data !== 'number') {
    return false;
  }
  
  if (schema.type === 'boolean' && typeof data !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * 清理表单数据中的空值
 * @param formData 表单数据对象
 * @returns 清理后的表单数据
 */
export function cleanFormData(formData: Record<string, any>): Record<string, string> {
  const cleanedData: Record<string, string> = {};
  
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '')) {
      cleanedData[key] = String(value);
    }
  });
  
  return cleanedData;
}

/**
 * 将字段值转换为适当的类型
 * @param fieldValue 字段原始值
 * @returns 转换后的值
 */
export function convertFieldValue(fieldValue: any): any {
  // 空字符串保持为空字符串
  if (fieldValue === undefined || fieldValue === null) {
    return '';
  }
  // 尝试转换数字
  else if (typeof fieldValue === 'string' && !isNaN(Number(fieldValue)) && fieldValue.trim() !== '') {
    return Number(fieldValue);
  }
  // 处理布尔值
  else if (typeof fieldValue === 'string' && fieldValue.toLowerCase() === 'true') {
    return true;
  }
  else if (typeof fieldValue === 'string' && fieldValue.toLowerCase() === 'false') {
    return false;
  }
  
  return fieldValue;
}

/**
 * 验证数组中的每个对象是否包含指定字段和字段类型
 * @param arrayData 数组数据
 * @param fields 字段配置数组，包含字段名、类型和描述
 * @param arrayPath 数组在响应中的路径，用于错误消息
 * @param nullableFields 可以为null的字段列表
 * @returns 验证结果，包含是否成功和错误消息
 */
export function validateArrayObjectsFields(
  arrayData: any[], 
  fields: {字段: string, 类型: string, 描述?: string}[], 
  arrayPath: string,
  nullableFields: string[] = ['icon', 'description']
): {success: boolean, errorMessage?: string} {
  if (arrayData.length === 0) {
    return { success: true };
  }
  
  try {
    // 遍历数组中的每个对象
    arrayData.forEach((item: any, index: number) => {
      fields.forEach((field) => {
        const fieldName = field['字段'];
        const fieldType = field['类型'];
        const description = field['描述'] || '';
        
        // 验证字段存在性
        if (!Object.prototype.hasOwnProperty.call(item, fieldName)) {
          throw new Error(`第${index + 1}个对象缺少字段 ${fieldName}(${description})`);
        }
        
        // 如果字段值为null且在可空字段列表中，跳过类型验证
        if (item[fieldName] === null && nullableFields.includes(fieldName)) {
          return;
        }
        
        // 根据字段类型进行验证
        switch (fieldType.toLowerCase()) {
          case '整数':
          case 'integer':
          case 'int':
            if (typeof item[fieldName] !== 'number') {
              throw new Error(`第${index + 1}个对象的字段 ${fieldName}(${description}) 应该是整数，实际值: ${item[fieldName]}`);
            }
            if (!Number.isInteger(item[fieldName])) {
              throw new Error(`第${index + 1}个对象的字段 ${fieldName}(${description}) 应该是整数，实际值: ${item[fieldName]}`);
            }
            break;
            
          case '字符串':
          case 'string':
            if (item[fieldName] !== null && typeof item[fieldName] !== 'string') {
              throw new Error(`第${index + 1}个对象的字段 ${fieldName}(${description}) 应该是字符串，实际值: ${item[fieldName]}`);
            }
            break;
            
          case '布尔值':
          case 'boolean':
          case 'bool':
            if (typeof item[fieldName] !== 'boolean') {
              throw new Error(`第${index + 1}个对象的字段 ${fieldName}(${description}) 应该是布尔值，实际值: ${item[fieldName]}`);
            }
            break;
            
          case '对象':
          case 'object':
            if (typeof item[fieldName] !== 'object' || item[fieldName] === null || Array.isArray(item[fieldName])) {
              throw new Error(`第${index + 1}个对象的字段 ${fieldName}(${description}) 应该是对象，实际值: ${item[fieldName]}`);
            }
            break;
            
          case '数组':
          case 'array':
            if (!Array.isArray(item[fieldName])) {
              throw new Error(`第${index + 1}个对象的字段 ${fieldName}(${description}) 应该是数组，实际值: ${item[fieldName]}`);
            }
            break;
        }
      });
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
} 