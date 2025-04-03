import { expect } from 'chai';
import * as sinon from 'sinon';
import * as pactum from 'pactum';
import { CustomWorld } from '../support/world';
import * as apiHelpers from '../utils/api-helpers';
import * as stepHelpers from '../utils/step-helpers';
import * as urls from '../api/urls';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { handleApiRequestCore } from '../utils/api-request-core';
import { client } from '../api/urls';

describe('handleApiRequest 函数测试', () => {
  // 测试用例执行前的设置
  let sandbox: sinon.SinonSandbox;
  let worldStub: any;
  let specStub: any;
  let sendRequestStub: sinon.SinonStub;
  let getPolyvMD5SignStub: sinon.SinonStub;
  let envStub: Record<string, string | undefined>;
  
  beforeEach(() => {
    // 创建沙盒
    sandbox = sinon.createSandbox();
    
    // 模拟环境变量
    envStub = {
      POLYV_APP_SECRET: 'test_secret',
      POLYV_APP_ID: 'test_app_id',
      POLYV_USER_ID: 'test_user_id'
    };
    
    // 创建World对象的模拟
    worldStub = {
      context: {
        useFormData: false,
        queryParams: {},
        formData: {},
        jsonData: {}
      },
      currentSpec: null,
      getCurrentSpec: sinon.stub(),
      getCurrentStepNumber: sinon.stub().returns(1),
      setStepResponse: sinon.stub()
    };
    
    // 创建Spec对象的模拟
    specStub = {
      withHeaders: sinon.stub().returnsThis(),
      withForm: sinon.stub().returnsThis(),
      withJson: sinon.stub().returnsThis(),
      get: sinon.stub().returnsThis(),
      post: sinon.stub().returnsThis(),
      put: sinon.stub().returnsThis(),
      delete: sinon.stub().returnsThis(),
      patch: sinon.stub().returnsThis(),
      toss: sinon.stub().resolves({ statusCode: 200, json: { status: 'success' } })
    };
    
    // 让 getCurrentSpec 返回模拟的 spec 对象
    worldStub.getCurrentSpec.returns(specStub);
    
    // 模拟 sendRequest 函数
    sendRequestStub = sandbox.stub(stepHelpers, 'sendRequest').resolves({ 
      statusCode: 200, 
      json: { status: 'success', data: {} } 
    });
    
    // 模拟 getPolyvMD5Sign 函数
    getPolyvMD5SignStub = sandbox.stub(apiHelpers, 'getPolyvMD5Sign').returns('test_sign');
  });
  
  afterEach(() => {
    // 清理沙盒
    sandbox.restore();
  });
  
  it('应该正确处理GET请求（JSON内容类型）', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'USER.GET_INFO';
    
    // 调用函数，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    expect(getPolyvMD5SignStub.calledOnce).to.be.true;
    
    // 验证URL和方法
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    expect(sendRequestArgs[1]).to.equal('GET'); // 方法
    expect(sendRequestArgs[2]).to.include('/live/v3/user/get-info'); // URL
    expect(sendRequestArgs[2]).to.include('appId=test_app_id'); // 参数
    expect(sendRequestArgs[2]).to.include('userId=test_user_id'); // 参数
    expect(sendRequestArgs[2]).to.include('sign=test_sign'); // 签名
    
    // 验证响应处理
    expect(worldStub.setStepResponse.calledOnce).to.be.true;
    expect(worldStub.context.queryParams).to.deep.equal({});
    expect(worldStub.context.formData).to.deep.equal({});
    expect(worldStub.context.jsonData).to.deep.equal({});
    expect(worldStub.context.useFormData).to.be.false;
  });
  
  it('应该正确处理POST请求（JSON内容类型）', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'CHANNEL.CREATE';
    
    // 设置JSON数据
    worldStub.context.jsonData = { name: 'Test Channel', desc: 'Test Description' };
    
    // 调用函数，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    expect(getPolyvMD5SignStub.calledOnce).to.be.true;
    
    // 验证URL和方法
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    expect(sendRequestArgs[1]).to.equal('POST'); // 方法
    expect(sendRequestArgs[2]).to.include('/live/v4/channel/create'); // URL
    expect(sendRequestArgs[2]).to.include('appId=test_app_id'); // 参数
    expect(sendRequestArgs[2]).to.include('userId=test_user_id'); // 参数
    expect(sendRequestArgs[2]).to.include('sign=test_sign'); // 签名
    
    // 验证JSON数据处理
    const options = sendRequestArgs[4];
    expect(options.contentType).to.equal('application/json');
    expect(options.withJson).to.deep.equal({ name: 'Test Channel', desc: 'Test Description' });
    
    // 验证响应处理
    expect(worldStub.setStepResponse.calledOnce).to.be.true;
    expect(worldStub.context.queryParams).to.deep.equal({});
    expect(worldStub.context.formData).to.deep.equal({});
    expect(worldStub.context.jsonData).to.deep.equal({});
    expect(worldStub.context.useFormData).to.be.false;
  });
  
  it('应该正确处理POST请求（表单内容类型）', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'USER.GLOBAL_SETTING_PV_SHOW_UPDATE';
    
    // 设置表单数据
    worldStub.context.formData = { show: 'Y' };
    worldStub.context.useFormData = true;
    
    // 调用函数，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    expect(getPolyvMD5SignStub.calledOnce).to.be.true;
    
    // 验证URL和方法
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    expect(sendRequestArgs[1]).to.equal('POST'); // 方法
    expect(sendRequestArgs[2]).to.include('/live/v4/user/global-setting/pv-show/update'); // URL
    expect(sendRequestArgs[2]).to.include('appId=test_app_id'); // 参数
    expect(sendRequestArgs[2]).to.include('userId=test_user_id'); // 参数
    expect(sendRequestArgs[2]).to.include('show=Y'); // 表单参数
    expect(sendRequestArgs[2]).to.include('sign=test_sign'); // 签名
    
    // 验证表单数据处理
    const options = sendRequestArgs[4];
    expect(options.contentType).to.equal('application/x-www-form-urlencoded');
    
    // 验证响应处理
    expect(worldStub.setStepResponse.calledOnce).to.be.true;
    expect(worldStub.context.queryParams).to.deep.equal({});
    expect(worldStub.context.formData).to.deep.equal({});
    expect(worldStub.context.jsonData).to.deep.equal({});
    expect(worldStub.context.useFormData).to.be.false;
  });
  
  it('应该正确处理带查询参数的GET请求', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'CHANNEL.DETAIL';
    
    // 设置查询参数
    worldStub.context.queryParams = { channelId: '123456' };
    
    // 调用函数，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    expect(getPolyvMD5SignStub.calledOnce).to.be.true;
    
    // 验证URL和方法
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    expect(sendRequestArgs[1]).to.equal('GET'); // 方法
    expect(sendRequestArgs[2]).to.include('/live/v4/channel/basic/get'); // URL
    expect(sendRequestArgs[2]).to.include('appId=test_app_id'); // 参数
    expect(sendRequestArgs[2]).to.include('userId=test_user_id'); // 参数
    expect(sendRequestArgs[2]).to.include('channelId=123456'); // 查询参数
    expect(sendRequestArgs[2]).to.include('sign=test_sign'); // 签名
    
    // 验证响应处理
    expect(worldStub.setStepResponse.calledOnce).to.be.true;
    expect(worldStub.context.queryParams).to.deep.equal({});
    expect(worldStub.context.formData).to.deep.equal({});
    expect(worldStub.context.jsonData).to.deep.equal({});
    expect(worldStub.context.useFormData).to.be.false;
  });
  
  it('应该正确处理带路径参数的API', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'CHANNEL.GET_SPLASH';
    
    // 设置路径参数到上下文
    worldStub.context.channelId = '789012';
    
    // 调用函数，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    expect(getPolyvMD5SignStub.calledOnce).to.be.true;
    
    // 验证URL和方法 - 应该已正确替换路径参数
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    expect(sendRequestArgs[1]).to.equal('GET'); // 方法
    expect(sendRequestArgs[2]).to.include('/live/v2/channelSetting/789012/getSplash'); // URL含路径参数
    
    // 验证响应处理
    expect(worldStub.setStepResponse.calledOnce).to.be.true;
  });
  
  it('应该正确处理方法覆盖', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'USER.GET_INFO';
    const methodOverride = 'POST';
    
    // 调用函数，覆盖GET方法为POST，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, methodOverride, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    
    // 验证URL和方法 - 应该使用覆盖的方法
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    expect(sendRequestArgs[1]).to.equal('POST'); // 方法应该是覆盖后的值
  });
  
  it('应该处理错误API配置', async () => {
    // 使用不存在的API配置
    const apiKey = 'NONEXISTENT.API';
    
    try {
      // 调用函数，应该抛出错误，使用环境变量存根替代process.env
      await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
      expect.fail('应该抛出错误');
    } catch (error: any) {
      expect(error.message).to.include('未找到API配置');
    }
  });
  
  it('应该处理数组类型的JSON请求体', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'CHANNEL.CREATE';
    
    // 设置JSON数据为数组
    worldStub.context.jsonData = [{ name: 'Item1' }, { name: 'Item2' }];
    
    // 调用函数，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    expect(getPolyvMD5SignStub.calledOnce).to.be.true;
    
    // 验证URL和方法
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    expect(sendRequestArgs[1]).to.equal('POST'); // 方法
    
    // 验证JSON数据处理 - 应直接使用数组
    const options = sendRequestArgs[4];
    expect(options.contentType).to.equal('application/json');
    expect(options.withJson).to.deep.equal([{ name: 'Item1' }, { name: 'Item2' }]);
  });
  
  it('应该当spec为null时抛出错误', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'USER.GET_INFO';
    
    // 设置getCurrentSpec返回null
    worldStub.getCurrentSpec.returns(null);
    
    try {
      // 调用函数，应该抛出错误
      await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
      // 如果没有抛出错误，测试应该失败
      expect.fail('应该抛出错误但没有');
    } catch (error: any) {
      expect(error.message).to.equal('无法创建有效的请求规范(spec)对象');
    }
  });
  
  it('应该处理未找到路径参数值的情况', async () => {
    // 创建一个带有路径参数的API
    const apiKey = 'CHANNEL.GET_SPLASH';
    
    // 创建console.warn的模拟，捕获警告
    const consoleWarnStub = sandbox.stub(console, 'warn');
    
    // 不设置路径参数的值，应该触发警告
    
    // 调用函数
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 验证警告被记录
    expect(consoleWarnStub.called).to.be.true;
    expect(consoleWarnStub.getCall(0).args[0]).to.include('未找到路径参数');
  });
  
  it('应该处理userId在路径中的情况', async () => {
    // 模拟一个包含:userId的API配置
    const apiKeyWithUserId = 'USER.GET_USER_PROFILE';
    
    // 设置API配置mock
    const originalUrls = { ...urls.API_URLS };
    sandbox.stub(urls, 'API_URLS').value({
      USER: {
        GET_USER_PROFILE: {
          method: 'GET',
          path: '/live/v3/user/:userId/profile',
          contentType: urls.ContentType.JSON
        }
      }
    });
    
    // 调用函数
    const response = await handleApiRequestCore(worldStub, apiKeyWithUserId, undefined, envStub);
    
    // 验证URL中应该已包含userId作为路径参数，但不应包含在查询参数中
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    const url = sendRequestArgs[2];
    expect(url).to.include('/live/v3/user/test_user_id/profile');
    
    // 检查查询参数中不应该包含userId
    const urlObj = new URL(url);
    expect([...urlObj.searchParams.keys()]).to.not.include('userId');
  });
  
  it('应该处理sendRequest函数抛出的错误', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'USER.GET_INFO';
    
    // 设置sendRequest抛出错误
    sendRequestStub.rejects(new Error('网络错误'));
    
    // 创建console.error的模拟
    const consoleErrorStub = sandbox.stub(console, 'error');
    
    try {
      // 调用函数，应该抛出错误
      await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
      // 如果没有抛出错误，测试应该失败
      expect.fail('应该抛出错误但没有');
    } catch (error: any) {
      // 验证错误被正确捕获并重新抛出
      expect(error.message).to.equal('网络错误');
      // 验证错误被记录
      expect(consoleErrorStub.calledOnce).to.be.true;
      console.log('请求失败:', error);
    }
  });
  
  it('应该正确处理带有空值的查询参数', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'CHANNEL.DETAIL';
    
    // 设置包含空值的查询参数
    worldStub.context.queryParams = { 
      channelId: '123456',
      emptyParam: null,
      undefinedParam: undefined,
      validParam: 'value'
    };
    
    // 调用函数，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    
    // 验证URL和方法 - 应该只包含非空查询参数
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    const url = sendRequestArgs[2];
    
    // 验证URL中只包含有效值的参数
    expect(url).to.include('channelId=123456');
    expect(url).to.include('validParam=value');
    
    // 验证URL中不包含空值参数
    expect(url).to.not.include('emptyParam');
    expect(url).to.not.include('undefinedParam');
  });
  
  it('应该正确处理表单请求中的空值参数', async () => {
    // 使用已存在的API配置进行测试
    const apiKey = 'USER.GLOBAL_SETTING_PV_SHOW_UPDATE';
    
    // 设置表单数据，包含空值
    worldStub.context.formData = { 
      show: 'Y',
      emptyParam: null,
      undefinedParam: undefined
    };
    worldStub.context.useFormData = true;
    
    // 设置查询参数，也包含空值
    worldStub.context.queryParams = {
      validQuery: 'query-value',
      nullQuery: null
    };
    
    // 调用函数，使用环境变量存根替代process.env
    const response = await handleApiRequestCore(worldStub, apiKey, undefined, envStub);
    
    // 断言
    expect(sendRequestStub.calledOnce).to.be.true;
    
    // 验证URL和方法 - 应该只包含非空参数
    const sendRequestArgs = sendRequestStub.getCall(0).args;
    const url = sendRequestArgs[2];
    
    // 验证URL中包含有效值的参数
    expect(url).to.include('show=Y');
    expect(url).to.include('validQuery=query-value');
    
    // 验证URL中不包含空值参数
    expect(url).to.not.include('emptyParam');
    expect(url).to.not.include('undefinedParam');
    expect(url).to.not.include('nullQuery');
  });
}); 