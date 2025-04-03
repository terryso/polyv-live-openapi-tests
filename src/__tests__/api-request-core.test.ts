import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as dotenv from 'dotenv';
import { URL } from 'url';

// 导入被测试的模块
import { handleApiRequestCore } from '../utils/api-request-core';
import * as apiHelpers from '../utils/api-helpers';
import * as stepHelpers from '../utils/step-helpers';
import * as debugUtils from '../utils/debug';
import { CustomWorld } from '../support/world';

// 模拟API_URLS
const mockApiUrls = {
  mock: {
    test: {
      path: '/mock/test',
      method: 'GET',
      contentType: 'application/json'
    },
    testPost: {
      path: '/mock/test-post',
      method: 'POST',
      contentType: 'application/json'
    },
    testWithParams: {
      path: '/mock/:userId/test/:paramId',
      method: 'GET',
      contentType: 'application/json'
    },
    testFormData: {
      path: '/mock/form-data',
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded'
    },
    testFileUpload: {
      path: '/mock/file-upload',
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded'
    }
  }
};

describe('API Request Core', () => {
  let sandbox: sinon.SinonSandbox;
  let mockWorld: CustomWorld;
  let mockSpec: any;
  let originalApiUrls: any;
  let mockEnv: Record<string, string | undefined>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // 模拟CustomWorld
    mockWorld = {
      context: {
        queryParams: {},
        jsonData: {},
        formData: {}
      },
      getCurrentSpec: () => mockSpec,
      currentSpec: null,
      // 添加缺少的方法
      getCurrentStepNumber: () => 1,
      stepResponses: new Map(),
      currentStepNumber: 1,
      sessionId: 'test-session-id',
      error: null,
      setStepResponse: () => {},
      getStepResponse: () => undefined,
      getValueFromStepResponse: () => undefined,
      getLastResponse: () => undefined,
      createNewSpec: () => mockSpec,
      clearAllData: () => {}
    } as any;

    // 模拟pactum spec
    mockSpec = {
      withHeaders: sandbox.stub().returnsThis(),
      withBody: sandbox.stub().returnsThis(),
      post: sandbox.stub().returnsThis(),
      put: sandbox.stub().returnsThis(),
      get: sandbox.stub().returnsThis(),
      delete: sandbox.stub().returnsThis(),
      toss: sandbox.stub().resolves({ statusCode: 200, body: { success: true } })
    };

    // 保存并替换原始API_URLS
    originalApiUrls = require('../api/urls').API_URLS;
    const urlsModule = require('../api/urls');
    urlsModule.API_URLS = mockApiUrls;
    sandbox.stub(urlsModule, 'getFullUrl').callsFake((config: any, pathParams: any) => {
      // 实现一个简单的路径参数替换逻辑
      let url = `http://mock-api.polyv.net${config.path}`;
      if (pathParams) {
        Object.entries(pathParams).forEach(([key, value]) => {
          url = url.replace(`:${key}`, value as string);
        });
      }
      return url;
    });

    // 模拟环境变量
    mockEnv = {
      POLYV_APP_ID: 'test-app-id',
      POLYV_APP_SECRET: 'test-app-secret',
      POLYV_USER_ID: 'test-user-id'
    };

    // 模拟MD5签名函数
    sandbox.stub(apiHelpers, 'getPolyvMD5Sign').returns('mock-sign');

    // 模拟发送请求函数
    sandbox.stub(stepHelpers, 'sendRequest').resolves({ statusCode: 200, body: { success: true } });

    // 模拟数组参数处理函数
    sandbox.stub(stepHelpers, 'processArrayParameters').callsFake(obj => obj);

    // 模拟日志函数
    sandbox.stub(debugUtils, 'logDebug');
    sandbox.stub(debugUtils, 'logApiRequest');
    sandbox.stub(debugUtils, 'logApiResponse');
    sandbox.stub(debugUtils, 'logError');

    // 模拟console.warn
    sandbox.stub(console, 'warn');
  });

  afterEach(() => {
    // 恢复所有的存根
    sandbox.restore();
    
    // 恢复原始API_URLS
    require('../api/urls').API_URLS = originalApiUrls;
  });

  describe('handleApiRequestCore', () => {
    it('应该处理基本的GET请求', async () => {
      const response = await handleApiRequestCore(mockWorld, 'mock.test', undefined, mockEnv);
      
      expect(response).to.deep.equal({ statusCode: 200, body: { success: true } });
      sinon.assert.calledOnce(stepHelpers.sendRequest as sinon.SinonStub);
      const [world, method, url] = (stepHelpers.sendRequest as sinon.SinonStub).args[0];
      
      expect(method).to.equal('GET');
      expect(url.startsWith('http://mock-api.polyv.net/mock/test')).to.be.true;
      expect(url.includes('appId=test-app-id')).to.be.true;
      expect(url.includes('timestamp=')).to.be.true;
      expect(url.includes('userId=test-user-id')).to.be.true;
      expect(url.includes('sign=mock-sign')).to.be.true;
    });

    it('应该处理带方法覆盖的请求', async () => {
      await handleApiRequestCore(mockWorld, 'mock.test', 'POST', mockEnv);
      
      const [world, method] = (stepHelpers.sendRequest as sinon.SinonStub).args[0];
      expect(method).to.equal('POST');
    });

    it('应该处理带JSON数据的POST请求', async () => {
      mockWorld.context.jsonData = { key: 'value', nested: { prop: 'test' } };
      
      await handleApiRequestCore(mockWorld, 'mock.testPost', undefined, mockEnv);
      
      const [world, method, url, spec, options] = (stepHelpers.sendRequest as sinon.SinonStub).args[0];
      
      expect(method).to.equal('POST');
      expect(options).to.deep.include({
        contentType: 'application/json',
        withJson: { key: 'value', nested: { prop: 'test' } }
      });
    });

    it('应该处理数组类型的JSON数据', async () => {
      mockWorld.context.jsonData = [{ id: 1 }, { id: 2 }];
      
      await handleApiRequestCore(mockWorld, 'mock.testPost', undefined, mockEnv);
      
      const [world, method, url, spec, options] = (stepHelpers.sendRequest as sinon.SinonStub).args[0];
      
      expect(options).to.deep.include({
        contentType: 'application/json',
        withJson: [{ id: 1 }, { id: 2 }]
      });
    });

    it('应该处理带路径参数的请求', async () => {
      // 设置路径参数
      mockWorld.context.userId = 'context-user-id';
      mockWorld.context.paramId = 'param-123';
      
      await handleApiRequestCore(mockWorld, 'mock.testWithParams', undefined, mockEnv);
      
      const [world, method, url] = (stepHelpers.sendRequest as sinon.SinonStub).args[0];

      // 检查URL中是否包含正确的路径参数
      expect(url).to.include('context-user-id');
      expect(url).to.include('param-123');
    });

    it('应该从环境变量获取路径参数', async () => {
      // 移除上下文中的路径参数
      mockWorld.context = { queryParams: {}, jsonData: {} };
      
      // 设置环境变量中的路径参数
      const envWithParams = {
        ...mockEnv,
        POLYV_PARAM_ID: 'env-param-123'
      };
      
      await handleApiRequestCore(mockWorld, 'mock.testWithParams', undefined, envWithParams);
      
      const [world, method, url] = (stepHelpers.sendRequest as sinon.SinonStub).args[0];
      
      // 检查URL中是否包含从环境变量获取的路径参数
      expect(url).to.include('test-user-id');
      expect(url).to.include('env-param-123');
    });

    it('应该在找不到API配置时抛出错误', async () => {
      try {
        await handleApiRequestCore(mockWorld, 'nonexistent.api', undefined, mockEnv);
        // 如果执行到这里，测试失败
        expect.fail('应该抛出错误');
      } catch (error: any) {
        expect(error.message).to.include('未找到API配置');
      }
    });

    it('应该在缺少必要环境变量时抛出错误', async () => {
      const incompleteEnv = { POLYV_APP_ID: 'test-app-id' }; // 缺少APP_SECRET
      
      try {
        await handleApiRequestCore(mockWorld, 'mock.test', undefined, incompleteEnv);
        expect.fail('应该抛出错误');
      } catch (error: any) {
        expect(error.message).to.include('未配置POLYV_APP_ID或POLYV_APP_SECRET环境变量');
      }
    });

    it('应该处理表单数据的POST请求', async () => {
      mockWorld.context.formData = { field1: 'value1', field2: 'value2' };
      
      await handleApiRequestCore(mockWorld, 'mock.testFormData', undefined, mockEnv);
      
      // 验证发送的请求
      sinon.assert.calledOnce(stepHelpers.sendRequest as sinon.SinonStub);
    });

    it('应该处理文件上传请求', async () => {
      // 模拟文件上传场景
      mockWorld.context.isFileUpload = true;
      mockWorld.context.formDataBuffer = Buffer.from('mock-file-data');
      mockWorld.context.formDataBoundary = 'mock-boundary';
      
      // 替换spec.toss方法以模拟上传后的响应
      mockSpec.toss = sandbox.stub().resolves({ statusCode: 200, body: { fileUrl: 'http://example.com/file.jpg' } });
      
      const response = await handleApiRequestCore(mockWorld, 'mock.testFileUpload', undefined, mockEnv);
      
      // 验证请求头和请求体调用
      sinon.assert.called(mockSpec.withHeaders as sinon.SinonStub);
      sinon.assert.called(mockSpec.withBody as sinon.SinonStub);
      sinon.assert.called(mockSpec.post as sinon.SinonStub);
      sinon.assert.called(mockSpec.toss as sinon.SinonStub);
      
      // 验证响应
      expect(response).to.deep.equal({ statusCode: 200, body: { fileUrl: 'http://example.com/file.jpg' } });
    });
  });
}); 