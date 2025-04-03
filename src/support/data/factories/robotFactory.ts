import { client, getFullUrl, API_URLS } from '../../../api/urls';
import { getPolyvMD5Sign } from '../helpers/signatureHelper';

/**
 * 机器人工厂类 - 负责测试机器人的创建和管理
 */
export class RobotFactory {
  // 用于存储最近创建的测试机器人ID列表
  private static testRobotIds: string[] = [];
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒

  /**
   * 添加测试机器人ID到列表中
   * @param robotId 要添加的机器人ID
   */
  static addTestRobotId(robotId: string): void {
    if (!this.testRobotIds.includes(robotId)) {
      this.testRobotIds.push(robotId);
      console.log(`添加机器人ID到测试列表: ${robotId}`);
    }
  }

  /**
   * 清空测试机器人ID列表
   */
  static clearTestRobotIds(): void {
    this.testRobotIds = [];
    console.log('已清空测试机器人ID列表');
  }

  /**
   * 获取最近创建的测试机器人ID列表
   * @returns 测试机器人ID数组
   */
  static getTestRobotIds(): string[] {
    return [...this.testRobotIds];
  }

  /**
   * 创建一个新机器人
   * @param robotName 可选机器人名称，默认为"自动测试机器人_"加时间戳
   * @returns 创建机器人的响应，包含创建的机器人ID
   */
  static async create(robotName?: string): Promise<any> {
    // 创建带时间戳的唯一机器人名称
    const name = robotName || `自动测试机器人_${Date.now()}`;
    
    // 获取必要的认证参数
    const appId = process.env.POLYV_APP_ID || '';
    const appSecret = process.env.POLYV_APP_SECRET || '';
    const timestamp = Date.now().toString();
    
    // 准备签名参数
    const signParams: Record<string, string> = {
      appId,
      timestamp
    };
    
    // 计算签名
    const sign = getPolyvMD5Sign(signParams, appSecret);
    
    try {
      // 发送API请求创建机器人
      const response = await client.spec()
        .post(getFullUrl(API_URLS.ROBOT.SAVE_BATCH))
        .withQueryParams({
          appId,
          timestamp,
          sign
        })
        .withJson([{ name }])
        .toss();
      
      // 将创建的机器人名称添加到响应中，以便步骤能够获取
      if (response && response.json) {
        response._createdRobotName = name;
        // 如果响应中包含机器人ID，添加到测试列表中
        if (response.json.data && Array.isArray(response.json.data)) {
          response.json.data.forEach((robot: any) => {
            if (robot.id) {
              this.addTestRobotId(robot.id);
            }
          });
        }
      }
      
      return response;
    } catch (error) {
      console.error(`创建机器人 "${name}" 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量删除机器人，带重试机制
   * @param robotIds 要删除的机器人ID数组
   * @returns 删除响应
   */
  static async batchDelete(robotIds: string[]): Promise<any> {
    if (!robotIds || robotIds.length === 0) {
      return;
    }
    
    const idsString = robotIds.join(',');
    
    // 获取必要的认证参数
    const appId = process.env.POLYV_APP_ID || '';
    const appSecret = process.env.POLYV_APP_SECRET || '';

    let lastError;
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const timestamp = Date.now().toString();
        
        // 准备签名参数
        const signParams: Record<string, string> = {
          appId,
          timestamp
        };
        
        // 计算签名
        const sign = getPolyvMD5Sign(signParams, appSecret);
        
        // 使用DELETE_BATCH接口删除机器人
        const response = await client.spec()
          .post(getFullUrl(API_URLS.ROBOT.DELETE_BATCH))
          .withQueryParams({
            appId,
            timestamp,
            sign
          })
          .withForm({
            ids: idsString
          })
          .toss();
        
        // 如果删除成功，从列表中移除这些ID
        if (response.json && response.json.code === 200) {
          robotIds.forEach(id => {
            const index = this.testRobotIds.indexOf(id);
            if (index > -1) {
              this.testRobotIds.splice(index, 1);
            }
          });
          console.log(`成功删除机器人: ${idsString}`);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        console.error(`删除机器人失败 (尝试 ${attempt}/${this.MAX_RETRY_ATTEMPTS}):`, error);
        
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          console.log(`等待 ${this.RETRY_DELAY}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }
    
    throw lastError;
  }
} 