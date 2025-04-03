import { Given } from '@cucumber/cucumber';
import { CustomWorld } from '../../support/world';
import { CategoryFactory } from '../../support/data/factories/categoryFactory';
import { ChannelFactory } from '../../support/data/factories/channelFactory';
import { RobotFactory } from '../../support/data/factories/robotFactory';
import { MenuFactory } from '../../support/data/factories/menuFactory';
import { handleApiRequest } from './api.steps';

/**
 * 通用创建资源函数，用于减少代码重复
 */
async function createResource(
  this: CustomWorld,
  resourceType: string,
  creationFn: Function,
  resourceName?: string,
  ...additionalArgs: any[]
) {
  try {
    // 调用创建资源的函数
    // 这里需要确保静态方法能正确调用
    const response = await creationFn(resourceName, ...additionalArgs);
    
    // 保存创建资源的响应
    const currentStep = this.getCurrentStepNumber();
    this.setStepResponse(currentStep, response);
    
    return response;
  } catch (error) {
    console.error(`创建${resourceType}${resourceName ? ` "${resourceName}"` : ''} 失败:`, error);
    throw error;
  }
}

/**
 * 处理创建分类响应
 */
function handleCategoryResponse(
  this: CustomWorld,
  response: any,
  categoryName?: string
) {
  const categoryId = response.json.data.categoryId;
  const actualCategoryName = categoryName || response.json.data.categoryName;
  console.log(`已创建测试分类，ID: ${categoryId}, 名称: ${actualCategoryName}`);
  
  // 可以在此添加额外的上下文存储逻辑
  this.context.categoryId = categoryId;
  
  return response;
}

/**
 * 处理创建机器人响应
 */
function handleRobotResponse(
  this: CustomWorld, 
  response: any, 
  robotName?: string
) {
  // 从响应对象中获取机器人名称
  const actualRobotName = response._createdRobotName || robotName || `自动测试机器人_${Date.now()}`;
  
  // 保存机器人名称到上下文中
  this.context.robotName = actualRobotName;
  
  // 从创建响应直接获取机器人ID
  if (response.json && response.json.data && Array.isArray(response.json.data) && response.json.data.length > 0) {
    const createdRobotIds = response.json.data;
    if (createdRobotIds && createdRobotIds.length > 0) {
      this.context.robotId = createdRobotIds[0]; // 保存第一个返回的ID
      console.log(`创建测试机器人成功，名称: ${actualRobotName}, ID: ${this.context.robotId}`);
      this.context.robotIdVerified = true;
      return response;
    }
  }
  
  console.log(`创建测试机器人成功，名称: ${actualRobotName}，但未能从响应中获取ID，将在测试结束后无法自动删除`);
  return response;
}

/**
 * 处理创建频道响应
 */
function handleChannelResponse(
  this: CustomWorld,
  response: any
) {
  const channelId = response.json.data.channelId;
  // console.log(`已创建测试频道，ID: ${channelId}, 名称: ${response.json.data.name || '未知'}`);
  
  // 将频道ID存储到world上下文中，供后续步骤使用
  this.context.channelId = channelId;
  
  // 确保频道ID被添加到 ChannelFactory 的测试频道列表中
  const { ChannelFactory } = require('../../support/data/factories/channelFactory');
  if (!ChannelFactory.getTestChannelIds().includes(channelId)) {
    ChannelFactory.addTestChannelId(channelId);
  }
  
  return response;
}

/**
 * 创建一个新频道分类
 * 不需要额外参数，自动生成分类名
 */
Given('创建一个新频道分类', { timeout: 60000 }, async function(this: CustomWorld) {
  const response = await createResource.call(this, '分类', 
    (...args: any[]) => CategoryFactory.create(...args));
  return handleCategoryResponse.call(this, response);
});

/**
 * 创建指定名称的频道分类
 * @param categoryName 分类名称
 */
Given('创建名为 {string} 的频道分类', { timeout: 60000 }, async function(this: CustomWorld, categoryName: string) {
  const response = await createResource.call(this, '分类', 
    (...args: any[]) => CategoryFactory.create(...args), categoryName);
  return handleCategoryResponse.call(this, response, categoryName);
});

/**
 * 创建一个新频道
 * 不需要额外参数，自动生成频道名
 */
Given('创建一个新频道', { timeout: 60000 }, async function(this: CustomWorld) {
  const response = await createResource.call(this, '频道', 
    (...args: any[]) => ChannelFactory.create(...args));
  return handleChannelResponse.call(this, response);
});

/**
 * 创建用于复制的源频道
 * 创建频道后将ID保存到sourceChannelId
 */
Given('我有一个用于测试的频道', { timeout: 60000 }, async function(this: CustomWorld) {
  const response = await createResource.call(this, '频道', 
    (...args: any[]) => ChannelFactory.create(...args), '源测试频道');
  
  const channelId = response.json.data.channelId;
  console.log(`已创建用于测试的频道，ID: ${channelId}, 名称: ${response.json.data.name || '未知'}`);
  
  // 将频道ID存储到world上下文中的sourceChannelId，供后续复制操作使用
  this.context.sourceChannelId = channelId;
  
  return response;
});

/**
 * 创建一个新机器人
 * 不需要额外参数，自动生成机器人名称
 */
Given('创建一个新机器人', { timeout: 60000 }, async function(this: CustomWorld) {
  const response = await createResource.call(this, '机器人', 
    (...args: any[]) => RobotFactory.create(...args));
  return handleRobotResponse.call(this, response);
});

/**
 * 创建指定名称的机器人
 * @param robotName 机器人名称
 */
Given('创建名为 {string} 的机器人', { timeout: 60000 }, async function(this: CustomWorld, robotName: string) {
  const response = await createResource.call(this, '机器人', 
    (...args: any[]) => RobotFactory.create(...args), robotName);
  return handleRobotResponse.call(this, response, robotName);
});

/**
 * 创建频道并添加多个菜单
 * 创建一个频道，并添加三种类型的菜单（文本、介绍、聊天）
 */
Given('创建一个具有多个菜单的频道', { timeout: 60000 }, async function(this: CustomWorld) {
  try {
    // 1. 创建频道
    const channelResponse = await createResource.call(this, '频道', 
      (...args: any[]) => ChannelFactory.create(...args), '带菜单的测试频道');
    
    // 处理频道响应，保存channelId到上下文
    handleChannelResponse.call(this, channelResponse);
    
    // 确保channelId存在
    if (!this.context.channelId) {
      throw new Error('创建频道失败，无法获取频道ID');
    }
    
    // 2. 首先查询频道已有的菜单
    const apiKey = 'CHANNEL.MENU_LIST';
    // 设置查询频道菜单的参数
    this.context.queryParams = {
      channelId: this.context.channelId
    };
    
    // 发送菜单列表查询请求
    await handleApiRequest(this, apiKey);
    const menuListResponse = this.getLastResponse();
    
    // 确认查询成功
    if (!menuListResponse?.json || menuListResponse.json.code !== 200) {
      console.error('查询频道菜单失败:', menuListResponse?.json);
      throw new Error('查询频道菜单失败');
    }
    
    // 获取已有的菜单类型
    const existingMenus = menuListResponse.json.data || [];
    const existingTypes = existingMenus.map((menu: any) => menu.menuType);
    // console.log(`频道 ${this.context.channelId} 已有菜单类型:`, existingTypes);
    
    // 3. 准备要创建的菜单类型，避免重复
    // 常用的菜单类型列表
    const menuTypes: ('text' | 'desc' | 'quiz' | 'chat' | 'iframe')[] = ['text', 'iframe', 'quiz'];
    
    // 过滤掉已存在的菜单类型
    const typesToCreate = menuTypes.filter(type => !existingTypes.includes(type));
    
    if (typesToCreate.length === 0) {
      console.log(`频道 ${this.context.channelId} 已包含所有需要的菜单类型`);
    } else {
      // console.log(`准备为频道 ${this.context.channelId} 创建以下类型的菜单:`, typesToCreate);
    }
    
    // 4. 创建不存在的菜单类型
    const addedMenuIds = await MenuFactory.createMany(this.context.channelId, typesToCreate);
    
    // 添加创建的菜单ID到已有的菜单
    const allMenuIds = [...(this.context.menuIds || []), ...addedMenuIds];
    
    // 保存菜单ID到上下文
    this.context.menuIds = allMenuIds;
    
    // 计算菜单总数量 (已有 + 新增)
    const totalMenuCount = existingMenus.length + addedMenuIds.length;
    console.log(`频道 ${this.context.channelId} 现有 ${totalMenuCount} 个菜单（新增 ${addedMenuIds.length} 个）`);
    
    return channelResponse;
  } catch (error) {
    console.error('创建带菜单的频道失败:', error);
    throw error;
  }
});

/**
 * 创建频道并添加指定类型的菜单
 * @param menuType 菜单类型
 */
Given('创建一个频道并添加 {string} 类型的菜单', { timeout: 60000 }, async function(this: CustomWorld, menuType: string) {
  try {
    // 验证菜单类型是否有效
    const validTypes = ['text', 'desc', 'quiz', 'chat', 'iframe'];
    const type = menuType.toLowerCase();
    
    if (!validTypes.includes(type)) {
      throw new Error(`无效的菜单类型: ${menuType}，有效类型为: ${validTypes.join(', ')}`);
    }
    
    // 1. 创建频道
    const channelResponse = await createResource.call(this, '频道', 
      (...args: any[]) => ChannelFactory.create(...args), `带${menuType}菜单的测试频道`);
    
    // 处理频道响应，保存channelId到上下文
    handleChannelResponse.call(this, channelResponse);
    
    // 确保channelId存在
    if (!this.context.channelId) {
      throw new Error('创建频道失败，无法获取频道ID');
    }
    
    // 2. 首先查询频道已有的菜单
    const apiKey = 'CHANNEL.MENU_LIST';
    // 设置查询频道菜单的参数
    this.context.queryParams = {
      channelId: this.context.channelId
    };
    
    // 发送菜单列表查询请求
    await handleApiRequest(this, apiKey);
    const menuListResponse = this.getLastResponse();
    
    // 确认查询成功
    if (!menuListResponse?.json || menuListResponse.json.code !== 200) {
      console.error('查询频道菜单失败:', menuListResponse?.json);
      throw new Error('查询频道菜单失败');
    }
    
    // 获取已有的菜单类型
    const existingMenus = menuListResponse.json.data || [];
    const existingTypes = existingMenus.map((menu: any) => menu.menuType);
    console.log(`频道 ${this.context.channelId} 已有菜单类型:`, existingTypes);
    
    // 3. 检查指定菜单类型是否已存在
    if (existingTypes.includes(type)) {
      console.log(`频道 ${this.context.channelId} 已存在 ${type} 类型的菜单，不需要创建`);
      
      // 找到对应类型的菜单ID并保存到上下文
      const existingMenu = existingMenus.find((menu: any) => menu.menuType === type);
      if (existingMenu && existingMenu.menuId) {
        this.context.menuId = existingMenu.menuId;
        console.log(`使用现有的 ${type} 类型菜单，ID: ${this.context.menuId}`);
      }
    } else {
      // 4. 创建指定类型的菜单
      // console.log(`准备为频道 ${this.context.channelId} 创建 ${type} 类型的菜单`);
      const menuResponse = await MenuFactory.create(
        this.context.channelId, 
        `菜单_${type}`, 
        type as any
      );
      
      // 保存当前步骤的响应
      const currentStep = this.getCurrentStepNumber();
      this.setStepResponse(currentStep, menuResponse);
      
      // 保存菜单ID到上下文
      if (menuResponse.json && menuResponse.json.data && menuResponse.json.data.menuId) {
        this.context.menuId = menuResponse.json.data.menuId;
        console.log(`已为频道 ${this.context.channelId} 创建 ${menuType} 类型的菜单，ID: ${this.context.menuId}`);
      }
    }
    
    return channelResponse;
  } catch (error) {
    console.error(`创建带${menuType}菜单的频道失败:`, error);
    throw error;
  }
});
