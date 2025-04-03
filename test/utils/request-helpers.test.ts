import { expect } from 'chai';
import { 
  processJsonBody,
  processJsonTimestamps,
  processTableToJson,
  processTableToQueryParams,
  processTableToFormData
} from '../../src/utils/request-helpers';
import sinon from 'sinon';

// 创建自定义世界模拟对象
const createMockWorld = (contextData = {}) => {
  return {
    context: contextData,
    getCurrentSpec: () => ({}),
    getLastResponse: () => ({ json: {} }),
    getValueFromStepResponse: () => ({}),
    setContextData: () => {},
    setStepResponse: () => {},
    getCurrentStepNumber: () => 1
  };
};

describe('request-helpers 辅助函数测试', () => {
  let clock: sinon.SinonFakeTimers;
  
  beforeEach(() => {
    // 创建固定时间的时钟，使时间戳可预测
    clock = sinon.useFakeTimers(1617184000000); // 2021-03-31 12:00:00 UTC
  });
  
  afterEach(() => {
    // 恢复时钟
    clock.restore();
  });
  
  describe('processJsonBody', () => {
    it('应正确解析简单JSON字符串', () => {
      const jsonString = '{"name": "张三", "age": 30}';
      const result = processJsonBody(jsonString);
      expect(result).to.deep.equal({ name: '张三', age: 30 });
    });
    
    it('应处理JSON中的时间戳占位符', () => {
      const jsonString = '{"name": "测试-<timestamp>", "createdAt": "<timestamp>"}';
      const result = processJsonBody(jsonString);
      expect(result).to.deep.equal({ 
        name: '测试-1617184000000',
        createdAt: '1617184000000'
      });
    });
    
    it('应处理嵌套对象中的时间戳', () => {
      const jsonString = '{"user": {"name": "张三", "registeredAt": "<timestamp>"}}';
      const result = processJsonBody(jsonString);
      expect(result).to.deep.equal({ 
        user: {
          name: '张三',
          registeredAt: '1617184000000'
        }
      });
    });
    
    it('应处理数组中的时间戳', () => {
      const jsonString = '{"items": [{"id": "<timestamp>"}, {"id": "固定值"}]}';
      const result = processJsonBody(jsonString);
      expect(result).to.deep.equal({ 
        items: [
          { id: '1617184000000' },
          { id: '固定值' }
        ]
      });
    });
    
    it('应在解析错误时抛出异常', () => {
      const invalidJson = '{name: 张三}'; // 缺少引号的无效JSON
      expect(() => processJsonBody(invalidJson)).to.throw('无法解析JSON请求体');
    });

    it('应处理空JSON对象', () => {
      const emptyJson = '{}';
      const result = processJsonBody(emptyJson);
      expect(result).to.deep.equal({});
    });

    it('应处理JSON数组', () => {
      const jsonArray = '[1, 2, 3]';
      const result = processJsonBody(jsonArray);
      expect(result).to.deep.equal([1, 2, 3]);
    });

    it('应处理包含特殊值的JSON', () => {
      const specialJson = '{"nullValue": null, "boolValue": true, "numValue": 123.45}';
      const result = processJsonBody(specialJson);
      expect(result).to.deep.equal({
        nullValue: null,
        boolValue: true,
        numValue: 123.45
      });
    });
  });
  
  describe('processJsonTimestamps', () => {
    it('应替换字符串中的时间戳占位符', () => {
      expect(processJsonTimestamps('test-<timestamp>')).to.equal('test-1617184000000');
    });
    
    it('应递归处理对象中的时间戳', () => {
      const obj = {
        name: 'test-<timestamp>',
        nested: {
          value: '<timestamp>'
        }
      };
      
      const expected = {
        name: 'test-1617184000000',
        nested: {
          value: '1617184000000'
        }
      };
      
      expect(processJsonTimestamps(obj)).to.deep.equal(expected);
    });
    
    it('应递归处理数组中的时间戳', () => {
      const array = [
        'item-<timestamp>',
        {
          name: 'test-<timestamp>'
        }
      ];
      
      const expected = [
        'item-1617184000000',
        {
          name: 'test-1617184000000'
        }
      ];
      
      expect(processJsonTimestamps(array)).to.deep.equal(expected);
    });
    
    it('应保留不包含时间戳的值', () => {
      expect(processJsonTimestamps(123)).to.equal(123);
      expect(processJsonTimestamps(true)).to.equal(true);
      expect(processJsonTimestamps(null)).to.equal(null);
      expect(processJsonTimestamps('普通字符串')).to.equal('普通字符串');
    });

    it('应处理多个时间戳占位符', () => {
      expect(processJsonTimestamps('前缀-<timestamp>-中间-<timestamp>-后缀')).to.equal('前缀-1617184000000-中间-1617184000000-后缀');
    });

    it('应处理空对象', () => {
      expect(processJsonTimestamps({})).to.deep.equal({});
    });

    it('应处理空数组', () => {
      expect(processJsonTimestamps([])).to.deep.equal([]);
    });

    it('应处理复杂嵌套结构', () => {
      const complex = {
        name: 'test',
        tags: ['<timestamp>', 'static'],
        meta: {
          created: '<timestamp>',
          items: [
            { id: 1, time: '<timestamp>' },
            { id: 2, time: 'static' }
          ]
        }
      };

      const expected = {
        name: 'test',
        tags: ['1617184000000', 'static'],
        meta: {
          created: '1617184000000',
          items: [
            { id: 1, time: '1617184000000' },
            { id: 2, time: 'static' }
          ]
        }
      };

      expect(processJsonTimestamps(complex)).to.deep.equal(expected);
    });
  });
  
  describe('processTableToJson', () => {
    it('应处理简单表格数据', () => {
      const rows = [
        ['name', '张三'],
        ['age', '30']
      ];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });
    
    it('应跳过表头行', () => {
      const rows = [
        ['字段名', '值', '描述'],
        ['name', '张三', '姓名'],
        ['age', '30', '年龄']
      ];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, true, 1, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });
    
    it('应将布尔字符串转换为布尔值', () => {
      const rows = [
        ['isAdmin', 'true'],
        ['isActive', 'false']
      ];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        isAdmin: true,
        isActive: false
      });
    });
    
    it('应处理上下文变量', () => {
      const rows = [
        ['name', '{context.userName}'],
        ['age', '{context.userAge}']
      ];
      const world = createMockWorld({
        userName: '张三',
        userAge: 30
      });
      
      // 由于processContextVariables是在step-helpers中，这里我们使用模拟进行测试
      const mockWorld = {
        ...world,
        context: {
          userName: '张三',
          userAge: 30
        }
      };
      
      // 模拟processContextVariables的行为
      const originalProcessContextVariables = require('../../src/utils/step-helpers').processContextVariables;
      const processContextVariablesStub = sinon.stub().callsFake((world, value) => {
        if (value === '{context.userName}') return '张三';
        if (value === '{context.userAge}') return 30;
        return value;
      });
      
      // 替换原始函数
      require('../../src/utils/step-helpers').processContextVariables = processContextVariablesStub;
      
      try {
        const result = processTableToJson(rows, false, 0, mockWorld as any);
        expect(result).to.deep.equal({
          name: '张三',
          age: 30
        });
      } finally {
        // 恢复原始函数
        require('../../src/utils/step-helpers').processContextVariables = originalProcessContextVariables;
      }
    });

    it('应处理表格中的时间戳占位符', () => {
      const rows = [
        ['createdAt', '<timestamp>'],
        ['name', 'test-<timestamp>']
      ];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        createdAt: '1617184000000',
        name: 'test-1617184000000'
      });
    });

    it('应跳过少于2列的行', () => {
      const rows = [
        ['name', '张三'],
        ['incomplete'],
        ['age', '30']
      ];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });

    it('应跳过空字段名', () => {
      const rows = [
        ['name', '张三'],
        ['', '无效值'],
        ['age', '30']
      ];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });

    it('应将空值设置为空字符串', () => {
      const rows = [
        ['name', '张三'],
        ['description', null]
      ];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        description: ''
      });
    });

    it('应跳过各种表头格式', () => {
      const rows = [
        ['param_name', 'param_value'],
        ['key', 'value'],
        ['name', '张三'],
        ['age', '30']
      ];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, true, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });

    it('应处理空表格', () => {
      const rows: any[][] = [];
      const world = createMockWorld();
      
      const result = processTableToJson(rows, false, 0, world as any);
      expect(result).to.deep.equal({});
    });
  });
  
  describe('processTableToQueryParams', () => {
    it('应处理简单表格数据', () => {
      const rows = [
        ['page', '1'],
        ['size', '10']
      ];
      const world = createMockWorld();
      
      const result = processTableToQueryParams(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        page: '1',
        size: '10'
      });
    });
    
    it('应保留字符串格式不自动转换', () => {
      const rows = [
        ['page', '1'],
        ['keyword', 'test']
      ];
      const world = createMockWorld();
      
      const result = processTableToQueryParams(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        page: '1',
        keyword: 'test'
      });
    });

    it('应处理上下文变量', () => {
      const rows = [
        ['userId', '{context.userId}']
      ];
      const world = createMockWorld();
      
      // 模拟processContextVariables的行为
      const originalProcessContextVariables = require('../../src/utils/step-helpers').processContextVariables;
      const processContextVariablesStub = sinon.stub().callsFake((world, value) => {
        if (value === '{context.userId}') return '12345';
        return value;
      });
      
      // 替换原始函数
      require('../../src/utils/step-helpers').processContextVariables = processContextVariablesStub;
      
      try {
        const result = processTableToQueryParams(rows, false, 0, world as any);
        expect(result).to.deep.equal({
          userId: '12345'
        });
        expect(processContextVariablesStub.calledOnce).to.be.true;
      } finally {
        // 恢复原始函数
        require('../../src/utils/step-helpers').processContextVariables = originalProcessContextVariables;
      }
    });

    it('应处理时间戳占位符', () => {
      const rows = [
        ['timestamp', '<timestamp>'],
        ['name', 'test-<timestamp>']
      ];
      const world = createMockWorld();
      
      const result = processTableToQueryParams(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        timestamp: '1617184000000',
        name: 'test-1617184000000'
      });
    });

    it('应跳过少于2列的行', () => {
      const rows = [
        ['param1', 'value1'],
        ['incomplete'],
        ['param2', 'value2']
      ];
      const world = createMockWorld();
      
      const result = processTableToQueryParams(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        param1: 'value1',
        param2: 'value2'
      });
    });

    it('应跳过空字段名', () => {
      const rows = [
        ['param1', 'value1'],
        ['', 'invalid'],
        ['param2', 'value2']
      ];
      const world = createMockWorld();
      
      const result = processTableToQueryParams(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        param1: 'value1',
        param2: 'value2'
      });
    });

    it('应跳过各种表头格式', () => {
      const rows = [
        ['参数名', '参数值'],
        ['key', 'value'],
        ['param1', 'value1'],
        ['param2', 'value2']
      ];
      const world = createMockWorld();
      
      const result = processTableToQueryParams(rows, true, 0, world as any);
      expect(result).to.deep.equal({
        param1: 'value1',
        param2: 'value2'
      });
    });

    it('应处理空表格', () => {
      const rows: any[][] = [];
      const world = createMockWorld();
      
      const result = processTableToQueryParams(rows, false, 0, world as any);
      expect(result).to.deep.equal({});
    });
  });
  
  describe('processTableToFormData', () => {
    it('应处理简单表格数据', () => {
      const rows = [
        ['name', '张三'],
        ['age', '30']
      ];
      const world = createMockWorld();
      
      const result = processTableToFormData(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });
    
    it('应转换数据类型', () => {
      const rows = [
        ['name', '张三'],
        ['age', '30'],
        ['isAdmin', 'true'],
        ['active', 'false'],
        ['score', '95.5']
      ];
      const world = createMockWorld();
      
      const result = processTableToFormData(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30,
        isAdmin: true,
        active: false,
        score: 95.5
      });
    });

    it('应处理上下文变量', () => {
      const rows = [
        ['name', '{context.userName}']
      ];
      const world = createMockWorld();
      
      // 模拟processContextVariables的行为
      const originalProcessContextVariables = require('../../src/utils/step-helpers').processContextVariables;
      const processContextVariablesStub = sinon.stub().callsFake((world, value) => {
        if (value === '{context.userName}') return '张三';
        return value;
      });
      
      // 替换原始函数
      require('../../src/utils/step-helpers').processContextVariables = processContextVariablesStub;
      
      try {
        const result = processTableToFormData(rows, false, 0, world as any);
        expect(result).to.deep.equal({
          name: '张三'
        });
        expect(processContextVariablesStub.calledOnce).to.be.true;
      } finally {
        // 恢复原始函数
        require('../../src/utils/step-helpers').processContextVariables = originalProcessContextVariables;
      }
    });

    it('应处理时间戳占位符', () => {
      const rows = [
        ['timestamp', '<timestamp>'],
        ['name', 'test-<timestamp>']
      ];
      const world = createMockWorld();
      
      const result = processTableToFormData(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        timestamp: '1617184000000',
        name: 'test-1617184000000'
      });
    });

    it('应跳过少于2列的行', () => {
      const rows = [
        ['name', '张三'],
        ['incomplete'],
        ['age', '30']
      ];
      const world = createMockWorld();
      
      const result = processTableToFormData(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });

    it('应跳过空字段名', () => {
      const rows = [
        ['name', '张三'],
        ['', '无效值'],
        ['age', '30']
      ];
      const world = createMockWorld();
      
      const result = processTableToFormData(rows, false, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });

    it('应跳过各种表头格式', () => {
      const rows = [
        ['字段名', '值', '描述'],
        ['name', '张三', '姓名'],
        ['age', '30', '年龄']
      ];
      const world = createMockWorld();
      
      const result = processTableToFormData(rows, true, 0, world as any);
      expect(result).to.deep.equal({
        name: '张三',
        age: 30
      });
    });

    it('应处理空表格', () => {
      const rows: any[][] = [];
      const world = createMockWorld();
      
      const result = processTableToFormData(rows, false, 0, world as any);
      expect(result).to.deep.equal({});
    });

    it('应处理非标准值', () => {
      const rows = [
        ['nullValue', null],
        ['undefinedValue', undefined],
        ['emptyString', ''],
        ['objectValue', { key: 'value' }]
      ];
      const world = createMockWorld();
      
      // 模拟processTimestamp，避免对象值调用时出错
      const originalProcessTimestamp = require('../../src/utils/step-helpers').processTimestamp;
      const processTimestampStub = sinon.stub().callsFake((value) => {
        if (typeof value === 'string') return value;
        return value;
      });
      
      // 替换原始函数
      require('../../src/utils/step-helpers').processTimestamp = processTimestampStub;
      
      try {
        const result = processTableToFormData(rows, false, 0, world as any);
        expect(result).to.deep.equal({
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          objectValue: { key: 'value' }
        });
      } finally {
        // 恢复原始函数
        require('../../src/utils/step-helpers').processTimestamp = originalProcessTimestamp;
      }
    });
  });
}); 