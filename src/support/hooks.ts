import { Before, After, AfterAll, BeforeAll, Status } from '@cucumber/cucumber';
import { CategoryFactory } from './data/factories/categoryFactory';
import { ChannelFactory } from './data/factories/channelFactory';
import { RobotFactory } from './data/factories/robotFactory';
import { CustomWorld } from './world';

// 测试统计数据
let testStats = {
  start: Date.now(),
  totalScenarios: 0,
  passedScenarios: 0,
  failedScenarios: 0
};

// 全局钩子 - 测试套件开始
BeforeAll(async function() {
  console.log('开始执行测试套件');
  testStats = {
    start: Date.now(),
    totalScenarios: 0,
    passedScenarios: 0,
    failedScenarios: 0
  };
});

// 在每个场景开始前执行
Before(async function(this: CustomWorld) {
  // 重置步骤计数器
  this.currentStepNumber = 0;
  // console.log(`开始执行场景`);
});

// 在每个场景结束后执行
After(async function(this: CustomWorld, scenario) {
  // 如果测试失败，记录响应信息
  if (scenario.result?.status === Status.FAILED) {
    // 获取最后一个执行的步骤的响应数据
    const lastStepNumber = this.getCurrentStepNumber();
    
    try {
      // 尝试获取最后几个步骤的响应数据
      for (let i = lastStepNumber; i > 0; i--) {
        const response = this.getStepResponse(i);
        if (response) {
          // 只附加响应的JSON部分，避免循环引用
          const safeResponse = {
            stepNumber: i,
            statusCode: response.statusCode,
            json: response.json,
            headers: response.headers
          };
          
          this.attach(
            JSON.stringify(safeResponse, null, 2),
            'application/json'
          );
          
          // 只附加第一个找到的响应
          break;
        }
      }
    } catch (error) {
      this.attach(
        `无法序列化响应: ${error}`,
        'text/plain'
      );
    }
    
    if (this.error) {
      this.attach(
        this.error.message,
        'text/plain'
      );
    }
  }
  
  // 保留会话ID，只重置与当前场景相关的数据
  const sessionId = this.sessionId;
  const loggedIn = this.context?.loggedIn;
  
  // 重置响应相关的状态
  this.stepResponses = new Map();
  this.currentSpec = null;
  this.currentStepNumber = 0;
  this.error = null;
  
  // 重置上下文，但保留登录信息
  this.context = { 
    useFormData: false,
    queryParams: {},
    loggedIn: loggedIn || false
  };
  
  // 恢复会话ID
  this.sessionId = sessionId;
  
  // console.log(`场景执行完成，共执行了 ${this.getCurrentStepNumber()} 个步骤`);

  testStats.totalScenarios += 1;
  
  if (scenario.result?.status === Status.PASSED) {
    testStats.passedScenarios += 1;
  } else if (scenario.result?.status === Status.FAILED) {
    testStats.failedScenarios += 1;
  }
});

// 在标记为创建资源的场景后清理频道资源
After({ tags: '@create or @copy' }, async function(this: CustomWorld, scenario) {
  // 收集所有需要清理的频道ID
  const channelIdsToClean: string[] = [];
  
  // 检查上下文中是否有频道ID
  if (this.context && this.context.channelId) {
    channelIdsToClean.push(this.context.channelId);
  }
  
  // 检查是否有批量创建的频道ID (channelId1, channelId2, etc.)
  if (this.context) {
    Object.keys(this.context).forEach(key => {
      if (key.startsWith('channelId') && key !== 'channelId') {
        const id = this.context[key];
        if (id && !channelIdsToClean.includes(id)) {
          channelIdsToClean.push(id);
        }
      }
    });
  }

  // 检查上下文中是否有源频道ID
  if (this.context && this.context.sourceChannelId) {
    channelIdsToClean.push(this.context.sourceChannelId);
  }
  
  // 批量清理所有频道
  if (channelIdsToClean.length > 0) {
    try {
      console.log(`清理测试频道: ${channelIdsToClean.join(', ')}`);
      await ChannelFactory.batchDelete(channelIdsToClean);
      console.log(`成功清理测试频道: ${channelIdsToClean.join(', ')}`);
      // 从 ChannelFactory 中移除已成功清理的 ID
      channelIdsToClean.forEach(id => {
        const testChannelIds = ChannelFactory.getTestChannelIds();
        if (testChannelIds.includes(id)) {
          testChannelIds.splice(testChannelIds.indexOf(id), 1);
        }
      });
    } catch (error) {
      console.error(`清理测试频道失败:`, error);
      // 将失败的频道ID添加到ChannelFactory中，以便在AfterAll中重试
      channelIdsToClean.forEach(id => ChannelFactory.addTestChannelId(id));
    }
  }
  
  // 检查上下文中是否有分类ID
  if (this.context && this.context.categoryId) {
    try {
      console.log(`清理测试分类: ${this.context.categoryId}`);
      await CategoryFactory.delete(this.context.categoryId);
      console.log(`成功清理测试分类: ${this.context.categoryId}`);
    } catch (error) {
      console.error(`清理测试分类 ${this.context.categoryId} 失败:`, error);
    }
  }

  // 检查上下文中是否有机器人ID
  if (this.context && this.context.robotId) {
    try {
      console.log(`清理测试机器人: ${this.context.robotId}`);
      await RobotFactory.batchDelete([this.context.robotId]);
      console.log(`成功清理测试机器人: ${this.context.robotId}`);
      // 从 RobotFactory 中移除已成功清理的 ID
      const testRobotIds = RobotFactory.getTestRobotIds();
      if (testRobotIds.includes(this.context.robotId)) {
        testRobotIds.splice(testRobotIds.indexOf(this.context.robotId), 1);
      }
    } catch (error) {
      console.error(`清理测试机器人 ${this.context.robotId} 失败:`, error);
      // 将失败的机器人ID添加到RobotFactory中，以便在AfterAll中重试
      RobotFactory.addTestRobotId(this.context.robotId);
    }
  }
});

// 在所有测试结束后清理遗留的测试频道和机器人
AfterAll(async function() {
  try {
    // 清理遗留的测试频道
    const testChannelIds = ChannelFactory.getTestChannelIds();
    if (testChannelIds.length > 0) {
      console.log(`清理所有遗留的测试频道: ${testChannelIds.join(', ')}`);
      
      // 单个处理每个频道，忽略单个频道的错误
      for (const channelId of testChannelIds) {
        try {
          // 使用ChannelFactory.batchDelete方法，一次处理一个频道ID
          const response = await ChannelFactory.batchDelete([channelId]);
          // console.log(`清理测试频道 ${channelId} 响应:`, response.json);
          console.log(`成功清理测试频道: ${channelId}`);
        } catch (error) {
          console.error(`清理测试频道 ${channelId} 失败:`, error);
          // 忽略错误，继续处理下一个
        }
      }
      
      // 清空测试频道ID列表
      ChannelFactory.clearTestChannelIds();
      console.log('已清空测试频道ID列表');
    }

    // 清理遗留的测试机器人
    const testRobotIds = RobotFactory.getTestRobotIds();
    if (testRobotIds.length > 0) {
      console.log(`清理所有遗留的测试机器人: ${testRobotIds.join(', ')}`);
      
      // 单个处理每个机器人，忽略单个机器人的错误
      for (const robotId of testRobotIds) {
        try {
          const response = await RobotFactory.batchDelete([robotId]);
          // console.log(`清理测试机器人 ${robotId} 响应:`, response.json);
          console.log(`成功清理测试机器人: ${robotId}`);
        } catch (error) {
          console.error(`清理测试机器人 ${robotId} 失败:`, error);
          // 忽略错误，继续处理下一个
        }
      }
      
      // 清空测试机器人ID列表
      RobotFactory.clearTestRobotIds();
      console.log('已清空测试机器人ID列表');
    }
  } catch (error) {
    console.error('清理遗留测试资源失败:', error);
  }
}); 