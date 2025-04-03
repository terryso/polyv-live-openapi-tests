const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// 连接参数函数，与api-helpers.ts中的concatPolyvParams保持一致
function concatPolyvParams(params) {
  const keys = Object.keys(params).sort();
  let result = '';
  
  for (const key of keys) {
    const value = params[key];
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      continue;
    }
    result += key + value;
  }
  
  return result;
}

// MD5加密函数，与api-helpers.ts中的md5Hex保持一致
function md5Hex(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex').toLowerCase();
}

// 计算保利威MD5签名，与api-helpers.ts中的getPolyvMD5Sign保持一致
function getPolyvMD5Sign(params, appSecret) {
  const concatStr = concatPolyvParams(params);
  const plain = appSecret + concatStr + appSecret;
  return md5Hex(plain).toUpperCase();
}

async function cleanupRobots() {
  try {
    // 认证参数
    const appId = process.env.POLYV_APP_ID || '';
    const secret = process.env.POLYV_APP_SECRET || '';
    
    // 使用毫秒级时间戳
    const timestamp = Date.now().toString();
    
    console.log('使用AppID:', appId);
    console.log('当前时间戳:', timestamp);
    
    // 查询机器人列表
    const queryParams = {
      appId,
      timestamp,
      pageSize: 200,
      currentPage: 1
    };
    
    const sign = getPolyvMD5Sign(queryParams, secret);
    
    console.log('查询参数:', { ...queryParams, sign });
    console.log('查询机器人列表...');
    
    const listResponse = await axios.get('https://api.polyv.net/live/v4/global/robot/list', {
      params: {
        ...queryParams,
        sign
      }
    });
    
    if (listResponse.data.code === 200 && listResponse.data.data && listResponse.data.data.contents) {
      const robots = listResponse.data.data.contents;
      console.log(`查询到 ${robots.length} 个机器人`);
      
      // 打印所有机器人名称
      console.log('所有机器人名称:');
      robots.forEach((robot, index) => {
        console.log(`${index + 1}. ID: ${robot.id}, 名称: ${robot.name}`);
      });
      
      // 找出所有测试相关的机器人
      const testRobots = robots.filter(r => r.name && 
        typeof r.name === 'string' && (
          r.name.startsWith('测试机器人') || 
          r.name.startsWith('自动测试机器人_') ||
          r.name.includes('测试') ||
          r.name.includes('test')
        )
      );
      console.log(`找到 ${testRobots.length} 个测试机器人需要删除`);
      
      if (testRobots.length > 0) {
        // 获取所有测试机器人ID
        const robotIds = testRobots.map(r => r.id);
        const idsString = robotIds.join(',');
        console.log('将删除机器人ID:', idsString);
        
        // 删除这些机器人
        const deleteTimestamp = Date.now().toString();
        const deleteSignParams = {
          appId,
          timestamp: deleteTimestamp
        };
        
        const deleteSign = getPolyvMD5Sign(deleteSignParams, secret);
        
        // 构建表单数据
        const formData = new URLSearchParams();
        formData.append('ids', idsString);
        
        console.log('删除机器人...');
        console.log('URL参数:', { appId, timestamp: deleteTimestamp, sign: deleteSign });
        console.log('表单数据:', { ids: idsString });
        
        const deleteResponse = await axios({
          method: 'post',
          url: 'https://api.polyv.net/live/v4/global/robot/delete-batch',
          params: {
            appId,
            timestamp: deleteTimestamp,
            sign: deleteSign
          },
          data: formData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        if (deleteResponse.data.code === 200) {
          console.log('成功删除所有测试机器人');
        } else {
          console.error('删除机器人失败:', deleteResponse.data);
        }
      } else {
        console.log('没有找到需要删除的测试机器人');
      }
    } else {
      console.error('查询机器人列表失败:', listResponse.data);
    }
  } catch (error) {
    console.error('清理机器人时发生错误:', error.message);
    if (error.response) {
      console.error('错误响应数据:', error.response.data);
    }
  }
}

// 执行清理
cleanupRobots(); 