/**
 * API URL配置文件
 * 所有API的URL路径统一在此维护
 */

import * as dotenv from 'dotenv';
import * as pactum from 'pactum';
import { config } from '../support/env';

dotenv.config();

// 基础URL配置 - 简化为单个 BASE_URL
export const BASE_URL = process.env.POLYV_API_BASE_URL || 'http://api.polyv.net';

// 定义Content-Type枚举
export enum ContentType {
  FORM = 'application/x-www-form-urlencoded',
  JSON = 'application/json'
}

// 定义API请求类型预设（进一步简化）
export enum ApiType {
  // GET请求，参数在URL，所有参数参与签名
  GET = 'GET', 
  
  // POST请求，表单格式，参数在URL，所有参数参与签名
  POST_FORM = 'POST_FORM',
  
  // POST请求，JSON格式，参数在请求体，仅认证参数参与签名
  POST_JSON = 'POST_JSON',
  
  // 自定义配置，需要手动设置所有参数
  CUSTOM = 'CUSTOM'
}

// API路径类型
export interface ApiConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  contentType: ContentType;
  description?: string;
}

// 获取预设的API配置
export function getApiConfig(type: ApiType, path: string, description: string = ''): ApiConfig {
  switch (type) {
    case ApiType.GET:
      return {
        path,
        method: 'GET',
        contentType: ContentType.FORM,
        description
      };
      
    case ApiType.POST_FORM:
      return {
        path,
        method: 'POST',
        contentType: ContentType.FORM,
        description
      };
      
    case ApiType.POST_JSON:
      return {
        path,
        method: 'POST',
        contentType: ContentType.JSON,
        description
      };
      
    default:
      throw new Error(`未知的API类型: ${type}`);
  }
}

/**
 * 获取参数位置 - 根据contentType自动判断
 * @param contentType 内容类型
 * @returns 参数位置：'url'或'body'
 */
export function getParamLocation(contentType: ContentType): string {
  return contentType === ContentType.JSON ? 'body' : 'url';
}

/**
 * 判断是否只使用认证参数签名 - 根据contentType自动判断
 * @param contentType 内容类型
 * @returns 是否只使用认证参数签名
 */
export function isAuthParamsOnlySignMode(contentType: ContentType): boolean {
  return contentType === ContentType.JSON;
}

// API路径配置，包含API路径和对应的请求配置
export const API_URLS = {
  // 账户相关
  ACCOUNT: {
    CHANNELS: getApiConfig(
      ApiType.GET, 
      '/live/v3/user/channels', 
      '查询频道列表'
    ),
    CATEGORY_CREATE: getApiConfig(
      ApiType.POST_FORM, 
      '/live/v3/user/category/create', 
      '创建直播分类'
    ),
    CATEGORY_DELETE: getApiConfig(
      ApiType.POST_FORM, 
      '/live/v3/user/category/delete', 
      '删除直播分类'
    ),
    CATEGORY_LIST: getApiConfig(
      ApiType.GET, 
      '/live/v3/user/category/list', 
      '查询直播分类列表'
    ),
  },
  
  // 频道相关
  CHANNEL: {
    CREATE: getApiConfig(
      ApiType.POST_JSON, 
      '/live/v4/channel/create', 
      '创建频道'
    ),
    CREATE_BATCH: getApiConfig(
      ApiType.POST_JSON,
      '/live/v4/channel/create-batch',
      '批量创建频道'
    ),
    UPDATE_NAME: getApiConfig(
      ApiType.POST_FORM,
      '/live/v2/channels/:channelId/update',
      '修改频道名称'
    ),
    BATCH_DELETE: getApiConfig(
      ApiType.POST_JSON, 
      '/live/v3/channel/basic/batch-delete', 
      '批量删除频道'
    ),
    DETAIL: getApiConfig(
      ApiType.GET, 
      '/live/v4/channel/basic/get', 
      '查询频道信息'
    ),
    MENU_LIST: getApiConfig(
      ApiType.GET,
      '/live/v3/channel/menu/list',
      '查询频道页面菜单信息'
    ),
    DELETE: getApiConfig(
      ApiType.POST_FORM,
      '/live/v2/channels/:channelId/delete',
      '删除单个频道'
    ),
    MENU_ADD: getApiConfig(
      ApiType.POST_FORM,
      '/live/v3/channel/menu/add',
      '添加频道菜单'
    ),
    MENU_DELETE: getApiConfig(
      ApiType.POST_FORM,
      '/live/v3/channel/menu/delete',
      '删除频道菜单'
    ),
    GET_SPLASH: getApiConfig(
      ApiType.GET,
      '/live/v2/channelSetting/:channelId/getSplash',
      '获取频道闪屏设置'
    ),
  },
  
  // 用户相关
  USER: {
    GET_INFO: getApiConfig(
      ApiType.GET,
      '/live/v3/user/get-info',
      '查询账号信息'
    ),
    LABEL_PAGE: getApiConfig(
      ApiType.GET,
      '/live/v4/user/label/page',
      '分页查询标签'
    ),
    GLOBAL_SETTING_PV_SHOW_UPDATE: getApiConfig(
      ApiType.POST_FORM,
      '/live/v4/user/global-setting/pv-show/update',
      '更新在线人数显示设置'
    ),
  },
  
  // 机器人相关
  ROBOT: {
    LIST: getApiConfig(
      ApiType.GET,
      '/live/v4/global/robot/list',
      '分页查询机器人虚拟昵称'
    ),
    SAVE_BATCH: getApiConfig(
      ApiType.POST_JSON,
      '/live/v4/global/robot/save-batch',
      '批量创建机器人虚拟昵称'
    ),
    DELETE_BATCH: getApiConfig(
      ApiType.POST_FORM,
      '/live/v4/global/robot/delete-batch',
      '批量删除机器人信息'
    ),
  },
  
  // 全局设置相关
  GLOBAL: {
    SETTINGS: getApiConfig(
      ApiType.GET,
      '/live/v4/global/settings',
      '获取全局设置'
    ),
    UPDATE_SETTINGS: getApiConfig(
      ApiType.POST_JSON,
      '/live/v4/global/settings/update',
      '更新全局设置'
    ),
  },
} as const;

// 路径参数类型
export type PathParams = Record<string, string | number>;

/**
 * 获取完整的API URL
 * @param apiConfig API配置对象或字符串路径
 * @param pathParams 可选，路径参数，用于替换路径中的 :paramName 格式的参数
 * @returns 完整的API URL
 */
export function getFullUrl(
  apiConfig: ApiConfig | string, 
  pathParams?: PathParams
): string {
  // 确定路径
  let path: string;
  
  if (typeof apiConfig === 'string') {
    // 如果传入的是字符串，直接使用该字符串作为路径
    path = apiConfig;
  } else {
    // 如果传入的是API配置对象，使用其path属性
    path = apiConfig.path;
  }
  
  // console.log(`🔄 [URL构建] 开始构建URL，原始路径: ${path}`);
  // console.log(`🔄 [URL构建] 路径参数: ${JSON.stringify(pathParams || {})}`);
  
  // 替换路径参数
  if (pathParams) {
    const originalPath = path;
    // 查找所有需要替换的路径参数
    const pathParamRegex = /:([a-zA-Z][a-zA-Z0-9_]*)/g;
    const pathParamMatches = [...path.matchAll(pathParamRegex)];
    
    // console.log(`🔄 [URL构建] 检测到 ${pathParamMatches.length} 个路径参数需要替换`);
    
    path = Object.entries(pathParams).reduce((curPath, [key, value]) => {
      const placeholder = `:${key}`;
      const newPath = curPath.replace(placeholder, String(value));
      // console.log(`🔄 [URL构建] 替换 ${placeholder} 为 ${value}, 替换前: ${curPath} => 替换后: ${newPath}`);
      return newPath;
    }, path);
    
    // 检查是否还有未替换的参数
    const unreplacedParams = [...path.matchAll(pathParamRegex)].map(match => match[0]);
    if (unreplacedParams.length > 0) {
      console.warn(`⚠️ [URL构建警告] 以下路径参数未替换: ${unreplacedParams.join(', ')}`);
    }
    
    // console.log(`🔄 [URL构建] 路径参数替换完成: ${originalPath} => ${path}`);
  }
  
  const fullUrl = `${BASE_URL}${path}`;
  // console.log(`🔄 [URL构建] 最终完整URL: ${fullUrl}`);
  
  return fullUrl;
}

/**
 * 获取带查询参数的API URL
 * @param apiConfig API配置对象或字符串路径
 * @param queryParams URL查询参数对象
 * @param pathParams 可选，路径参数，用于替换路径中的 :paramName 格式的参数
 * @returns 带参数的完整API URL
 */
export function getUrlWithParams(
  apiConfig: ApiConfig | string, 
  queryParams: Record<string, string | number>,
  pathParams?: PathParams
): string {
  const fullUrl = getFullUrl(apiConfig, pathParams);
  const url = new URL(fullUrl);
  
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  
  return url.toString();
}

/**
 * 客户端全局配置
 * 配置全局请求设置并导出配置好的pactum实例
 */
// 使用基础URL作为默认基础URL
pactum.request.setBaseUrl(BASE_URL);
pactum.request.setDefaultTimeout(config.test.requestTimeout);

// 使用正确的LogLevel类型
pactum.settings.setLogLevel('TRACE');

// 添加通用请求头
pactum.request.setDefaultHeaders({
  'Accept': 'application/json'
});

// 启用cookie jar以自动管理cookie
pactum.request.setDefaultFollowRedirects(true);

// 导出配置好的pactum实例
export const client = pactum;