import { expect } from 'chai';
import { 
  isParamInBody, 
  checkJsonLike, 
  validateBasicSchema,
  cleanFormData,
  convertFieldValue,
  validateArrayObjectsFields
} from '../../src/utils/response-validation';

describe('response-validation 辅助函数测试', () => {
  describe('isParamInBody', () => {
    it('应在请求体中处理JSON内容类型', () => {
      expect(isParamInBody('application/json')).to.be.true;
    });
    
    it('不应在请求体中处理表单内容类型', () => {
      expect(isParamInBody('application/x-www-form-urlencoded')).to.be.false;
    });
    
    it('不应在请求体中处理任何其他内容类型', () => {
      expect(isParamInBody('text/plain')).to.be.false;
    });
  });
  
  describe('checkJsonLike', () => {
    it('应使用通配符匹配任何值', () => {
      expect(checkJsonLike('任何值', '*')).to.be.true;
      expect(checkJsonLike(123, '*')).to.be.true;
      expect(checkJsonLike(null, '*')).to.be.true;
      expect(checkJsonLike({key: 'value'}, '*')).to.be.true;
    });
    
    it('应支持子字符串匹配', () => {
      expect(checkJsonLike('测试字符串', '*测试*')).to.be.true;
      expect(checkJsonLike('字符串', '*测试*')).to.be.false;
    });
    
    it('应支持前缀匹配', () => {
      expect(checkJsonLike('测试字符串', '测试*')).to.be.true;
      expect(checkJsonLike('其他测试', '测试*')).to.be.false;
    });
    
    it('应支持后缀匹配', () => {
      expect(checkJsonLike('字符串测试', '*测试')).to.be.true;
      expect(checkJsonLike('测试其他', '*测试')).to.be.false;
    });
    
    it('应匹配相等的对象', () => {
      const actual = { name: '张三', age: 30 };
      const expected = { name: '张三', age: 30 };
      expect(checkJsonLike(actual, expected)).to.be.true;
    });
    
    it('应匹配包含所有预期字段的对象', () => {
      const actual = { name: '张三', age: 30, gender: '男' };
      const expected = { name: '张三', age: 30 };
      expect(checkJsonLike(actual, expected)).to.be.true;
    });
    
    it('不应匹配缺少预期字段的对象', () => {
      const actual = { name: '张三' };
      const expected = { name: '张三', age: 30 };
      expect(checkJsonLike(actual, expected)).to.be.false;
    });
    
    it('应匹配数组包含的对象', () => {
      const actual = [
        { name: '张三', age: 30 },
        { name: '李四', age: 25 }
      ];
      const expected = [
        { name: '张三', age: 30 },
        { name: '李四', age: 25 }
      ];
      expect(checkJsonLike(actual, expected)).to.be.true;
    });
    
    it('不应匹配长度不同的数组', () => {
      const actual = [
        { name: '张三', age: 30 },
        { name: '李四', age: 25 }
      ];
      const expected = [
        { name: '张三', age: 30 }
      ];
      expect(checkJsonLike(actual, expected)).to.be.false;
    });
    
    it('应支持通配符匹配对象属性', () => {
      const actual = { name: '张三', description: '这是测试描述' };
      const expected = { name: '张三', description: '*测试*' };
      expect(checkJsonLike(actual, expected)).to.be.true;
    });
  });
  
  describe('validateBasicSchema', () => {
    it('应验证对象类型', () => {
      expect(validateBasicSchema({}, { type: 'object' })).to.be.true;
      expect(validateBasicSchema([], { type: 'object' })).to.be.false;
      expect(validateBasicSchema(null, { type: 'object' })).to.be.false;
      expect(validateBasicSchema('string', { type: 'object' })).to.be.false;
    });
    
    it('应验证数组类型', () => {
      expect(validateBasicSchema([], { type: 'array' })).to.be.true;
      expect(validateBasicSchema({}, { type: 'array' })).to.be.false;
      expect(validateBasicSchema('string', { type: 'array' })).to.be.false;
    });
    
    it('应验证字符串类型', () => {
      expect(validateBasicSchema('string', { type: 'string' })).to.be.true;
      expect(validateBasicSchema(123, { type: 'string' })).to.be.false;
      expect(validateBasicSchema({}, { type: 'string' })).to.be.false;
    });
    
    it('应验证数字类型', () => {
      expect(validateBasicSchema(123, { type: 'number' })).to.be.true;
      expect(validateBasicSchema('123', { type: 'number' })).to.be.false;
      expect(validateBasicSchema({}, { type: 'number' })).to.be.false;
    });
    
    it('应验证布尔类型', () => {
      expect(validateBasicSchema(true, { type: 'boolean' })).to.be.true;
      expect(validateBasicSchema(false, { type: 'boolean' })).to.be.true;
      expect(validateBasicSchema('true', { type: 'boolean' })).to.be.false;
      expect(validateBasicSchema(1, { type: 'boolean' })).to.be.false;
    });
  });
  
  describe('cleanFormData', () => {
    it('应清理表单数据中的空值', () => {
      const input = {
        name: '张三',
        age: 30,
        description: '',
        address: null,
        score: undefined
      };
      
      const expected = {
        name: '张三',
        age: '30'
      };
      
      expect(cleanFormData(input)).to.deep.equal(expected);
    });
    
    it('应将所有值转换为字符串', () => {
      const input = {
        name: '张三',
        age: 30,
        isAdmin: true,
        rate: 1.5
      };
      
      const expected = {
        name: '张三',
        age: '30',
        isAdmin: 'true',
        rate: '1.5'
      };
      
      expect(cleanFormData(input)).to.deep.equal(expected);
    });
  });
  
  describe('convertFieldValue', () => {
    it('应将空值转换为空字符串', () => {
      expect(convertFieldValue(null)).to.equal('');
      expect(convertFieldValue(undefined)).to.equal('');
    });
    
    it('应将数字字符串转换为数字', () => {
      expect(convertFieldValue('123')).to.equal(123);
      expect(convertFieldValue('1.23')).to.equal(1.23);
    });
    
    it('应将布尔字符串转换为布尔值', () => {
      expect(convertFieldValue('true')).to.equal(true);
      expect(convertFieldValue('false')).to.equal(false);
    });
    
    it('应保留无法转换的字符串值', () => {
      expect(convertFieldValue('test')).to.equal('test');
      expect(convertFieldValue('123test')).to.equal('123test');
    });
    
    it('应保留非字符串、非空值', () => {
      expect(convertFieldValue(123)).to.equal(123);
      expect(convertFieldValue(true)).to.equal(true);
      expect(convertFieldValue({})).to.deep.equal({});
    });
  });
  
  describe('validateArrayObjectsFields', () => {
    it('应对空数组直接返回成功', () => {
      const result = validateArrayObjectsFields([], [], 'data.items');
      expect(result.success).to.be.true;
      expect(result.errorMessage).to.be.undefined;
    });
    
    it('应验证所有指定字段和类型', () => {
      const arrayData = [
        { id: 1, name: '张三', isAdmin: true, meta: { age: 30 }, tags: ['admin'] },
        { id: 2, name: '李四', isAdmin: false, meta: { age: 25 }, tags: [] }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '唯一ID' },
        { 字段: 'name', 类型: '字符串', 描述: '用户名' },
        { 字段: 'isAdmin', 类型: '布尔值', 描述: '是否管理员' },
        { 字段: 'meta', 类型: '对象', 描述: '元数据' },
        { 字段: 'tags', 类型: '数组', 描述: '标签列表' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.true;
      expect(result.errorMessage).to.be.undefined;
    });
    
    it('应处理可为null的字段', () => {
      const arrayData = [
        { id: 1, name: '张三', description: null, icon: null }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数' },
        { 字段: 'name', 类型: '字符串' },
        { 字段: 'description', 类型: '字符串' },
        { 字段: 'icon', 类型: '字符串' }
      ];
      
      const result = validateArrayObjectsFields(
        arrayData, 
        fields, 
        'data.users', 
        ['description', 'icon']
      );
      
      expect(result.success).to.be.true;
      expect(result.errorMessage).to.be.undefined;
    });
    
    it('应检测缺少字段并返回错误', () => {
      const arrayData = [
        { id: 1, name: '张三' },
        { id: 2 } // 缺少name字段
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数' },
        { 字段: 'name', 类型: '字符串' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.false;
      expect(result.errorMessage).to.include('第2个对象缺少字段 name');
    });
    
    it('应验证整数类型', () => {
      const arrayData = [
        { id: 1 },
        { id: '2' } // 字符串而非整数
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.false;
      expect(result.errorMessage).to.include('应该是整数');
    });
    
    it('应验证字符串类型', () => {
      const arrayData = [
        { name: '张三' },
        { name: 123 } // 数字而非字符串
      ];
      
      const fields = [
        { 字段: 'name', 类型: '字符串' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.false;
      expect(result.errorMessage).to.include('应该是字符串');
    });
    
    it('应验证布尔值类型', () => {
      const arrayData = [
        { isAdmin: true },
        { isAdmin: 'true' } // 字符串而非布尔值
      ];
      
      const fields = [
        { 字段: 'isAdmin', 类型: '布尔值' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.false;
      expect(result.errorMessage).to.include('应该是布尔值');
    });
    
    it('应验证对象类型', () => {
      const arrayData = [
        { meta: {} },
        { meta: [] } // 数组而非对象
      ];
      
      const fields = [
        { 字段: 'meta', 类型: '对象' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.false;
      expect(result.errorMessage).to.include('应该是对象');
    });
    
    it('应验证数组类型', () => {
      const arrayData = [
        { tags: [] },
        { tags: {} } // 对象而非数组
      ];
      
      const fields = [
        { 字段: 'tags', 类型: '数组' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.false;
      expect(result.errorMessage).to.include('应该是数组');
    });
    
    it('应处理非整数的数字', () => {
      const arrayData = [
        { id: 1 },
        { id: 1.5 } // 浮点数而非整数
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.false;
      expect(result.errorMessage).to.include('应该是整数');
    });
    
    it('应支持字段类型的大小写不敏感', () => {
      const arrayData = [
        { id: 1, name: '张三', isAdmin: true }
      ];
      
      const fields = [
        { 字段: 'id', 类型: 'Integer' },
        { 字段: 'name', 类型: 'String' },
        { 字段: 'isAdmin', 类型: 'Boolean' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.users');
      expect(result.success).to.be.true;
      expect(result.errorMessage).to.be.undefined;
    });
    
    it('应支持多种类型别名', () => {
      const arrayData = [
        { 
          intValue: 1,
          strValue: '测试',
          boolValue: false
        }
      ];
      
      const fields = [
        { 字段: 'intValue', 类型: 'int' },
        { 字段: 'strValue', 类型: '字符串' },
        { 字段: 'boolValue', 类型: 'bool' }
      ];
      
      const result = validateArrayObjectsFields(arrayData, fields, 'data.values');
      expect(result.success).to.be.true;
      expect(result.errorMessage).to.be.undefined;
    });
  });
}); 