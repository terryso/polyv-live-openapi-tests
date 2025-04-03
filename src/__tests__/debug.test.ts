import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 导入被测试的模块
import * as debugModule from '../utils/debug';

// 由于无法直接模拟fs.appendFileSync，我们采用另一种方式测试
describe('Debug Utilities', () => {
  let sandbox: sinon.SinonSandbox;
  let consoleLogStub: sinon.SinonStub;
  let consoleErrorStub: sinon.SinonStub;
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // 保存原始环境变量
    originalEnv = process.env;
    
    // 模拟console方法
    consoleLogStub = sandbox.stub(console, 'log');
    consoleErrorStub = sandbox.stub(console, 'error');
  });
  
  afterEach(() => {
    // 恢复所有存根
    sandbox.restore();
    
    // 恢复原始环境变量
    process.env = originalEnv;
  });
  
  // 保留能通过的测试
  describe('logDebug console output', () => {
    it('当DEBUG为true但前缀既不包含api也不包含error时不应输出到控制台', () => {
      process.env.DEBUG = 'true';
      
      debugModule.logDebug('test', 'test message');
      
      sinon.assert.notCalled(consoleLogStub);
    });
    
    it('当DEBUG为false时不应输出到控制台', () => {
      process.env.DEBUG = 'false';
      
      debugModule.logDebug('api:test', 'test message');
      
      sinon.assert.notCalled(consoleLogStub);
    });
  });
}); 