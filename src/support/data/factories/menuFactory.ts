import { client, getFullUrl, API_URLS } from '../../../api/urls';
import { getPolyvMD5Sign } from '../helpers/signatureHelper';

/**
 * 菜单工厂类 - 负责测试菜单的创建和管理
 */
export class MenuFactory {
  // 用于存储最近创建的测试菜单ID列表
  private static testMenuIds: string[] = [];
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒

  /**
   * 添加测试菜单ID到列表中
   * @param menuId 要添加的菜单ID
   */
  static addTestMenuId(menuId: string): void {
    if (!this.testMenuIds.includes(menuId)) {
      this.testMenuIds.push(menuId);
    //   console.log(`添加菜单ID到测试列表: ${menuId}`);
    }
  }

  /**
   * 清空测试菜单ID列表
   */
  static clearTestMenuIds(): void {
    this.testMenuIds = [];
  }

  /**
   * 获取测试菜单ID列表
   * @returns 测试菜单ID数组
   */
  static getTestMenuIds(): string[] {
    return [...this.testMenuIds];
  }

  /**
   * 根据菜单类型生成菜单内容
   * @param type 菜单类型
   * @returns 对应类型的内容
   */
  static getContentByType(type: string): string {
    const contents: { [key: string]: string } = {
      text: `测试文本菜单内容 ${Date.now()}`,
      desc: `这是一个直播介绍菜单 ${Date.now()}`,
      quiz: '',
      chat: '',
      iframe: 'https://www.polyv.net'
    };
    return contents[type] || '';
  }

  /**
   * 创建一个测试菜单
   * @param channelId 频道ID
   * @param menuName 可选菜单名称，默认为"测试菜单"加时间戳
   * @param menuType 可选菜单类型，默认为text
   * @returns 创建菜单的响应
   */
  static async create(channelId: string, menuName?: string, menuType: 'text' | 'desc' | 'quiz' | 'chat' | 'iframe' = 'text'): Promise<any> {
    // 生成菜单名称，默认为"测试菜单"加时间戳
    const name = menuName || `测试菜单_${Date.now()}`;
    
    // 获取保利威API参数
    const appId = process.env.POLYV_APP_ID;
    const appSecret = process.env.POLYV_APP_SECRET;
    const userId = process.env.POLYV_USER_ID;
    
    if (!appId || !appSecret) {
      throw new Error('环境变量中缺少POLYV_APP_ID或POLYV_APP_SECRET');
    }
    
    // 准备参数，所有参数都需要参与签名
    const content = this.getContentByType(menuType);
    const timestamp = Date.now().toString();
    
    // 构建所有请求参数，用于计算签名
    const requestParams: Record<string, string> = {
      appId,
      timestamp,
      channelId,
      name,
      type: menuType,
      content
    };
    
    // 如果有userId，添加到参数中
    if (userId) {
      requestParams.userId = userId;
    }
    
    // 计算MD5签名
    const sign = getPolyvMD5Sign(requestParams, appSecret);
    
    // 添加签名到参数中
    const urlParams = {
      ...requestParams,
      sign
    };
    
    // 执行创建菜单请求
    const url = getFullUrl(API_URLS.CHANNEL.MENU_ADD);
    
    // console.log(`发送创建菜单请求 - Type: ${menuType}, URL: ${url}`);
    // console.log(`请求参数: ${JSON.stringify(urlParams)}`);
    
    const spec = client.spec()
      .post(url)
      .withQueryParams(urlParams)
      .withHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    
    const response = await spec.toss();
    
    // 如果创建成功，存储菜单ID
    if (response.json && response.json.code === 200 && response.json.data && response.json.data.menuId) {
      this.addTestMenuId(response.json.data.menuId);
    //   console.log(`成功创建菜单 - Type: ${menuType}, ID: ${response.json.data.menuId}`);
    } else {
      console.error(`创建菜单失败 - Type: ${menuType}, 响应:`, response.json);
    }
    
    return response;
  }
  
  /**
   * 创建多个测试菜单
   * @param channelId 频道ID
   * @param types 菜单类型数组 ['text', 'desc', 'quiz', 'chat', 'iframe']
   * @returns 所有创建菜单的ID数组
   */
  static async createMany(channelId: string, types: ('text' | 'desc' | 'quiz' | 'chat' | 'iframe')[] = ['text', 'desc', 'chat']): Promise<string[]> {
    const menuIds: string[] = [];
    
    try {
      console.log(`开始为频道 ${channelId} 创建 ${types.length} 个菜单，类型: ${types.join(', ')}`);
      
      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        console.log(`尝试创建 ${type} 类型的菜单...`);
        
        // 使用简短的菜单名称
        const menuName = `菜单_${type}`;
        const response = await this.create(channelId, menuName, type);
        
        // console.log(`菜单创建响应: ${JSON.stringify(response.json || {})}`);
        
        if (response.json && response.json.code === 200 && response.json.data && response.json.data.menuId) {
          menuIds.push(response.json.data.menuId);
        //   console.log(`成功创建菜单: ${type}, ID: ${response.json.data.menuId}`);
        } else {
          console.error(`创建 ${type} 类型菜单失败，响应: `, response.json);
        }
      }
    } catch (error) {
      console.error('创建测试菜单失败:', error);
      throw error;
    }
    
    return menuIds;
  }
  
  /**
   * 删除菜单
   * @param channelId 频道ID
   * @param menuId 菜单ID
   * @returns 删除响应
   */
  static async delete(channelId: string, menuId: string): Promise<any> {
    // 获取保利威API参数
    const appId = process.env.POLYV_APP_ID;
    const appSecret = process.env.POLYV_APP_SECRET;
    
    if (!appId || !appSecret) {
      throw new Error('环境变量中缺少POLYV_APP_ID或POLYV_APP_SECRET');
    }
    
    // 准备签名参数
    const timestamp = Date.now().toString();
    const signParams: Record<string, string> = {
      appId,
      timestamp,
      channelId,
      menuId
    };
    
    // 计算MD5签名
    const sign = getPolyvMD5Sign(signParams, appSecret);
    
    // 添加签名到URL参数中
    const urlParams = {
      ...signParams,
      sign
    };
    
    // 执行删除菜单请求
    const url = getFullUrl(API_URLS.CHANNEL.MENU_DELETE);
    const spec = client.spec()
      .post(url)
      .withQueryParams(urlParams)
      .withHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    
    return await spec.toss();
  }
  
  /**
   * 批量删除菜单
   * @param channelId 频道ID
   * @param menuIds 菜单ID数组
   */
  static async batchDelete(channelId: string, menuIds: string[] = this.testMenuIds): Promise<void> {
    if (!menuIds || menuIds.length === 0) {
      console.log('没有需要删除的菜单');
      return;
    }
    
    try {
      for (const menuId of menuIds) {
        await this.delete(channelId, menuId);
        console.log(`已删除菜单: ${menuId}`);
        
        // 从测试菜单列表中移除
        const index = this.testMenuIds.indexOf(menuId);
        if (index > -1) {
          this.testMenuIds.splice(index, 1);
        }
      }
    } catch (error) {
      console.error('删除菜单时出错:', error);
      throw error;
    }
  }
} 