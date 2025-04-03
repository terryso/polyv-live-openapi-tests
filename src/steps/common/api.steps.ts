import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { CustomWorld } from '../../support/world';
import { get } from 'lodash';
import {
  deepMatch,
  cleanDynamicFields,
  getSnapshotFilePath,
  saveSnapshot,
  loadSnapshot,
  ensureSnapshotDirExists,
  isSnapshotUpdateMode} from '../../utils/api-helpers';
import {
  getValidResponse,
  processDataTable,
  processContextVariables,
  processTimestamp} from '../../utils/step-helpers';
import * as fs from 'fs';
import * as path from 'path';
import { handleApiRequestCore } from '../../utils/api-request-core';
// 导入提取的辅助函数
import { checkJsonLike, validateBasicSchema, validateArrayObjectsFields } from '../../utils/response-validation';
import { processJsonBody, processTableToJson, processTableToQueryParams, processTableToFormData } from '../../utils/request-helpers';
import { findArrayElementByFieldValue, createArrayFromTemplate } from '../../utils/array-helpers';
import { processExpression, evaluateExpression, extractConditionValue } from '../../utils/expression-helpers';

/**
 * 增强版API测试步骤定义
 * 提供更全面的API测试能力，包括:
 * - 各种HTTP方法
 * - 请求参数设置
 * - 响应验证
 */

// 在每个场景开始前重置状态
Before(function(this: CustomWorld) {
  // 保存当前会话ID，避免丢失登录凭证
  const currentSessionId = this.sessionId;
  
  // 重置大部分状态，但保留会话ID
  this.context = { 
    useFormData: false,
    queryParams: {},
    // 如果之前有登录状态，保持登录状态
    loggedIn: currentSessionId ? true : false
  };
  
  // 恢复会话ID，避免丢失登录凭证
  this.sessionId = currentSessionId;
  
  this.stepResponses = new Map();
  this.currentSpec = null;
  this.currentStepNumber = 0;
  this.error = null;
  
  // 不再调用clearAllData，避免重复重置
});

// 请求参数设置 - 从步骤响应获取
Given('我设置请求参数 {string} 为步骤{int}的 {string}', function(
  this: CustomWorld,
  paramName: string,
  stepNumber: number,
  path: string
) {
  const value = this.getValueFromStepResponse(stepNumber, path);
  if (value === undefined) {
    throw new Error(`在步骤 ${stepNumber} 的响应中未找到路径 ${path} 的值`);
  }
  
  const spec = this.getCurrentSpec();
  
  // 根据当前上下文决定是设置JSON参数还是表单参数
  if (this.context.useFormData) {
    return spec.withForm({ [paramName]: value });
  } else {
    return spec.withJson({ [paramName]: value });
  }
});

// 设置文件上传 - multipart/form-data
Given('我准备上传文件 {string} 到字段 {string}', function(this: CustomWorld, filePath: string, fieldName: string) {
  const spec = this.getCurrentSpec();
  
  // 使用绝对路径解析文件
  const fs = require('fs');
  const path = require('path');
  const FormData = require('form-data-lite');
  
  // 解析绝对路径
  const absoluteFilePath = path.resolve(process.cwd(), filePath);
  
  // 检查文件是否存在
  if (!fs.existsSync(absoluteFilePath)) {
    throw new Error(`文件不存在: ${absoluteFilePath}`);
  }
  
  // 读取文件内容
  const fileContent = fs.readFileSync(absoluteFilePath);
  const filename = path.basename(absoluteFilePath);
  
  // 创建FormData对象
  const formData = new FormData();
  formData.append(fieldName, fileContent, { 
    filename,
    contentType: 'image/jpeg'
  });
  
  // 生成boundary
  formData.getBuffer(); // 必须调用以生成内部数据
  const boundary = formData.getBoundary();
  
  // 保存FormData和boundary到上下文，用于后续请求
  this.context.formDataBuffer = formData.getBuffer();
  this.context.formDataBoundary = boundary;
  
  // 标记使用表单数据模式
  this.context.useFormData = true;
  this.context.isFileUpload = true;
  
  // 记录日志
  console.log(`上传文件: ${absoluteFilePath} 到字段 ${fieldName}`);
});

/**
 * 设置JSON请求体 - 统一实现
 * 支持多种格式：
 * 1. 直接提供JSON文本
 * 2. 表格数据转JSON
 * 3. 从步骤响应获取
 */
Given('我设置JSON请求体为', function(this: CustomWorld, docString: string) {
  try {
    // 使用提取的辅助函数处理JSON请求体
    const jsonBody = processJsonBody(docString);
    
    // 确保使用JSON格式并保存到上下文中，而不直接调用spec
    this.context.jsonData = jsonBody;
    this.context.useFormData = false;
  } catch (error) {
    throw new Error(`无法解析JSON请求体: ${error}`);
  }
});

Given('我设置JSON请求体为表格数据', function(this: CustomWorld, dataTable: any) {
  // 使用辅助函数处理表格
  const { rows, hasHeader, startRow } = processDataTable(dataTable);
  
  // 使用提取的辅助函数处理表格数据生成JSON
  const jsonData = processTableToJson(rows, hasHeader, startRow, this);
  
  // 保存JSON数据到上下文中
  this.context.jsonData = jsonData;
  this.context.useFormData = false; // 明确使用JSON格式
});

/**
 * 设置JSON请求体 - 从步骤响应提取
 */
Given('我设置JSON请求体为步骤{int}的 {string}', function(
  this: CustomWorld,
  stepNumber: number,
  path: string
) {
  const spec = this.getCurrentSpec();
  
  // 从步骤响应中获取数据
  const jsonBody = this.getValueFromStepResponse(stepNumber, path);
  if (jsonBody === undefined) {
    throw new Error(`在步骤 ${stepNumber} 的响应中未找到路径 ${path} 的值`);
  }
  
  if (typeof jsonBody !== 'object' || jsonBody === null) {
    throw new Error(`步骤 ${stepNumber} 中路径 ${path} 的值不是一个对象: ${JSON.stringify(jsonBody)}`);
  }
  
  // 确保使用JSON格式
  this.context.jsonData = jsonBody;
  this.context.useFormData = false;
});

/**
 * 设置查询参数 - 统一实现
 * 支持以下方式设置：
 * 1. 直接设置值
 * 2. 从上下文变量获取
 * 3. 从步骤响应获取
 * 4. 从上一步响应获取
 */
Given('我设置查询参数 {string} 为 {string}', function(this: CustomWorld, paramName: string, paramValue: string) {
  // 处理动态时间戳替换
  let finalValue = processTimestamp(paramValue);

  // 处理上下文变量替换
  if (typeof finalValue === 'string' && finalValue.includes('{context.')) {
    finalValue = processContextVariables(this, finalValue);
  }

  // 保存参数到查询参数对象
  this.context.queryParams = this.context.queryParams || {};
  this.context.queryParams[paramName] = finalValue;
});

Given('我设置查询参数 {string} 为步骤{int}的 {string}', function(
  this: CustomWorld,
  paramName: string,
  stepNumber: number,
  path: string
) {
  const value = this.getValueFromStepResponse(stepNumber, path);
  if (value === undefined) {
    throw new Error(`在步骤 ${stepNumber} 的响应中未找到路径 ${path} 的值`);
  }

  // 保存参数到查询参数对象
  this.context.queryParams = this.context.queryParams || {};
  this.context.queryParams[paramName] = value;
});

Given('我设置查询参数 {string} 为上一步响应中的 {string}', function(
  this: CustomWorld,
  paramName: string,
  path: string
) {
  // 使用getLastResponse获取最近一次的响应
  const response = this.getLastResponse();
  
  if (!response?.json) {
    throw new Error('未找到有效的上一步响应数据');
  }
  
  // 从响应中提取指定路径的值
  const value = path.split('.').reduce((obj, key) => obj && obj[key], response.json);
  
  if (value === undefined) {
    throw new Error(`在上一步响应中未找到路径 ${path} 的值`);
  }

  // 保存参数到查询参数对象
  this.context.queryParams = this.context.queryParams || {};
  this.context.queryParams[paramName] = value;
});

// 设置表单参数（从上一步响应获取）
Given('我设置表单参数 {string} 为上一步响应中的 {string}', function(
  this: CustomWorld,
  paramName: string,
  path: string
) {
  // 使用getLastResponse获取最近一次的响应
  const response = this.getLastResponse();
  
  if (!response?.json) {
    throw new Error('未找到有效的上一步响应数据');
  }
  
  // 从响应中提取指定路径的值
  const value = path.split('.').reduce((obj, key) => obj && obj[key], response.json);
  
  if (value === undefined) {
    throw new Error(`在上一步响应中未找到路径 ${path} 的值`);
  }

  // 保存参数到表单数据对象
  this.context.formData = this.context.formData || {};
  this.context.formData[paramName] = value;
  this.context.useFormData = true; // 设置为使用表单数据模式
});

// 设置频道ID作为查询参数 (常用场景的便捷步骤)
Given('我将频道ID {string} 设置为查询参数', function(this: CustomWorld, channelId: string) {
  // 保存参数到查询参数对象
  this.context.queryParams = this.context.queryParams || {};
  this.context.queryParams['channelId'] = channelId;
});

// 设置请求参数 (用于表单提交)
Given('我设置请求参数 {string} 为 {string}', function(this: CustomWorld, paramName: string, paramValue: string) {
  // 创建或更新JSON数据对象，仅在context中保存数据
  const jsonData = this.context.jsonData || {};
  
  // 处理动态时间戳替换
  let finalValue = processTimestamp(paramValue);
  
  // 更新JSON数据并保存到上下文
  jsonData[paramName] = finalValue;
  this.context.jsonData = jsonData;
  this.context.useFormData = false; // 使用JSON格式
});

// 设置步骤响应中的频道ID作为查询参数 (常用场景的便捷步骤)
Given('我将步骤{int}的 {string} 设置为频道ID查询参数', function(
  this: CustomWorld,
  stepNumber: number,
  path: string
) {
  const value = this.getValueFromStepResponse(stepNumber, path);
  if (value === undefined) {
    throw new Error(`在步骤 ${stepNumber} 的响应中未找到路径 ${path} 的值`);
  }

  // 保存参数到查询参数对象
  this.context.queryParams = this.context.queryParams || {};
  this.context.queryParams['channelId'] = value;
});

/**
 * 处理基于键名的API请求 - Cucumber 绑定封装
 * @param world 测试世界实例
 * @param apiKey API键名
 * @param methodOverride 可选的方法覆盖（不提供则从配置中获取）
 */
export async function handleApiRequest(world: CustomWorld, apiKey: string, methodOverride?: string) {
  return handleApiRequestCore(world, apiKey, methodOverride, process.env);
}

// 修改发送请求步骤，使用更通用的API配置处理
When('我基于键名 {string} 发送 {string} 请求', { timeout: 30000 }, async function(this: CustomWorld, apiKey: string, method: string) {
  await handleApiRequest(this, apiKey, method);
});

// 添加新的优化步骤：不需要手动指定请求方法，从API配置中获取
When('我基于键名 {string} 发送请求', { timeout: 30000 }, async function(this: CustomWorld, apiKey: string) {
  await handleApiRequest(this, apiKey);
});

// 验证响应状态码
Then('响应状态码应为 {int}', { timeout: 15000 }, function(this: CustomWorld, statusCode: number) {
  const response = getValidResponse(this);
  // console.log('响应:', response.json);
  
  expect(response.statusCode).to.equal(statusCode, `期望状态码为 ${statusCode}，但实际为 ${response.statusCode}`);
});

/**
 * 响应字段验证 - 统一实现
 * 支持多种验证方式：
 * 1. 等于特定值（字符串、数值、布尔值）
 * 2. 包含特定值
 * 3. 匹配正则表达式
 * 4. 符合JSON模式
 * 5. 符合Schema
 * 6. 验证空值状态
 */
Then('响应字段 {string} 应等于 {string}', { timeout: 15000 }, function(this: CustomWorld, field: string, value: string) {
  const response = getValidResponse(this);
  // console.log('响应:', response.json);
  
  expect(get(response.json, field)).to.equal(value);
});

Then('响应字段 {string} 应等于数值 {int}', { timeout: 15000 }, function(this: CustomWorld, field: string, value: number) {
  const response = getValidResponse(this);
  
  expect(get(response.json, field)).to.equal(value);
});

Then('响应字段 {string} 应为布尔值 {word}', function(this: CustomWorld, field: string, value: string) {
  const response = getValidResponse(this);
  
  const boolValue = value.toLowerCase() === 'true';
  expect(get(response.json, field)).to.equal(boolValue);
});

Then('响应字段 {string} 应包含 {string}', function(this: CustomWorld, field: string, value: string) {
  const response = getValidResponse(this);
  
  const fieldValue = get(response.json, field);
  
  if (typeof fieldValue === 'string') {
    expect(fieldValue).to.include(value);
  } else if (Array.isArray(fieldValue)) {
    expect(fieldValue).to.include(value);
  } else {
    throw new Error(`字段 ${field} 不是字符串或数组`);
  }
});

Then('响应字段 {string} 应为空', function(this: CustomWorld, field: string) {
  validateFieldEmptiness(this, field, true);
});

Then('响应字段 {string} 不应为空', function(this: CustomWorld, field: string) {
  validateFieldEmptiness(this, field, false);
});

Then('响应字段 {string} 应匹配正则表达式 {string}', function(this: CustomWorld, field: string, pattern: string) {
  const response = getResponseOrThrow(this);
  
  // 获取字段值
  const fieldValue = get(response.json, field);
  
  if (fieldValue === undefined) {
    throw new Error(`响应中不存在字段: ${field}`);
  }
  
  try {
    // 创建正则表达式
    const regex = new RegExp(pattern);
    
    // 验证字段值是否匹配正则表达式
    if (typeof fieldValue !== 'string') {
      throw new Error(`字段 ${field} 不是字符串，无法应用正则表达式，实际类型: ${typeof fieldValue}`);
    }
    
    expect(regex.test(fieldValue)).to.be.true(
      `字段 ${field} 的值 "${fieldValue}" 不匹配正则表达式 ${pattern}`
    );
    
  } catch (error) {
    throw new Error(`响应字段 ${field} 的正则表达式验证失败: ${error}`);
  }
});

Then('响应字段 {string} 应匹配JSON', function(this: CustomWorld, field: string, docString: string) {
  const response = getResponseOrThrow(this);
  
  try {
    // 解析期望的JSON模式
    const expectedJson = JSON.parse(docString);
    
    // 获取指定字段的值
    const fieldValue = get(response.json, field);
    
    if (fieldValue === undefined) {
      throw new Error(`响应中不存在字段: ${field}`);
    }
    
    // 使用提取的辅助函数检查对象是否包含预期模式
    if (!checkJsonLike(fieldValue, expectedJson)) {
      throw new Error(`响应字段 ${field} 不匹配期望的JSON模式: ${JSON.stringify(expectedJson)}`);
    }
    
  } catch (error) {
    throw new Error(`响应字段 ${field} 的JSON验证失败: ${error}`);
  }
});

Then('响应字段 {string} 应符合Schema', function(this: CustomWorld, field: string, docString: string) {
  const response = getResponseOrThrow(this);
  
  try {
    // 解析期望的JSON Schema
    const schema = JSON.parse(docString);
    
    // 获取指定字段的值
    const fieldValue = get(response.json, field);
    
    if (fieldValue === undefined) {
      throw new Error(`响应中不存在字段: ${field}`);
    }
    
    // 使用提取的辅助函数进行Schema验证
    if (!validateBasicSchema(fieldValue, schema)) {
      throw new Error(`响应字段 ${field} 不符合期望的Schema: ${JSON.stringify(schema)}`);
    }
  } catch (error) {
    throw new Error(`响应字段 ${field} 的JSON Schema验证失败: ${error}`);
  }
});

Then('响应字段 {string} 应为以下值之一', function(this: CustomWorld, fieldPath: string, docString: string) {
  const response = this.getLastResponse();
  
  if (!response) {
    throw new Error('未收到有效的API响应');
  }
  
  // 获取字段的值
  const fieldValue = get(response.json, fieldPath);
  
  if (fieldValue === undefined) {
    throw new Error(`响应中不存在字段路径: ${fieldPath}`);
  }
  
  // 解析文档字符串中的值列表
  let allowedValues: any[] = [];
  try {
    allowedValues = JSON.parse(docString);
  } catch (error) {
    throw new Error(`无法解析值列表: ${docString}，请确保格式为有效的JSON数组`);
  }
  
  // 验证是否为数组
  if (!Array.isArray(allowedValues)) {
    throw new Error(`值列表必须是数组格式: ${docString}`);
  }
  
  // 检查字段值是否在允许的值列表中
  const isIncluded = allowedValues.includes(fieldValue);
  
  expect(isIncluded, 
    `响应字段 ${fieldPath} 的值 ${fieldValue} 不在允许的值列表中: ${JSON.stringify(allowedValues)}`
  ).to.equal(true);
});

/**
 * 响应数组验证 - 统一实现
 * 支持多种验证方式：
 * 1. 数组类型验证
 * 2. 数组长度验证
 * 3. 数组元素字段验证
 * 4. 数组元素匹配JSON模式
 * 5. 数组中包含特定元素
 */
Then('响应字段 {string} 应为数组', function(this: CustomWorld, field: string) {
  const response = getResponseOrThrow(this);
  const fieldValue = get(response.json, field);
  
  expect(fieldValue).to.be.an('array', `响应字段 ${field} 应该是一个数组`);
  expect(fieldValue.length).to.be.at.least(1, `响应字段 ${field} 应该是一个有效数组`);
});

Then('响应字段 {string} 应为空数组', function(this: CustomWorld, field: string) {
  const response = getResponseOrThrow(this);
  const fieldValue = get(response.json, field);
  
  expect(fieldValue).to.be.an('array', `响应字段 ${field} 应该是一个数组`);
  expect(fieldValue.length).to.equal(0, `响应字段 ${field} 应该是一个空数组，实际长度: ${fieldValue.length}`);
});

/**
 * 验证响应数组的长度大于指定值
 */
Then('响应数组 {string} 的长度应大于 {int}', function(this: CustomWorld, arrayPath: string, minLength: number) {
  const arrayData = getArrayDataOrThrow(this, arrayPath);
  expect(arrayData.length).to.be.greaterThan(minLength, 
    `响应数组 ${arrayPath} 的长度应该大于 ${minLength}，实际长度: ${arrayData.length}`);
});

/**
 * 验证响应数组的长度大于等于指定值
 */
Then('响应数组 {string} 的长度应大于等于 {int}', function(this: CustomWorld, arrayPath: string, minLength: number) {
  const arrayData = getArrayDataOrThrow(this, arrayPath);
  expect(arrayData.length).to.be.at.least(minLength, 
    `响应数组 ${arrayPath} 的长度应该大于等于 ${minLength}，实际长度: ${arrayData.length}`);
});

/**
 * 验证响应数组的每个元素包含指定字段
 */
Then('响应数组 {string} 的每个元素应包含字段 {string}', function(this: CustomWorld, arrayPath: string, fieldName: string) {
  const arrayData = getArrayDataOrThrow(this, arrayPath);
  
  if (arrayData.length === 0) {
    // 如果数组为空，则不需要验证元素
    return;
  }
  
  // 检查每个元素是否包含指定字段
  arrayData.forEach((item: any, index: number) => {
    const errorMessage = `数组 ${arrayPath} 的第 ${index + 1} 个元素缺少字段 ${fieldName}`;
    expect(item).to.have.property(fieldName);
  });
});

Then('响应数组 {string} 中的每个对象都应包含以下字段:', function(this: CustomWorld, arrayPath: string, dataTable: any) {
  const arrayData = getArrayDataOrThrow(this, arrayPath);
  
  if (arrayData.length === 0) {
    return;
  }
  
  // 获取表格数据，处理表头
  const rows = dataTable.raw();
  const hasHeader = rows.length > 0 && rows[0].length >= 2;
  const fields = hasHeader ? dataTable.hashes() : rows.map((row: string[]) => ({ 字段: row[0], 类型: row[1], 描述: row[2] || '' }));
  
  // 使用提取出的辅助函数验证数组中的对象字段
  const validationResult = validateArrayObjectsFields(arrayData, fields, arrayPath);
  
  if (!validationResult.success) {
    throw new Error(validationResult.errorMessage);
  }
});

Then('响应数组 {string} 中的每个元素应匹配', function(this: CustomWorld, arrayPath: string, docString: string) {
  const arrayData = getArrayDataOrThrow(this, arrayPath);
  
  if (arrayData.length === 0) {
    return;
  }
  
  try {
    // 解析期望的JSON模式
    const expectedPattern = JSON.parse(docString);
    
    // 遍历数组中的每个元素，验证它们是否符合模式
    const errorMessages: string[] = [];
    
    arrayData.forEach((item: any, index: number) => {
      if (!checkJsonLike(item, expectedPattern)) {
        errorMessages.push(`数组 ${arrayPath} 的第 ${index + 1} 个元素不匹配期望的JSON模式: ${JSON.stringify(expectedPattern)}`);
      }
    });
    
    if (errorMessages.length > 0) {
      throw new Error(errorMessages.join('\n'));
    }
    
  } catch (error) {
    throw new Error(`响应数组 ${arrayPath} 的元素验证失败: ${error}`);
  }
});

/**
 * 数组元素查找相关步骤 - 统一实现
 */
Then('响应数组 {string} 包含 {string} 为 {string} 的元素', function(this: CustomWorld, arrayPath: string, fieldName: string, expectedValue: string) {
  const arrayData = getArrayDataOrThrow(this, arrayPath);
  // console.log('响应数组:', arrayData);
  
  if (arrayData.length === 0) {
    throw new Error(`响应数组 ${arrayPath} 为空，无法验证元素字段值`);
  }
  
  // 处理从上下文中提取值
  let finalExpectedValue = expectedValue;
  if (expectedValue.startsWith('{context.') && expectedValue.endsWith('}')) {
    const contextKey = expectedValue.substring(9, expectedValue.length - 1);
    if (!this.context || this.context[contextKey] === undefined) {
      throw new Error(`上下文中不存在键 ${contextKey}`);
    }
    finalExpectedValue = String(this.context[contextKey]);
  }
  
  // 使用提取的辅助函数查找匹配的元素
  const matchingElement = findArrayElementByFieldValue(arrayData, fieldName, finalExpectedValue);
  
  if (matchingElement && fieldName === 'name' && 
      finalExpectedValue.startsWith('自动测试机器人_') && 
      matchingElement.id) {
    this.context.robotId = matchingElement.id;
  }
  
  // 使用正确的断言语法
  expect(matchingElement, 
    `响应数组 ${arrayPath} 中没有元素的字段 ${fieldName} 值为 ${finalExpectedValue}`
  ).to.not.equal(undefined);
});

Then('响应数组 {string} 不包含 {string} 为 {string} 的元素', function(this: CustomWorld, arrayPath: string, fieldName: string, expectedValue: string) {
  const arrayData = getArrayDataOrThrow(this, arrayPath);
  
  if (arrayData.length === 0) {
    // 空数组肯定不包含任何值，验证通过
    return;
  }
  
  // 处理从上下文中提取值
  let finalExpectedValue = expectedValue;
  if (expectedValue.startsWith('{context.') && expectedValue.endsWith('}')) {
    const contextKey = expectedValue.substring(9, expectedValue.length - 1);
    if (!this.context || this.context[contextKey] === undefined) {
      throw new Error(`上下文中不存在键 ${contextKey}`);
    }
    finalExpectedValue = String(this.context[contextKey]);
  }
  
  // 使用提取的辅助函数查找匹配的元素
  const matchingElement = findArrayElementByFieldValue(arrayData, fieldName, finalExpectedValue);
  
  // 断言：不应该找到匹配的元素
  expect(matchingElement,
    `响应数组 ${arrayPath} 中不应包含字段 ${fieldName} 值为 ${finalExpectedValue} 的元素`
  ).to.equal(undefined);
});

// 根据环境变量决定保存或验证快照
Then('我保存或验证快照 {string}', function(this: CustomWorld, snapshotName: string) {
  const response = getResponseOrThrow(this);
  
  const snapshotPath = getSnapshotFilePath(snapshotName);
  const snapshotDir = path.dirname(snapshotPath);
  
  // 确保目录存在
  if (!fs.existsSync(snapshotDir)) {
    ensureSnapshotDirExists(snapshotDir);
  }
  
  const snapshotExists = fs.existsSync(snapshotPath);
  
  // 如果处于更新模式或快照不存在，则保存快照
  if (isSnapshotUpdateMode() || !snapshotExists) {
    saveSnapshot(snapshotName, response.json);
  } else {
    // 否则验证快照
    const snapshot = loadSnapshot(snapshotName);
    
    // 清理动态字段后再比较
    const cleanedResponse = cleanDynamicFields(response.json);
    
    // 使用deepMatch进行深度比较
    const result = deepMatch(cleanedResponse, snapshot);
    
    if (!result.match) {
      throw new Error(`响应内容与快照不匹配: ${result.message || '未知差异'}`);
    }
  }
});

// 根据环境变量决定保存或验证快照（针对特定字段）
Then('我保存或验证字段 {string} 的快照 {string}', function(this: CustomWorld, fieldPath: string, snapshotName: string) {
  const response = this.getLastResponse();
  
  if (!response) {
    throw new Error('没有找到响应内容，无法处理快照');
  }
  
  const fieldValue = get(response.json, fieldPath);
  
  if (fieldValue === undefined) {
    throw new Error(`响应中找不到字段路径: ${fieldPath}`);
  }
  
  const snapshotPath = getSnapshotFilePath(snapshotName);
  const snapshotDir = path.dirname(snapshotPath);
  
  // 确保目录存在
  if (!fs.existsSync(snapshotDir)) {
    ensureSnapshotDirExists(snapshotDir);
  }
  
  const snapshotExists = fs.existsSync(snapshotPath);
  
  // 如果处于更新模式或快照不存在，则保存快照
  if (isSnapshotUpdateMode() || !snapshotExists) {
    if (isSnapshotUpdateMode() && snapshotExists) {
      console.log(`更新字段快照: ${snapshotPath}`);
    } else {
      console.log(`创建字段快照: ${snapshotPath}`);
    }
    // 保存前清理动态字段
    const cleanedFieldValue = cleanDynamicFields(fieldValue);
    saveSnapshot(snapshotName, cleanedFieldValue);
  } else {
    // 否则验证快照
    const snapshot = loadSnapshot(snapshotName);
    
    // 清理动态字段后再比较
    const cleanedFieldValue = cleanDynamicFields(fieldValue);
    
    // 使用deepMatch进行深度比较
    const result = deepMatch(cleanedFieldValue, snapshot);
    
    if (!result.match) {
      throw new Error(`响应字段 ${fieldPath} 与快照不匹配: ${result.message || '未知差异'}`);
    }
  }
});

// 保存响应快照
Then('我将响应内容保存为快照 {string}', function(this: CustomWorld, snapshotName: string) {
  const response = getResponseOrThrow(this);
  saveSnapshot(snapshotName, response.json);
});

// 验证响应与快照匹配
Then('响应内容应匹配快照 {string}', function(this: CustomWorld, snapshotName: string) {
  const response = getResponseOrThrow(this);
  const snapshot = loadSnapshot(snapshotName);
  
  // 清理动态字段后再比较
  const cleanedResponse = cleanDynamicFields(response.json);
  
  // 使用deepMatch进行深度比较
  const result = deepMatch(cleanedResponse, snapshot);
  
  if (!result.match) {
    throw new Error(`响应内容与快照不匹配: ${result.message || '未知差异'}`);
  }
});

// 验证指定字段的响应与快照匹配
Then('响应字段 {string} 应匹配快照 {string}', function(this: CustomWorld, fieldPath: string, snapshotName: string) {
  const response = this.getLastResponse();
  
  if (!response) {
    throw new Error('没有找到响应内容，无法与快照进行比较');
  }
  
  const snapshot = loadSnapshot(snapshotName);
  const fieldValue = get(response.json, fieldPath);
  
  if (fieldValue === undefined) {
    throw new Error(`响应中找不到字段路径: ${fieldPath}`);
  }
  
  // 清理动态字段后再比较
  const cleanedFieldValue = cleanDynamicFields(fieldValue);
  
  // 使用deepMatch进行深度比较
  const result = deepMatch(cleanedFieldValue, snapshot);
  
  if (!result.match) {
    throw new Error(`响应字段 ${fieldPath} 与快照不匹配: ${result.message || '未知差异'}`);
  }
});

// 设置查询参数表格数据（用于GET请求的表格形式）
Given('我设置查询参数表格数据', function (this: CustomWorld, dataTable: any) {
  // 使用辅助函数处理表格
  const { rows, hasHeader, startRow } = processDataTable(dataTable);

  // 使用提取的辅助函数处理表格数据生成查询参数
  const queryParams = processTableToQueryParams(rows, hasHeader, startRow, this);
  
  // 合并到现有查询参数
  this.context.queryParams = {
    ...this.context.queryParams || {},
    ...queryParams
  };
});

// 设置路径参数表格数据（用于替换URL中的:paramName参数）
Given('我设置路径参数表格数据', function (this: CustomWorld, dataTable: any) {
  // 使用辅助函数处理表格
  const { rows, hasHeader, startRow } = processDataTable(dataTable);
  
  // 初始化context对象（如果不存在）
  if (!this.context) {
    this.context = {
      useFormData: false,
      queryParams: {}
    };
  }
  
  // 遍历表格行处理路径参数
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    // 获取参数名和值
    const paramName = hasHeader ? row[0] : `param${i}`;
    let paramValue = hasHeader ? row[1] : row[0];
    
    // 复用"我设置路径参数"步骤中的代码逻辑
    // 处理动态时间戳替换
    paramValue = processTimestamp(paramValue);
    
    // 从上下文变量中提取值
    if (typeof paramValue === 'string' && paramValue.includes('{context.')) {
      paramValue = processContextVariables(this, paramValue);
    }
    
    // 直接保存到上下文中，而不是查询参数对象
    this.context[paramName] = paramValue;
  }
});

// 从响应中提取会话ID的步骤
Then('我从响应中提取会话ID', async function(this: CustomWorld) {
  const response = this.getLastResponse();
  
  if (!response || !response.json) {
    throw new Error('无法获取上一步响应数据');
  }
  
  const token = get(response.json, 'data.token');
  if (!token) {
    throw new Error('响应中未找到token字段');
  }
  
  // 将token保存到上下文供后续步骤使用
  this.context.authToken = token;
  
  return token;
});

/**
 * 保存响应字段到上下文变量
 */
Then('我保存响应中 {string} 到上下文的 {string}', function(this: CustomWorld, fieldPath: string, contextKey: string) {
  const response = this.getLastResponse();
  
  if (!response) {
    throw new Error('未收到有效的API响应');
  }
  
  const value = get(response.json, fieldPath);
  if (value === undefined) {
    throw new Error(`响应中不存在字段路径: ${fieldPath}`);
  }
  
  // 将值保存到上下文
  if (!this.context) {
    this.context = { 
      useFormData: false,
      queryParams: {}
    };
  }
  
  this.context[contextKey] = value;
});

/**
 * 验证数学表达式
 * 该步骤用于验证上下文变量之间的数学关系
 * 支持基本的加减乘除运算和数值比较
 */
Then('验证数学表达式 {string}', function(this: CustomWorld, expression: string) {
  // 使用提取的辅助函数处理表达式中的上下文变量替换
  const processedExpression = processExpression(this, expression);
  
  // 执行表达式验证
  try {
    const result = evaluateExpression(processedExpression);
    expect(result, `数学表达式验证失败: ${expression} (${processedExpression})`).to.be.true;
  } catch (error: unknown) {
    throw error;
  }
});

/**
 * 解析环境变量占位符，如 {env.POLYV_USER_ID}
 * @param value 包含占位符的字符串
 * @returns 替换后的字符串
 */
function processEnvVariables(value: string): string {
  if (typeof value !== 'string') return value;
  
  // 匹配 {env.XXX} 格式的环境变量
  const envVarRegex = /\{env\.([A-Za-z0-9_]+)\}/g;
  
  // 替换所有匹配的环境变量
  return value.replace(envVarRegex, (match, envName) => {
    const envValue = process.env[envName];
    if (envValue === undefined) {
      console.warn(`⚠️ 警告: 环境变量 ${envName} 未定义`);
      return match; // 如果环境变量不存在，保留原始文本
    }
    return envValue;
  });
}

/**
 * 设置路径参数 - 支持从环境变量中获取值
 */
Given('我设置路径参数 {string} 为 {string}', function(this: CustomWorld, paramName: string, paramValue: string) {
  // 处理环境变量占位符
  const processedValue = processEnvVariables(paramValue);
  
  // 处理时间戳
  const finalValue = processTimestamp(processedValue);
  
  // 处理上下文变量
  if (typeof finalValue === 'string' && finalValue.includes('{context.')) {
    this.context[paramName] = processContextVariables(this, finalValue);
  } else {
    this.context[paramName] = finalValue;
  }
  
  // console.log(`📌 [路径参数] 设置路径参数 ${paramName} = ${this.context[paramName]} (原始值: ${paramValue})`);
});

/**
 * 创建大数组作为JSON请求体
 * 用于性能测试或批量操作场景，生成大量相似结构的数据
 */
When('我设置JSON请求体为大数组 {string} 包含 {int} 个对象，每个对象格式为 {string}', function (this: CustomWorld, arrayName: string, count: number, format: string) {
  // 解析对象格式
  const templateObj = JSON.parse(format);
  
  // 使用提取的辅助函数创建数组
  const resultArray = createArrayFromTemplate(templateObj, count);
  
  // 保存到上下文的jsonData
  this.context.jsonData = resultArray;
  this.context.useFormData = false;
});

/**
 * 设置表单参数（统一的表单参数设置步骤）
 * 支持单个参数设置和批量设置
 */
Given('我设置以下表单参数', function(this: CustomWorld, dataTable: any) {
  // 使用辅助函数处理表格
  const { rows, hasHeader, startRow } = processDataTable(dataTable);
  
  // 使用提取的辅助函数处理表格数据生成表单数据
  const formData = processTableToFormData(rows, hasHeader, startRow, this);
  
  // 保存表单数据到上下文中
  this.context.formData = formData;
  this.context.useFormData = true; // 切换到表单模式
});

/**
 * 设置表单参数（兼容性步骤，功能与"我设置以下表单参数"相同）
 */
When('我设置表单参数', function(this: CustomWorld, dataTable: any) {
  // 使用辅助函数处理表格
  const { rows, hasHeader, startRow } = processDataTable(dataTable);
  
  // 使用提取的辅助函数处理表格数据生成表单数据
  const formData = processTableToFormData(rows, hasHeader, startRow, this);
  
  // 保存表单数据到上下文中
  this.context.formData = formData;
  this.context.useFormData = true; // 切换到表单模式
});

/**
 * 设置表单参数表格数据（用于POST表单请求的表格形式）
 */
When('我设置表单参数表格数据', function(this: CustomWorld, dataTable: any) {
  // 使用辅助函数处理表格
  const { rows, hasHeader, startRow } = processDataTable(dataTable);
  
  // 使用提取的辅助函数处理表格数据生成表单数据
  const formData = processTableToFormData(rows, hasHeader, startRow, this);
  
  // 保存表单数据到上下文中
  this.context.formData = formData;
  this.context.useFormData = true; // 切换到表单模式
});

/**
 * 设置表单参数 {string} 为 {string}
 */
Given('我设置表单参数 {string} 为 {string}', function(this: CustomWorld, paramName: string, paramValue: string) {
  // 处理动态时间戳替换
  let finalValue = processTimestamp(paramValue);
  
  // 处理上下文变量替换
  if (typeof finalValue === 'string' && finalValue.includes('{context.')) {
    finalValue = processContextVariables(this, finalValue);
  }

  // 保存参数到表单数据对象
  this.context.formData = this.context.formData || {};
  this.context.formData[paramName] = finalValue;
  this.context.useFormData = true; // 设置为使用表单数据模式
});

// 验证字段为空或非空的通用辅助函数
function validateFieldEmptiness(world: CustomWorld, field: string, shouldBeEmpty: boolean) {
  const response = world.getLastResponse();
  
  if (!response) {
    throw new Error('未收到有效的API响应');
  }
  
  const fieldValue = get(response.json, field);
  
  if (shouldBeEmpty) {
    expect(fieldValue).to.satisfy((value: any) => {
      return value === null || value === '' || value === undefined;
    }, `字段 ${field} 不为空`);
  } else {
    expect(fieldValue).to.not.satisfy((value: any) => {
      return value === null || value === '' || value === undefined;
    }, `字段 ${field} 为空`);
  }
}

// 简化的响应获取错误处理函数
function getResponseOrThrow(world: CustomWorld): any {
  const response = world.getLastResponse();
  
  if (!response) {
    throw new Error('未收到有效的API响应');
  }
  
  return response;
}

// 获取数组数据或抛出错误
function getArrayDataOrThrow(world: CustomWorld, arrayPath: string): any[] {
  const response = getResponseOrThrow(world);
  const arrayData = get(response.json, arrayPath);
  
  if (!Array.isArray(arrayData)) {
    throw new Error(`响应字段 ${arrayPath} 不是一个数组，实际类型: ${typeof arrayData}`);
  }
  
  return arrayData;
}

/**
 * 验证响应JSON匹配给定模式
 */
Then('响应JSON应匹配', { timeout: 15000 }, function(this: CustomWorld, docString: string) {
  const response = this.getLastResponse();
  
  if (!response?.json) {
    throw new Error('未收到有效的API响应');
  }
  
  try {
    // 解析期望的JSON
    const expectedJson = JSON.parse(docString);
    
    // 使用自定义匹配器进行匹配
    const result = deepMatch(response.json, expectedJson, "", this.context);
    
    if (!result.match) {
      throw new Error(`JSON不匹配，差异: ${result.message}\n实际值: ${JSON.stringify(response.json, null, 2)}`);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`无法解析JSON模式: ${error.message}`);
    }
    throw error;
  }
});

/**
 * 从响应字段提取数据并保存为上下文变量
 * 支持从对象字段和数组字段提取数据
 */
When('我从响应字段 {string} 提取数据并保存为 {string}', function(this: CustomWorld, fieldPath: string, contextKey: string) {
  const response = this.getLastResponse();
  
  if (!response || !response.json) {
    throw new Error('无法获取上一步响应数据');
  }
  
  // 处理数组路径 [*] 提取所有元素
  if (fieldPath.includes('[*]')) {
    // 例如 data.menuList[*].id 提取所有菜单的ID到一个数组
    const basePath = fieldPath.split('[*]')[0];
    const remainingPath = fieldPath.split('[*]')[1];
    
    // 获取数组数据
    const arrayData = get(response.json, basePath);
    
    if (!Array.isArray(arrayData)) {
      throw new Error(`响应字段 ${basePath} 不是一个数组`);
    }
    
    // 从数组的每个元素中提取指定字段
    const extractedData = [];
    for (const item of arrayData) {
      // 如果有剩余路径，则提取，否则使用整个项
      const value = remainingPath ? get(item, remainingPath.substring(1)) : item;
      extractedData.push(value);
    }
    
    // 保存到上下文
    this.context[contextKey] = extractedData;
    
    return extractedData;
  } else {
    // 正常字段路径提取
    const value = get(response.json, fieldPath);
    
    if (value === undefined) {
      throw new Error(`响应中不存在字段路径: ${fieldPath}`);
    }
    
    // 保存到上下文
    this.context[contextKey] = value;
    
    return value;
  }
});

/**
 * 调整数组顺序
 * 将数组元素顺序打乱，用于测试排序功能
 */
When('我调整数组 {string} 的顺序', function(this: CustomWorld, arrayKey: string) {
  const array = this.context[arrayKey];
  
  if (!array || !Array.isArray(array)) {
    throw new Error(`上下文中不存在数组: ${arrayKey}`);
  }
  
  // 创建原始数组的副本
  this.context[`original_${arrayKey}`] = [...array];
  
  // Fisher-Yates 洗牌算法打乱数组顺序
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  
  // 确保顺序发生了变化（如果数组长度够长）
  if (array.length > 1 && JSON.stringify(array) === JSON.stringify(this.context[`original_${arrayKey}`])) {
    // 如果洗牌后顺序没变，手动交换第一个和最后一个元素
    [array[0], array[array.length - 1]] = [array[array.length - 1], array[0]];
  }
  
  // 保存调整后的数组回到上下文
  this.context[arrayKey] = array;
  
  return array;
});

/**
 * 验证响应字段中的数组与上下文变量中的数组顺序一致
 * 用于测试排序功能
 */
Then('响应字段 {string} 应与 {string} 顺序一致', function(this: CustomWorld, fieldPath: string, contextPath: string) {
  const response = this.getLastResponse();
  
  if (!response || !response.json) {
    throw new Error('无法获取上一步响应数据');
  }
  
  // 从响应中获取数组
  const responseArray = get(response.json, fieldPath);
  
  if (!Array.isArray(responseArray)) {
    throw new Error(`响应字段 ${fieldPath} 不是一个数组`);
  }
  
  // 处理上下文路径中的变量
  let contextKey = contextPath;
  if (contextPath.startsWith('{context.') && contextPath.endsWith('}')) {
    contextKey = contextPath.substring(9, contextPath.length - 1);
  }
  
  // 从上下文中获取预期的数组
  const expectedArray = this.context[contextKey];
  
  if (!Array.isArray(expectedArray)) {
    throw new Error(`上下文变量 ${contextKey} 不是一个数组`);
  }
  
  // 比较数组长度
  if (responseArray.length !== expectedArray.length) {
    throw new Error(`数组长度不一致: 响应数组长度 ${responseArray.length}，期望数组长度 ${expectedArray.length}`);
  }
  
  // 比较数组顺序
  for (let i = 0; i < expectedArray.length; i++) {
    if (responseArray[i] !== expectedArray[i]) {
      throw new Error(`数组顺序不一致: 位置 ${i}，响应值 ${responseArray[i]}，期望值 ${expectedArray[i]}`);
    }
  }
  
  return true;
});

/**
 * 验证响应字段是否等于上下文中的变量值
 */
Then('响应字段 {string} 的值应匹配上下文变量 {string}', function(this: CustomWorld, fieldPath: string, contextKey: string) {
  const response = this.getLastResponse();
  
  if (!response) {
    throw new Error('未收到有效的API响应');
  }
  
  // 获取响应字段值
  const fieldValue = get(response.json, fieldPath);
  
  if (fieldValue === undefined) {
    throw new Error(`响应中不存在字段路径: ${fieldPath}`);
  }
  
  // 获取上下文中的变量值
  const contextValue = this.context[contextKey];
  
  if (contextValue === undefined) {
    throw new Error(`上下文中不存在变量: ${contextKey}`);
  }
  
  // 比较值是否相等
  expect(fieldValue).to.equal(contextValue, 
    `响应字段 ${fieldPath} 的值 ${fieldValue} 不等于上下文变量 ${contextKey} 的值 ${contextValue}`);
});
