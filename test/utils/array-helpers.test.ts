import { expect } from 'chai';
import { 
  validateArrayElementsHaveField,
  validateArrayElementsFields,
  findArrayElementByFieldValue,
  createArrayFromTemplate
} from '../../src/utils/array-helpers';

describe('array-helpers 辅助函数测试', () => {
  describe('validateArrayElementsHaveField', () => {
    it('应验证每个元素都有指定字段', () => {
      const array = [
        { id: 1, name: '项目1' },
        { id: 2, name: '项目2' }
      ];
      
      expect(validateArrayElementsHaveField(array, 'id')).to.equal(true);
      expect(validateArrayElementsHaveField(array, 'name')).to.equal(true);
    });
    
    it('应在字段缺失时返回错误', () => {
      const array = [
        { id: 1, name: '项目1' },
        { id: 2 }
      ];
      
      const result = validateArrayElementsHaveField(array, 'name');
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('缺少字段 name');
      expect(result).to.have.property('index', 1);
    });
    
    it('应在非数组时返回错误', () => {
      const result = validateArrayElementsHaveField('不是数组' as any, 'name');
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('不是有效的数组');
      expect(result).to.have.property('index', -1);
    });
    
    it('应验证空数组为true', () => {
      expect(validateArrayElementsHaveField([], 'anyField')).to.equal(true);
    });

    it('应处理null和undefined元素', () => {
      const array = [
        { id: 1 },
        null,
        { id: 3 }
      ];
      
      const result = validateArrayElementsHaveField(array, 'id');
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('缺少字段 id');
      expect(result).to.have.property('index', 1);
    });

    it('应处理非对象元素', () => {
      const array = [
        { id: 1 },
        "字符串",
        { id: 3 }
      ];
      
      const result = validateArrayElementsHaveField(array, 'id');
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('缺少字段 id');
      expect(result).to.have.property('index', 1);
    });
  });
  
  describe('validateArrayElementsFields', () => {
    it('应验证每个元素的多个字段和类型', () => {
      const array = [
        { id: 1, name: '项目1', active: true },
        { id: 2, name: '项目2', active: false }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' },
        { 字段: 'name', 类型: '字符串', 描述: '名称' },
        { 字段: 'active', 类型: '布尔值', 描述: '状态' }
      ];
      
      expect(validateArrayElementsFields(array, fields)).to.equal(true);
    });
    
    it('应在字段类型不匹配时返回错误', () => {
      const array = [
        { id: 1, name: '项目1', active: true },
        { id: '2', name: '项目2', active: false }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' },
        { 字段: 'name', 类型: '字符串', 描述: '名称' },
        { 字段: 'active', 类型: '布尔值', 描述: '状态' }
      ];
      
      const result = validateArrayElementsFields(array, fields);
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('应该是整数');
      expect(result).to.have.property('index', 1);
      expect(result).to.have.property('field', 'id');
    });
    
    it('应在字段缺失时返回错误', () => {
      const array = [
        { id: 1, name: '项目1', active: true },
        { id: 2, active: false }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' },
        { 字段: 'name', 类型: '字符串', 描述: '名称' },
        { 字段: 'active', 类型: '布尔值', 描述: '状态' }
      ];
      
      const result = validateArrayElementsFields(array, fields);
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('缺少字段 name');
      expect(result).to.have.property('index', 1);
      expect(result).to.have.property('field', 'name');
    });
    
    it('应验证空数组为true', () => {
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' }
      ];
      
      expect(validateArrayElementsFields([], fields)).to.equal(true);
    });
    
    it('应验证可空字段', () => {
      const array = [
        { id: 1, name: '项目1', icon: null, description: null },
        { id: 2, name: '项目2', icon: 'icon.png', description: '描述' }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' },
        { 字段: 'name', 类型: '字符串', 描述: '名称' },
        { 字段: 'icon', 类型: '字符串', 描述: '图标' },
        { 字段: 'description', 类型: '字符串', 描述: '描述' }
      ];
      
      expect(validateArrayElementsFields(array, fields)).to.equal(true);
    });

    it('应支持大小写不敏感的类型名称', () => {
      const array = [
        { id: 1, name: '项目1', data: [1, 2, 3] }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' },
        { 字段: 'name', 类型: 'STRING', 描述: '名称' },
        { 字段: 'data', 类型: 'Array', 描述: '数据' }
      ];
      
      expect(validateArrayElementsFields(array, fields)).to.equal(true);
    });

    it('应验证对象类型', () => {
      const array = [
        { id: 1, config: { key: 'value' } }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' },
        { 字段: 'config', 类型: '对象', 描述: '配置' }
      ];
      
      expect(validateArrayElementsFields(array, fields)).to.equal(true);
    });

    it('应在对象类型不匹配时返回错误', () => {
      const array = [
        { id: 1, config: 'not an object' }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' },
        { 字段: 'config', 类型: '对象', 描述: '配置' }
      ];
      
      const result = validateArrayElementsFields(array, fields);
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('应该是对象');
    });

    it('应验证数组不是对象', () => {
      const array = [
        { id: 1, config: [] }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' },
        { 字段: 'config', 类型: '对象', 描述: '配置' }
      ];
      
      const result = validateArrayElementsFields(array, fields);
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('应该是对象');
    });

    it('应在非数组输入时返回错误', () => {
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' }
      ];
      
      const result = validateArrayElementsFields({} as any, fields);
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('不是有效的数组');
      expect(result).to.have.property('index', -1);
    });

    it('应支持类型别名', () => {
      const array = [
        { 
          intValue: 1, 
          stringValue: 'text', 
          boolValue: true,
          objValue: { key: 'value' },
          arrValue: [1, 2, 3]
        }
      ];
      
      const fields = [
        { 字段: 'intValue', 类型: 'int', 描述: '整数' },
        { 字段: 'stringValue', 类型: 'string', 描述: '字符串' },
        { 字段: 'boolValue', 类型: 'bool', 描述: '布尔值' },
        { 字段: 'objValue', 类型: 'object', 描述: '对象' },
        { 字段: 'arrValue', 类型: 'array', 描述: '数组' }
      ];
      
      expect(validateArrayElementsFields(array, fields)).to.equal(true);
    });

    it('应验证小数也是有效的整数类型', () => {
      const array = [
        { id: 1.5 }
      ];
      
      const fields = [
        { 字段: 'id', 类型: '整数', 描述: '标识符' }
      ];
      
      const result = validateArrayElementsFields(array, fields);
      expect(result).to.not.equal(true);
      expect(result).to.have.property('error').that.includes('应该是整数');
    });
  });
  
  describe('findArrayElementByFieldValue', () => {
    const testArray = [
      { id: 1, name: '项目A', path: 'path/to/a' },
      { id: 2, name: '项目B', path: 'path/to/b' },
      { id: 3, name: '测试C项目', path: 'path/to/c' },
      { id: 4, name: '测试项目D', path: 'path/to/d' },
      { 
        id: 5, 
        name: '项目E', 
        meta: { 
          type: 'special',
          tags: ['foo', 'bar']
        }
      }
    ];
    
    it('应找到匹配字段值的元素', () => {
      const result = findArrayElementByFieldValue(testArray, 'name', '项目B');
      expect(result).to.deep.equal(testArray[1]);
    });
    
    it('应支持数字值匹配', () => {
      const result = findArrayElementByFieldValue(testArray, 'id', 3);
      expect(result).to.deep.equal(testArray[2]);
      
      const stringResult = findArrayElementByFieldValue(testArray, 'id', '3');
      expect(stringResult).to.deep.equal(testArray[2]);
    });
    
    it('应在字段值不匹配时返回undefined', () => {
      const result = findArrayElementByFieldValue(testArray, 'name', '不存在');
      expect(result).to.be.undefined;
    });
    
    it('应在空数组时返回undefined', () => {
      const result = findArrayElementByFieldValue([], 'name', '项目A');
      expect(result).to.be.undefined;
    });
    
    it('应支持部分name字段匹配', () => {
      const result1 = findArrayElementByFieldValue(testArray, 'name', '测试C');
      expect(result1).to.deep.equal(testArray[2]);
      
      const result2 = findArrayElementByFieldValue(testArray, 'name', '项目D');
      expect(result2).to.deep.equal(testArray[3]);
    });
    
    it('应支持路径获取嵌套字段', () => {
      const result = findArrayElementByFieldValue(testArray, 'meta.type', 'special');
      expect(result).to.deep.equal(testArray[4]);
    });

    it('应处理非数组输入', () => {
      const result = findArrayElementByFieldValue({} as any, 'name', 'value');
      expect(result).to.be.undefined;
    });

    it('应处理undefined输入', () => {
      const result = findArrayElementByFieldValue(undefined as any, 'name', 'value');
      expect(result).to.be.undefined;
    });

    it('应处理数组元素不是对象的情况', () => {
      const mixedArray = [
        { id: 1, name: 'item1' },
        'string',
        123,
        null,
        undefined
      ];

      const result = findArrayElementByFieldValue(mixedArray, 'name', 'item1');
      expect(result).to.deep.equal(mixedArray[0]);

      const noMatch = findArrayElementByFieldValue(mixedArray, 'id', 999);
      expect(noMatch).to.be.undefined;
    });

    it('应支持深层嵌套路径', () => {
      const deepArray = [
        { 
          id: 1, 
          config: {
            settings: {
              theme: {
                color: 'blue'
              }
            }
          }
        },
        { 
          id: 2, 
          config: {
            settings: {
              theme: {
                color: 'red'
              }
            }
          }
        }
      ];

      const result = findArrayElementByFieldValue(deepArray, 'config.settings.theme.color', 'red');
      expect(result).to.deep.equal(deepArray[1]);
    });

    it('应正确处理数字和字符串比较', () => {
      const array = [
        { value: 123 },
        { value: '123' }
      ];

      const result1 = findArrayElementByFieldValue(array, 'value', 123);
      expect(result1).to.deep.equal(array[0]);
      
      const result2 = findArrayElementByFieldValue(array, 'value', '123');
      expect(result2).to.not.be.undefined;
    });
  });
  
  describe('createArrayFromTemplate', () => {
    it('应创建指定数量的对象数组', () => {
      const template = { id: 'item-X', name: '项目X' };
      const count = 3;
      
      const result = createArrayFromTemplate(template, count);
      
      expect(result).to.have.length(count);
      expect(result[0]).to.deep.equal({ id: 'item-1', name: '项目1' });
      expect(result[1]).to.deep.equal({ id: 'item-2', name: '项目2' });
      expect(result[2]).to.deep.equal({ id: 'item-3', name: '项目3' });
    });
    
    it('应只替换字符串中的X', () => {
      const template = { 
        id: 'item-X', 
        name: '项目X', 
        position: (x: number) => x * 10,  // 添加显式类型声明
        tags: ['tag-X', 'common']
      };
      const count = 2;
      
      const result = createArrayFromTemplate(template, count);
      
      expect(result).to.have.length(count);
      expect(result[0].id).to.equal('item-1');
      expect(result[0].name).to.equal('项目1');
      expect(result[0].position).to.equal(template.position);
      expect(result[0].tags).to.deep.equal(['tag-X', 'common']);
    });
    
    it('应在count为0时返回空数组', () => {
      const template = { id: 'item-X', name: '项目X' };
      const result = createArrayFromTemplate(template, 0);
      
      expect(result).to.be.an('array').that.is.empty;
    });

    it('应处理负数count', () => {
      const template = { id: 'item-X', name: '项目X' };
      const result = createArrayFromTemplate(template, -5);
      
      expect(result).to.be.an('array').that.is.empty;
    });

    it('应处理空对象模板', () => {
      const template = {};
      const result = createArrayFromTemplate(template, 3);
      
      expect(result).to.have.length(3);
      expect(result[0]).to.deep.equal({});
      expect(result[1]).to.deep.equal({});
      expect(result[2]).to.deep.equal({});
    });

    it('应处理包含各种数据类型的模板', () => {
      const template = {
        id: 'id-X',
        numValue: 100,
        boolValue: true,
        nullValue: null,
        arrayValue: [1, 2, 3],
        objectValue: { nested: 'value' }
      };
      
      const result = createArrayFromTemplate(template, 1);
      
      expect(result[0].id).to.equal('id-1');
      expect(result[0].numValue).to.equal(100);
      expect(result[0].boolValue).to.equal(true);
      expect(result[0].nullValue).to.be.null;
      expect(result[0].arrayValue).to.deep.equal([1, 2, 3]);
      expect(result[0].objectValue).to.deep.equal({ nested: 'value' });
    });

    it('应处理嵌套对象中的X替换', () => {
      const template = {
        id: 'item-X',
        config: {
          name: 'config-X',
          path: '/path/X'
        }
      };
      
      // 注意：当前实现不会替换嵌套对象中的X，这是一个潜在的功能增强点
      const result = createArrayFromTemplate(template, 2);
      
      expect(result).to.have.length(2);
      expect(result[0].id).to.equal('item-1');
      expect(result[0].config.name).to.equal('config-X');
      expect(result[0].config.path).to.equal('/path/X');
    });
  });
}); 