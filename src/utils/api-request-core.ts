import { CustomWorld } from '../support/world';
import { API_URLS, getFullUrl, ContentType, isAuthParamsOnlySignMode, PathParams } from '../api/urls';
import { getPolyvMD5Sign } from './api-helpers';
import { processArrayParameters, sendRequest } from './step-helpers';
import { camelCaseToSnakeCase } from './string-utils';
import { logApiRequest, logApiResponse, logDebug } from './debug';

/**
 * 处理非空参数，返回过滤后的参数对象
 * @param params 原始参数对象
 * @returns 过滤后的非空参数对象
 */
function filterNonEmptyParams(params: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      result[key] = String(value);
    }
  });
  
  return result;
}

/**
 * 计算签名并将参数添加到URL
 * @param url URL对象
 * @param authParams 认证参数
 * @param additionalParams 额外参数
 * @param appSecret 应用密钥
 * @returns 计算得到的签名
 */
function calculateSignAndAddParamsToUrl(
  url: URL,
  authParams: Record<string, string>,
  additionalParams: Record<string, any>,
  appSecret: string
): string {
  // 过滤并合并参数
  const filteredParams = filterNonEmptyParams(additionalParams);
  const allParams = { ...authParams, ...filteredParams };
  
  // 计算签名
  const sign = getPolyvMD5Sign(allParams, appSecret);
  
  // 添加所有参数到URL
  Object.entries({ ...allParams, sign }).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  
  return sign;
}

/**
 * 处理API请求的核心逻辑 - 与Cucumber完全解耦的版本
 * 
 * @param world 测试世界上下文
 * @param apiKey API键名
 * @param methodOverride 可选的HTTP方法覆盖
 * @param env 环境变量对象 (可选，默认使用process.env)
 * @returns 响应对象
 */
export async function handleApiRequestCore(
  world: CustomWorld, 
  apiKey: string, 
  methodOverride?: string,
  env: Record<string, string | undefined> = process.env
) {
  try {
    // 获取API配置
    const [module, action] = apiKey.split('.');
    const moduleKey = module as keyof typeof API_URLS;
    const actionKey = action as string;
    const apiConfig = API_URLS[moduleKey] && (API_URLS[moduleKey] as any)[actionKey];
    
    if (!apiConfig) {
      throw new Error(`未找到API配置: ${apiKey}`);
    }
    
    // 处理方法覆盖 - 统一转为大写
    const httpMethod = methodOverride ? methodOverride.toUpperCase() : apiConfig.method;
    
    // 记录API请求开始
    logDebug('api:core', `开始处理API请求: ${apiKey}`, { 
      path: apiConfig.path, 
      method: httpMethod,  // 使用可能被覆盖的方法
      contentType: apiConfig.contentType 
    });
    
    // 重置当前spec，避免重复请求错误
    world.currentSpec = null;
    
    // 使用当前规范对象
    const spec = world.getCurrentSpec();
    
    if (!spec) {
      throw new Error('无法创建有效的请求规范(spec)对象');
    }
    
    // 从环境变量获取API参数
    const appId = env.POLYV_APP_ID || '';
    const appSecret = env.POLYV_APP_SECRET || '';
    const userId = env.POLYV_USER_ID || '';
    
    if (!appId || !appSecret) {
      throw new Error('未配置POLYV_APP_ID或POLYV_APP_SECRET环境变量');
    }
    
    // 准备路径参数对象
    const pathParams: PathParams = {};
    
    // 查找URL路径中所有的路径参数 (格式为 :paramName)
    const pathParamRegex = /:([a-zA-Z][a-zA-Z0-9_]*)/g;
    const pathParamMatches = [...apiConfig.path.matchAll(pathParamRegex)];
    
    // 处理所有找到的路径参数
    pathParamMatches.forEach(match => {
      const paramName = match[1]; // 第一个捕获组是参数名
      
      // 1. 先尝试从上下文中获取参数值
      if (world.context[paramName] !== undefined) {
        pathParams[paramName] = world.context[paramName];
      }
      // 2. 再尝试从环境变量中获取参数值
      else {
        // 构建可能的环境变量名格式
        const envVarFormats = [
          `POLYV_${paramName.toUpperCase()}`,  // 如: POLYV_USERID
          `POLYV_${camelCaseToSnakeCase(paramName).toUpperCase()}`, // 如: POLYV_USER_ID
          paramName.toUpperCase(),  // 如: USERID
          camelCaseToSnakeCase(paramName).toUpperCase() // 如: USER_ID
        ];
        
        // 尝试从环境变量中获取值
        for (const envVar of envVarFormats) {
          if (env[envVar]) {
            pathParams[paramName] = env[envVar] as string;
            break;
          }
        }
      }
      
      // 如果没有找到值，记录警告
      if (pathParams[paramName] === undefined) {
        console.warn(`⚠️ 警告: 未找到路径参数 ${paramName} 的值，URL可能会包含未替换的参数`);
      }
    });
    
    // 使用路径参数获取完整URL
    let fullUrl = getFullUrl(apiConfig, pathParams);
    
    // 从配置中获取内容类型
    const contentType = apiConfig.contentType;
    
    // 准备API请求参数
    const timestamp = Date.now().toString();
    const authParams: Record<string, string> = {
      appId: appId || '',
      timestamp
    };
    
    // 添加userId作为身份参数，仅当它不是路径参数时
    if (userId && !apiConfig.path.includes(':userId')) {
      authParams.userId = userId;
    }
    
    // 创建URL对象
    const url = new URL(fullUrl);
    
    // 记录最终请求URL
    // console.log(`🌐 [DEBUG] 最终请求URL: ${url.toString()}`);
    
    // 检查是否有文件上传
    const hasMultiPartFile = spec && 
                          (spec as any).requestOptions && 
                          ((spec as any).requestOptions.multiPartFormData && 
                           (spec as any).requestOptions.multiPartFormData.length > 0);
    
    // 记录文件上传信息
    if (hasMultiPartFile) {
      logDebug('api:file', `检测到文件上传请求`, {
        apiKey,
        url: fullUrl,
        multiPart: (spec as any).requestOptions.multiPartFormData
      });
    }
    
    // 处理请求参数（区分JSON和表单请求）
    let response;
    
    if (contentType === ContentType.JSON) {
      // === JSON请求处理 ===
      // 获取查询参数
      const queryParams = world.context.queryParams || {};
      
      // 计算签名并添加参数到URL
      calculateSignAndAddParamsToUrl(url, authParams, queryParams, appSecret);
      
      // 处理GET请求
      if (httpMethod === 'GET') {
        response = await sendRequest(world, httpMethod, url.toString(), spec);
      } else {
        // 处理JSON请求体 - 获取上下文中的JSON数据
        const jsonData = world.context.jsonData;
        
        // 判断是否为数组类型，确保数组类型的请求体能正确发送
        if (Array.isArray(jsonData)) {
          // 直接发送数组类型的请求体
          response = await sendRequest(world, httpMethod, url.toString(), spec, {
            contentType: 'application/json',
            withJson: jsonData
          });
        } else {
          // 处理对象类型的请求体 - 处理数组参数
          const requestData = processArrayParameters({ ...world.context.jsonData || {} }, world);
          
          // 发送请求
          response = await sendRequest(world, httpMethod, url.toString(), spec, {
            contentType: 'application/json',
            withJson: requestData
          });
        }
      }
    } else {
      // === 表单请求处理 ===
      // 表单请求所有参数都参与签名
      const queryParams = world.context.queryParams || {};
      const formData = world.context.formData || {};
      
      if (world.context.isFileUpload && world.context.formDataBuffer && world.context.formDataBoundary) {
        // 文件上传请求：计算签名并添加认证参数到URL
        calculateSignAndAddParamsToUrl(url, authParams, queryParams, appSecret);
        
        // 记录文件上传请求的详细信息
        logDebug('api:file', `文件上传请求URL`, {
          fullUrl: url.toString(),
          authParams,
          queryParams
        });
        
        // 使用pactum直接发送，而不使用sendRequest
        try {
          // 设置请求头和数据
          spec.withHeaders({
            'Content-Type': `multipart/form-data; boundary=${world.context.formDataBoundary}`
          });
          spec.withBody(world.context.formDataBuffer);
          
          // 直接使用pactum发送请求
          response = await spec.post(url.toString()).toss();
          
          // 记录响应
          logApiResponse(
            'sendRequest',
            url.toString(),
            response.statusCode,
            response.headers,
            response.json || response.body
          );
        } catch (error) {
          logDebug('api:error', `文件上传请求失败`, { error });
          throw error;
        }
      } else if (hasMultiPartFile) {
        // 文件上传请求：计算签名并添加认证参数到URL
        calculateSignAndAddParamsToUrl(url, authParams, queryParams, appSecret);
        
        // 记录文件上传请求的详细信息
        logDebug('api:file', `文件上传请求URL`, {
          fullUrl: url.toString(),
          authParams,
          queryParams,
          multiPart: (spec as any).requestOptions.multiPartFormData
        });
        
        // 不需要额外处理，因为withMultiPartFormData已经设置了合适的请求头和主体
        // 只需简单地发送请求
        response = await sendRequest(world, httpMethod, url.toString(), spec);
      } else {
        // 普通表单请求：计算签名并添加所有参数到URL
        calculateSignAndAddParamsToUrl(url, authParams, { ...queryParams, ...formData }, appSecret);
        
        if (httpMethod === 'GET') {
          // 发送GET请求
          response = await sendRequest(world, httpMethod, url.toString(), spec);
        } else {
          // 发送POST表单请求 - 表单内容为空，所有参数在URL中
          response = await sendRequest(world, httpMethod, url.toString(), spec, {
            contentType: 'application/x-www-form-urlencoded'
          });
        }
      }
    }

    // 记录API响应
    logDebug('api:core', `API请求完成: ${apiKey}`, { 
      statusCode: response.statusCode, 
      body: response.json || response.body 
    });
    
    // 保存响应到当前步骤
    const currentStep = world.getCurrentStepNumber();
    world.setStepResponse(currentStep, response);
    
    // 完全重置当前状态，为下一个请求做准备
    world.currentSpec = null;
    world.context.queryParams = {};
    world.context.formData = {};
    world.context.jsonData = {};
    world.context.useFormData = false;
    world.context.isFileUpload = false; // 重置文件上传标记
    world.context.formDataBuffer = undefined; // 清除文件缓冲区
    world.context.formDataBoundary = undefined; // 清除边界信息
    
    return response;
  } catch (error) {
    logDebug('api:error', `API请求失败`, { error });
    console.error('请求失败:', error);
    throw error;
  }
} 