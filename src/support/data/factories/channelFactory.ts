import { client, getFullUrl, API_URLS } from '../../../api/urls';
import { getPolyvMD5Sign } from '../helpers/signatureHelper';

/**
 * 频道工厂类 - 负责测试频道的创建和管理
 */
export class ChannelFactory {
  // 用于存储最近创建的测试频道ID列表
  private static testChannelIds: string[] = [];
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒

  /**
   * 添加测试频道ID到列表中
   * @param channelId 要添加的频道ID
   */
  static addTestChannelId(channelId: string): void {
    if (!this.testChannelIds.includes(channelId)) {
      this.testChannelIds.push(channelId);
      console.log(`添加频道ID到测试列表: ${channelId}`);
    }
  }

  /**
   * 清空测试频道ID列表
   */
  static clearTestChannelIds(): void {
    this.testChannelIds = [];
  }

  /**
   * 创建频道请求体数据
   */
  static createChannel(scene: 'topclass' | 'double' | 'train' | 'seminar' | 'alone' | 'meeting', overrides: any = {}): any {
    const now = Date.now();
    const baseData = {
      name: `测试${scene}频道-${now}`,
      categoryId: 100,
      cnAndEnLiveEnabled: 'N',
      doubleTeacherType: 'transmit',
      endTime: new Date(now + 2 * 60 * 60 * 1000).toISOString(), // 当前时间后2小时
      linkMicLimit: 5,
      newScene: scene,
      pureRtcEnabled: 'Y',
      startTime: new Date(now + 1 * 60 * 60 * 1000).toISOString(), // 当前时间后1小时
      template: this.getTemplateByScene(scene),
      type: 'normal' // 默认不开启转播
    };

    // 根据场景添加特定配置
    switch (scene) {
      case 'seminar':
        Object.assign(baseData, {
          template: 'seminar'
        });
        break;
      case 'meeting':
        Object.assign(baseData, {
          template: 'meeting'
        });
        break;
      case 'double':
        Object.assign(baseData, {
          template: 'ppt',
          doubleTeacherType: 'transmit'
        });
        break;
    }

    return {
      ...baseData,
      ...overrides
    };
  }

  private static getTemplateByScene(scene: string): string {
    const templateMap: { [key: string]: string } = {
      topclass: 'topclass',
      double: 'ppt',
      train: 'ppt',
      seminar: 'seminar',
      alone: 'alone',
      meeting: 'meeting'
    };
    return templateMap[scene] || 'ppt';
  }

  static createTopClassChannel(overrides: any = {}): any {
    return this.createChannel('topclass', overrides);
  }

  static createDoubleTeacherChannel(overrides: any = {}): any {
    return this.createChannel('double', overrides);
  }

  static createTrainingChannel(overrides: any = {}): any {
    return this.createChannel('train', overrides);
  }

  static createSeminarChannel(overrides: any = {}): any {
    return this.createChannel('seminar', overrides);
  }

  static createAloneChannel(overrides: any = {}): any {
    return this.createChannel('alone', overrides);
  }

  static createMeetingChannel(overrides: any = {}): any {
    return this.createChannel('meeting', overrides);
  }

  /**
   * 创建一个测试频道
   * @param channelName 可选频道名称，默认为"测试频道"加时间戳
   * @returns 创建频道的响应
   */
  static async create(channelName?: string): Promise<any> {
    // 生成频道名称，默认为"测试频道"加时间戳
    const name = channelName || `测试频道_${Date.now()}`;
    
    // 获取保利威API参数
    const appId = process.env.POLYV_APP_ID;
    const appSecret = process.env.POLYV_APP_SECRET;
    const userId = process.env.POLYV_USER_ID;
    
    if (!appId || !appSecret) {
      throw new Error('环境变量中缺少POLYV_APP_ID或POLYV_APP_SECRET');
    }
    
    // 准备签名参数
    const timestamp = Date.now().toString();
    const signParams: Record<string, string> = {
      appId,
      timestamp
    };
    
    // 如果有userId，添加到签名参数中
    if (userId) {
      signParams.userId = userId;
    }
    
    // 计算MD5签名
    const sign = getPolyvMD5Sign(signParams, appSecret);
    
    // 添加签名到URL参数中
    const urlParams = {
      ...signParams,
      sign
    };
    
    // 准备请求体参数
    const bodyParams = {
      name,
      newScene: 'topclass',
      template: 'ppt',
      pureRtcEnabled: 'Y',
      type: 'normal',
      doubleTeacherType: 'normal',
      linkMicLimit: 6
    };
    
    // 执行创建频道请求
    const url = getFullUrl(API_URLS.CHANNEL.CREATE);
    const spec = client.spec()
      .post(url)
      .withQueryParams(urlParams)
      .withJson(bodyParams)
      .withHeaders({ 'Content-Type': 'application/json' });
    
    const response = await spec.toss();
    
    // 如果创建成功，存储频道ID
    if (response.json && response.json.code === 200 && response.json.data && response.json.data.channelId) {
      this.testChannelIds.push(response.json.data.channelId);
    }
    
    return response;
  }
  
  /**
   * 创建多个测试频道
   * @param count 创建频道的数量，默认为2
   * @returns 所有创建频道的ID数组
   */
  static async createMany(count: number = 2): Promise<string[]> {
    const channelIds: string[] = [];
    
    try {
      for (let i = 0; i < count; i++) {
        const response = await this.create(`批量测试频道_${i+1}_${Date.now()}`);
        
        if (response.json && response.json.code === 200 && response.json.data && response.json.data.channelId) {
          channelIds.push(response.json.data.channelId);
        }
      }
    } catch (error) {
      console.error('创建测试频道失败:', error);
      throw error;
    }
    
    return channelIds;
  }
  
  /**
   * 获取最近创建的测试频道ID列表
   * @returns 测试频道ID数组
   */
  static getTestChannelIds(): string[] {
    return [...this.testChannelIds];
  }
  
  /**
   * 批量删除测试频道，带重试机制
   * @param channelIds 要删除的频道ID数组
   * @returns 删除操作的响应
   */
  static async batchDelete(channelIds: string[]): Promise<any> {
    if (!channelIds || channelIds.length === 0) {
      throw new Error('未指定频道ID');
    }
    
    // 获取保利威API参数
    const appId = process.env.POLYV_APP_ID;
    const appSecret = process.env.POLYV_APP_SECRET;
    
    if (!appId || !appSecret) {
      throw new Error('环境变量中缺少POLYV_APP_ID或POLYV_APP_SECRET');
    }

    let lastError;
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        // 准备签名参数
        const timestamp = Date.now().toString();
        const signParams: Record<string, string> = {
          appId,
          timestamp
        };
        
        // 计算MD5签名
        const sign = getPolyvMD5Sign(signParams, appSecret);
        
        // 添加签名到URL参数中
        const urlParams = {
          ...signParams,
          sign
        };
        
        // 准备请求体
        const body = {
          channelIds
        };
        
        // 执行批量删除请求
        const url = getFullUrl(API_URLS.CHANNEL.BATCH_DELETE);
        const spec = client.spec()
          .post(url)
          .withQueryParams(urlParams)
          .withJson(body)
          .withHeaders({ 'Content-Type': 'application/json' });
        
        const response = await spec.toss();
        
        // 如果删除成功，从列表中移除这些ID
        if (response.json && response.json.code === 200) {
          channelIds.forEach(id => {
            const index = this.testChannelIds.indexOf(id);
            if (index > -1) {
              this.testChannelIds.splice(index, 1);
            }
          });
          console.log(`成功删除频道: ${channelIds.join(', ')}`);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        console.error(`删除频道失败 (尝试 ${attempt}/${this.MAX_RETRY_ATTEMPTS}):`, error);
        
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          console.log(`等待 ${this.RETRY_DELAY}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }
    
    throw lastError;
  }
} 