import { client, getFullUrl, API_URLS } from '../../../api/urls';
import { getPolyvMD5Sign } from '../helpers/signatureHelper';

/**
 * 分类工厂类 - 负责测试分类的创建和管理
 */
export class CategoryFactory {
  /**
   * 创建一个测试分类
   * @param categoryName 可选分类名称，默认为"测试分类"加时间戳
   * @returns 创建分类的响应
   */
  static async create(categoryName?: string): Promise<any> {
    // 生成分类名称，默认为"测试分类"加时间戳
    const name = categoryName || `测试分类_${Date.now()}`;
    
    // 获取保利威API参数
    const appId = process.env.POLYV_APP_ID;
    const appSecret = process.env.POLYV_APP_SECRET;
    const userId = process.env.POLYV_USER_ID;
    
    if (!appId || !appSecret) {
      throw new Error('环境变量中缺少POLYV_APP_ID或POLYV_APP_SECRET');
    }
    
    // 准备签名参数
    const timestamp = Date.now().toString();
    const allParams: Record<string, string> = {
      appId,
      timestamp,
      categoryName: name
    };
    
    // 如果有userId，添加到参数中
    if (userId) {
      allParams.userId = userId;
    }
    
    // 计算MD5签名
    const sign = getPolyvMD5Sign(allParams, appSecret);
    
    // 添加签名到参数中
    allParams.sign = sign;
    
    // 执行创建分类请求
    const url = getFullUrl(API_URLS.ACCOUNT.CATEGORY_CREATE);
    const spec = client.spec()
      .post(url)
      .withHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      .withForm(allParams);
    
    return await spec.toss();
  }
  
  /**
   * 删除指定分类
   * @param categoryId 分类ID
   * @returns 删除分类的响应
   */
  static async delete(categoryId: string): Promise<any> {
    if (!categoryId) {
      throw new Error('未指定分类ID');
    }
    
    // 获取保利威API参数
    const appId = process.env.POLYV_APP_ID;
    const appSecret = process.env.POLYV_APP_SECRET;
    const userId = process.env.POLYV_USER_ID;
    
    if (!appId || !appSecret) {
      throw new Error('环境变量中缺少POLYV_APP_ID或POLYV_APP_SECRET');
    }
    
    // 准备签名参数
    const timestamp = Date.now().toString();
    const allParams: Record<string, string> = {
      appId,
      timestamp,
      categoryId
    };
    
    // 如果有userId，添加到参数中
    if (userId) {
      allParams.userId = userId;
    }
    
    // 计算MD5签名
    const sign = getPolyvMD5Sign(allParams, appSecret);
    
    // 添加签名到参数中
    allParams.sign = sign;
    
    // 执行删除分类请求
    const url = getFullUrl(API_URLS.ACCOUNT.CATEGORY_DELETE);
    const spec = client.spec()
      .post(url)
      .withHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      .withForm(allParams);
    
    return await spec.toss();
  }
} 