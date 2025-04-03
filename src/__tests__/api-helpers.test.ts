import * as sinon from 'sinon';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import * as apiHelpers from '../utils/api-helpers'; // 导入整个模块
import 'mocha';

// 解构导入函数和常量
import {
  concatPolyvParams,
  md5Hex,
  sha256Hex,
  getPolyvMD5Sign,
  getPolyvSHA256Sign,
  cleanDynamicFields,
  deepMatch,
  SNAPSHOT_DIR,
  ensureSnapshotDirExists,
  getSnapshotFilePath,
  saveSnapshot,
  loadSnapshot,
  isSnapshotUpdateMode,
  processValue
} from '../utils/api-helpers';

describe('API 辅助函数测试', () => {
  describe('concatPolyvParams函数', () => {
    it('应该正确连接有序参数', () => {
      const params = {
        appId: 'testAppId',
        timestamp: '1234567890',
        userId: 'testUserId'
      };
      
      const result = concatPolyvParams(params);
      expect(result).to.equal('appIdtestAppIdtimestamp1234567890userIdtestUserId');
    });
    
    it('应该跳过空值参数', () => {
      const params = {
        appId: 'testAppId',
        emptyParam: '',
        nullParam: null as any,
        undefinedParam: undefined as any,
        timestamp: '1234567890'
      };
      
      const result = concatPolyvParams(params);
      expect(result).to.equal('appIdtestAppIdtimestamp1234567890');
    });
    
    it('应该按字母顺序排序键名', () => {
      const params = {
        userId: 'testUserId',
        appId: 'testAppId',
        timestamp: '1234567890'
      };
      
      const result = concatPolyvParams(params);
      expect(result).to.equal('appIdtestAppIdtimestamp1234567890userIdtestUserId');
    });
  });
  
  describe('MD5和SHA256加密函数', () => {
    it('md5Hex应该返回正确的MD5哈希值', () => {
      const text = 'test';
      const expectedHash = '098f6bcd4621d373cade4e832627b4f6'; // 已知'test'的MD5哈希值
      
      const result = md5Hex(text);
      expect(result).to.equal(expectedHash);
    });
    
    it('sha256Hex应该返回正确的SHA256哈希值', () => {
      const text = 'test';
      const expectedHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'; // 已知'test'的SHA256哈希值
      
      const result = sha256Hex(text);
      expect(result).to.equal(expectedHash);
    });
  });
  
  describe('保利威签名函数', () => {
    it('getPolyvMD5Sign应该计算正确的MD5签名', () => {
      const params = {
        appId: 'testAppId',
        timestamp: '1234567890'
      };
      const appSecret = 'testAppSecret';
      
      // 手动计算预期结果: MD5(testAppSecret + appIdtestAppIdtimestamp1234567890 + testAppSecret)
      const expectedPlain = 'testAppSecretappIdtestAppIdtimestamp1234567890testAppSecret';
      const expectedSign = md5Hex(expectedPlain).toUpperCase();
      
      const result = getPolyvMD5Sign(params, appSecret);
      expect(result).to.equal(expectedSign);
    });
    
    it('getPolyvSHA256Sign应该计算正确的SHA256签名', () => {
      const params = {
        appId: 'testAppId',
        timestamp: '1234567890'
      };
      const appSecret = 'testAppSecret';
      
      // 手动计算预期结果: SHA256(testAppSecret + appIdtestAppIdtimestamp1234567890 + testAppSecret)
      const expectedPlain = 'testAppSecretappIdtestAppIdtimestamp1234567890testAppSecret';
      const expectedSign = sha256Hex(expectedPlain).toUpperCase();
      
      const result = getPolyvSHA256Sign(params, appSecret);
      expect(result).to.equal(expectedSign);
    });
  });
  
  describe('cleanDynamicFields函数', () => {
    it('应该删除所有忽略的字段', () => {
      const testObject = {
        id: 123,
        name: 'test',
        requestId: 'abc123',
        timestamp: 1234567890,
        authToken: 'token123',
        aiChatToken: 'chat123',
        data: {
          id: 456,
          requestId: 'xyz789',
          details: 'some details'
        }
      };
      
      const cleanedObject = cleanDynamicFields(testObject);
      
      // 验证顶层字段
      expect(cleanedObject).to.have.property('id', 123);
      expect(cleanedObject).to.have.property('name', 'test');
      expect(cleanedObject).to.not.have.property('requestId');
      expect(cleanedObject).to.not.have.property('timestamp');
      expect(cleanedObject).to.not.have.property('authToken');
      expect(cleanedObject).to.not.have.property('aiChatToken');
      
      // 验证嵌套字段
      expect(cleanedObject.data).to.have.property('id', 456);
      expect(cleanedObject.data).to.have.property('details', 'some details');
      expect(cleanedObject.data).to.not.have.property('requestId');
    });
    
    it('应该返回非对象值的原始值', () => {
      expect(cleanDynamicFields('string')).to.equal('string');
      expect(cleanDynamicFields(123)).to.equal(123);
      expect(cleanDynamicFields(null)).to.equal(null);
      expect(cleanDynamicFields(undefined)).to.equal(undefined);
    });
    
    it('应该正确处理数组', () => {
      const testArray = [
        { id: 1, requestId: 'req1' },
        { id: 2, timestamp: 123 },
        { id: 3, authToken: 'token' }
      ];
      
      const cleanedArray = cleanDynamicFields(testArray);
      
      expect(cleanedArray).to.be.an('array').with.lengthOf(3);
      expect(cleanedArray[0]).to.have.property('id', 1);
      expect(cleanedArray[0]).to.not.have.property('requestId');
      expect(cleanedArray[1]).to.have.property('id', 2);
      expect(cleanedArray[1]).to.not.have.property('timestamp');
      expect(cleanedArray[2]).to.have.property('id', 3);
      expect(cleanedArray[2]).to.not.have.property('authToken');
    });
  });
  
  describe('deepMatch函数', () => {
    it('应该匹配简单相等的值', () => {
      expect(deepMatch('test', 'test').match).to.be.true;
      expect(deepMatch(123, 123).match).to.be.true;
      expect(deepMatch(true, true).match).to.be.true;
    });
    
    it('应该匹配通配符值', () => {
      expect(deepMatch('any string', '*').match).to.be.true;
      expect(deepMatch(123, '*').match).to.be.true;
      expect(deepMatch({ complex: 'object' }, '*').match).to.be.true;
    });
    
    it('应该匹配字符串部分通配符', () => {
      expect(deepMatch('hello world', '*world').match).to.be.true;
      expect(deepMatch('hello world', 'hello*').match).to.be.true;
      expect(deepMatch('hello wonderful world', '*wonder*').match).to.be.true;
    });
    
    it('应该处理环境变量引用', () => {
      // 模拟环境变量
      const originalEnv = process.env;
      process.env = { ...originalEnv, TEST_VAR: 'test-value' };
      
      const result = deepMatch('test-value', '{env.TEST_VAR}');
      expect(result.match).to.be.true;
      
      // 恢复环境变量
      process.env = originalEnv;
    });
    
    it('应该处理上下文引用', () => {
      const context = { testKey: 'test-value' };
      
      const result = deepMatch('test-value', '{context.testKey}', '', context);
      expect(result.match).to.be.true;
    });
    
    it('应该匹配对象结构', () => {
      const actual = {
        id: 123,
        name: 'test',
        details: {
          age: 30,
          active: true
        }
      };
      
      const expected = {
        id: 123,
        name: 'test',
        details: {
          age: 30,
          active: true
        }
      };
      
      expect(deepMatch(actual, expected).match).to.be.true;
    });
    
    it('应该匹配对象的部分结构', () => {
      const actual = {
        id: 123,
        name: 'test',
        extra: 'field',
        details: {
          age: 30,
          active: true,
          extra: 'nested'
        }
      };
      
      const expected = {
        id: 123,
        name: 'test',
        details: {
          age: '*',
          active: true
        }
      };
      
      expect(deepMatch(actual, expected).match).to.be.true;
    });
    
    it('应该正确报告不匹配', () => {
      const actual = {
        id: 123,
        name: 'test'
      };
      
      const expected = {
        id: 456,
        name: 'test'
      };
      
      const result = deepMatch(actual, expected);
      expect(result.match).to.be.false;
      expect(result.message).to.include('id');
    });
  });

  // 添加快照相关测试
  describe('快照处理函数', () => {
    describe('SNAPSHOT_DIR 常量', () => {
      let originalNodeEnv: string | undefined;

      beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
      });

      afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
      });

      it('应该根据环境变量定义正确的快照目录路径', () => {
        // 测试环境
        process.env.NODE_ENV = 'test';
        const testPath = path.join(process.cwd(), 'test-snapshots');
        expect(apiHelpers.getSnapshotDir()).to.equal(testPath);

        // 非测试环境
        process.env.NODE_ENV = 'production';
        const prodPath = path.join(process.cwd(), 'src', 'snapshots');
        expect(apiHelpers.getSnapshotDir()).to.equal(prodPath);

        // 恢复测试环境
        process.env.NODE_ENV = 'test';
      });
    });

    describe('ensureSnapshotDirExists 函数', () => {
      let originalNodeEnv: string | undefined;
      let testDir: string;

      beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        testDir = path.join(process.cwd(), 'test-snapshots');
        
        // 确保目录不存在
        if (fs.existsSync(testDir)) {
          fs.rmdirSync(testDir, { recursive: true });
        }
      });

      afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        // 清理测试目录
        if (fs.existsSync(testDir)) {
          fs.rmdirSync(testDir, { recursive: true });
        }
      });

      it('应该在目录不存在时创建目录', () => {
        ensureSnapshotDirExists();
        expect(fs.existsSync(testDir)).to.be.true;
      });

      it('应该在目录已存在时不执行任何操作', () => {
        // 先创建目录
        fs.mkdirSync(testDir, { recursive: true });
        expect(() => ensureSnapshotDirExists()).not.to.throw();
      });

      it('应该在创建目录失败时抛出错误并记录日志', () => {
        // 模拟目录创建失败
        const error = new Error('创建目录失败');
        const mkdirStub = sinon.stub(fs, 'mkdirSync').throws(error);

        expect(() => ensureSnapshotDirExists()).to.throw('创建目录失败');
        
        mkdirStub.restore();
      });
    });
    
    describe('getSnapshotFilePath 函数', () => {
      it('应该返回正确的快照文件路径', () => {
        const snapshotName = 'test-snapshot';
        const expectedPath = path.join(process.cwd(), 'test-snapshots', `${snapshotName}.json`);
        
        const result = getSnapshotFilePath(snapshotName);
        
        expect(result).to.equal(expectedPath);
      });
    });
    
    describe('saveSnapshot 函数', () => {
      let originalNodeEnv: string | undefined;
      let testDir: string;

      beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        testDir = path.join(process.cwd(), 'test-snapshots');
        
        // 确保目录存在
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
      });

      afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        // 清理测试目录
        if (fs.existsSync(testDir)) {
          fs.rmdirSync(testDir, { recursive: true });
        }
      });

      it('应该保存清理后的响应数据', () => {
        const response = { data: 'test', timestamp: Date.now() };
        saveSnapshot('test', response);
        
        const filePath = getSnapshotFilePath('test');
        expect(fs.existsSync(filePath)).to.be.true;
        
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content).to.deep.equal(cleanDynamicFields(response));
      });

      it('应该在保存失败时抛出错误并记录日志', () => {
        const writeStub = sinon.stub(fs, 'writeFileSync').throws(new Error('写入失败'));
        
        expect(() => saveSnapshot('test', { data: 'test' }))
          .to.throw('写入失败');
        
        writeStub.restore();
      });
    });
    
    describe('loadSnapshot 函数', () => {
      let originalNodeEnv: string | undefined;
      let testDir: string;

      beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        testDir = path.join(process.cwd(), 'test-snapshots');
        
        // 确保目录存在
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
      });

      afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        // 清理测试目录
        if (fs.existsSync(testDir)) {
          fs.rmdirSync(testDir, { recursive: true });
        }
      });

      it('应该加载快照内容', () => {
        const snapshotName = 'test-snapshot';
        const snapshotPath = path.join(SNAPSHOT_DIR, `${snapshotName}.json`);
        const snapshotData = { data: 'test data' };
        
        // 确保目录存在
        const snapshotDir = path.dirname(snapshotPath);
        if (!fs.existsSync(snapshotDir)) {
          fs.mkdirSync(snapshotDir, { recursive: true });
        }
        
        // 直接写入文件
        fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData));
        
        // 确认文件确实存在
        expect(fs.existsSync(snapshotPath)).to.be.true;
        
        const result = loadSnapshot(snapshotName);
        
        expect(result).to.deep.equal(snapshotData);
      });
      
      it('应该在快照文件不存在时抛出错误', () => {
        const snapshotName = 'non-existent-snapshot';
        
        expect(() => loadSnapshot(snapshotName)).to.throw('快照文件不存在');
      });
    });
    
    describe('isSnapshotUpdateMode 函数', () => {
      let originalEnv: typeof process.env;
      
      beforeEach(() => {
        originalEnv = { ...process.env };
      });
      
      afterEach(() => {
        process.env = originalEnv;
      });
      
      it('应该在环境变量为true时返回true', () => {
        process.env.UPDATE_SNAPSHOTS = 'true';
        expect(isSnapshotUpdateMode()).to.be.true;
      });
      
      it('应该在环境变量不为true时返回false', () => {
        process.env.UPDATE_SNAPSHOTS = 'false';
        expect(isSnapshotUpdateMode()).to.be.false;
        
        delete process.env.UPDATE_SNAPSHOTS;
        expect(isSnapshotUpdateMode()).to.be.false;
      });
    });
  });
  
  describe('processValue 函数', () => {
    let clock: sinon.SinonFakeTimers;
    
    beforeEach(() => {
      // 固定时间以便测试
      clock = sinon.useFakeTimers(new Date('2023-01-01').getTime());
    });
    
    afterEach(() => {
      clock.restore();
    });
    
    it('应该替换字符串中的{now}标记为时间戳', () => {
      const value = 'prefix-{now}-suffix';
      const context = {};
      
      const result = processValue(value, context);
      
      const expectedTimestamp = Date.now().toString();
      expect(result).to.equal(`prefix-${expectedTimestamp}-suffix`);
    });
    
    it('应该使用上下文中的timestamp（如果存在）', () => {
      const value = 'prefix-{now}-suffix';
      const context = { timestamp: 1234567890 };
      
      const result = processValue(value, context);
      
      expect(result).to.equal('prefix-1234567890-suffix');
    });
    
    it('应该对非字符串值原样返回', () => {
      const inputs = [null, undefined, 123, true, { key: 'value' }, ['item']];
      const context = {};
      
      inputs.forEach(input => {
        const result = processValue(input, context);
        expect(result).to.equal(input);
      });
    });
    
    it('应该对不包含{now}的字符串原样返回', () => {
      const value = 'normal string without placeholder';
      const context = {};
      
      const result = processValue(value, context);
      
      expect(result).to.equal(value);
    });
  });
  
  describe('deepMatch 函数 - 高级场景', () => {
    it('应该处理对象内的多种模式匹配', () => {
      const actual = {
        id: 123,
        name: 'test-product',
        description: 'This is a test product',
        tags: ['test', 'product', 'sample'],
        nested: {
          id: 456,
          value: 'nested value'
        }
      };
      
      const expected = {
        id: 123,
        name: 'test*',
        description: '*test*',
        nested: {
          id: '*',
          value: '*value'
        }
      };
      
      const result = deepMatch(actual, expected);
      expect(result.match).to.be.true;
    });
    
    it('应该处理数组内的任意通配符', () => {
      const actual = {
        items: ['apple', 'banana', 'orange']
      };
      
      const expected = {
        items: ['*', 'banana', '*']
      };
      
      const result = deepMatch(actual, expected);
      expect(result.match).to.be.true;
    });
    
    it('应该处理数组长度不匹配的情况', () => {
      const actual = {
        items: [1, 2, 3]
      };
      
      const expected = {
        items: [1, 2]
      };
      
      const result = deepMatch(actual, expected);
      expect(result.match).to.be.false;
      expect(result.message).to.include('数组长度不匹配');
    });
    
    it('应该处理类型不匹配的情况', () => {
      // 数组 vs 非数组
      let result = deepMatch([1, 2, 3], 'not an array');
      expect(result.match).to.be.false;
      expect(result.message).to.include('类型不匹配');
      
      // 对象 vs 非对象
      result = deepMatch({ key: 'value' }, 123);
      expect(result.match).to.be.false;
      expect(result.message).to.include('类型不匹配');
      
      // 对象 vs 数组
      result = deepMatch({ key: 'value' }, [1, 2, 3]);
      expect(result.match).to.be.false;
      expect(result.message).to.include('期望为数组');
      expect(result.message).to.include('对象');
    });
    
    it('应该处理缺少字段的情况', () => {
      const actual = {
        id: 123,
        name: 'test'
      };
      
      const expected = {
        id: 123,
        name: 'test',
        description: 'missing field'
      };
      
      const result = deepMatch(actual, expected);
      expect(result.match).to.be.false;
      expect(result.message).to.include('缺少字段');
      expect(result.message).to.include('description');
    });
    
    it('应该深入检查嵌套对象中的不匹配', () => {
      const actual = {
        id: 123,
        nested: {
          id: 456,
          value: 'wrong value'
        }
      };
      
      const expected = {
        id: 123,
        nested: {
          id: 456,
          value: 'correct value'
        }
      };
      
      const result = deepMatch(actual, expected);
      expect(result.match).to.be.false;
      expect(result.message).to.include('nested.value');
    });
  });

  describe('快照处理函数 - 错误处理', () => {
    let originalNodeEnv: string | undefined;
    let testDir: string;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      testDir = path.join(process.cwd(), 'test-snapshots');
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir, { recursive: true });
      }
    });

    it('应该在快照目录不存在且无法创建时抛出错误', () => {
      // 模拟目录创建失败
      const mkdirStub = sinon.stub(fs, 'mkdirSync').throws(new Error('权限不足'));
      
      expect(() => ensureSnapshotDirExists()).to.throw('权限不足');
      
      mkdirStub.restore();
    });

    it('应该在快照目录存在但无写入权限时抛出错误', () => {
      // 创建目录
      fs.mkdirSync(testDir, { recursive: true });
      
      // 模拟权限检查失败
      const accessStub = sinon.stub(fs, 'accessSync').throws(new Error('权限不足'));
      
      expect(() => ensureSnapshotDirExists()).to.throw('快照目录没有写入权限');
      
      accessStub.restore();
    });

    it('应该在保存快照时正确处理文件写入错误', () => {
      // 确保目录存在
      fs.mkdirSync(testDir, { recursive: true });
      
      // 模拟文件写入失败
      const writeStub = sinon.stub(fs, 'writeFileSync').throws(new Error('磁盘已满'));
      
      expect(() => saveSnapshot('test', { data: 'test' }))
        .to.throw('磁盘已满');
      
      writeStub.restore();
    });

    it('应该在加载快照时正确处理JSON解析错误', () => {
      // 确保目录存在
      fs.mkdirSync(testDir, { recursive: true });

      // 创建无效的JSON文件
      const snapshotPath = getSnapshotFilePath('test');
      fs.writeFileSync(snapshotPath, 'invalid json content');

      expect(() => loadSnapshot('test')).to.throw('Unexpected token');
    });
  });

  describe('deepMatch函数 - 边界情况', () => {
    it('应该处理null值比较', () => {
      expect(deepMatch(null, null).match).to.be.true;
      expect(deepMatch(undefined, null).match).to.be.false;
      expect(deepMatch({}, null).match).to.be.false;
    });

    it('应该处理环境变量不存在的情况', () => {
      const result = deepMatch('test', '{env.NON_EXISTENT_VAR}');
      expect(result.match).to.be.false;
      expect(result.message).to.include('环境变量');
    });

    it('应该处理上下文变量替换失败的情况', () => {
      const result = deepMatch('test', '{context.nonExistent}', '', {});
      expect(result.match).to.be.false;
      expect(result.message).to.include('值不匹配');
    });

    it('应该处理复杂的嵌套对象比较', () => {
      const actual = {
        array: [1, { nested: 'value' }],
        object: { deep: { deeper: null } }
      };
      
      const expected = {
        array: ['*', { nested: '*' }],
        object: { deep: { deeper: null } }
      };
      
      expect(deepMatch(actual, expected).match).to.be.true;
    });
  });
}); 