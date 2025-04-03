import { expect } from 'chai';
import { 
  processExpression,
  evaluateExpression,
  extractConditionValue,
  ARITHMETIC_OPERATORS,
  COMPARISON_OPERATORS
} from '../../src/utils/expression-helpers';

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

describe('expression-helpers 辅助函数测试', () => {
  describe('processExpression', () => {
    it('应替换表达式中的上下文变量', () => {
      const world = createMockWorld({
        a: 10,
        b: 20
      });
      
      const expr = '{context.a} + {context.b} = 30';
      const result = processExpression(world as any, expr);
      expect(result).to.equal('10 + 20 = 30');
    });
    
    it('应在变量不存在时抛出异常', () => {
      const world = createMockWorld({
        a: 10
      });
      
      const expr = '{context.a} + {context.c} = 30';
      expect(() => processExpression(world as any, expr)).to.throw('上下文中不存在变量: c');
    });
    
    it('应在变量不是数字时抛出异常', () => {
      const world = createMockWorld({
        a: 10,
        b: 'not a number'
      });
      
      const expr = '{context.a} + {context.b} = 30';
      expect(() => processExpression(world as any, expr)).to.throw('不是有效的数字');
    });
    
    it('应处理表达式中的多个变量', () => {
      const world = createMockWorld({
        a: 10,
        b: 20,
        c: 30
      });
      
      const expr = '{context.a} + {context.b} = {context.c}';
      const result = processExpression(world as any, expr);
      expect(result).to.equal('10 + 20 = 30');
    });
  });
  
  describe('ARITHMETIC_OPERATORS', () => {
    it('应执行加法运算', () => {
      expect(ARITHMETIC_OPERATORS['+'](5, 3)).to.equal(8);
    });
    
    it('应执行减法运算', () => {
      expect(ARITHMETIC_OPERATORS['-'](5, 3)).to.equal(2);
    });
    
    it('应执行乘法运算', () => {
      expect(ARITHMETIC_OPERATORS['*'](5, 3)).to.equal(15);
    });
    
    it('应执行除法运算', () => {
      expect(ARITHMETIC_OPERATORS['/'](6, 3)).to.equal(2);
    });
  });
  
  describe('COMPARISON_OPERATORS', () => {
    it('应执行等于比较', () => {
      expect(COMPARISON_OPERATORS['='](5, 5)).to.be.true;
      expect(COMPARISON_OPERATORS['='](5, 3)).to.be.false;
    });
    
    it('应执行不等于比较', () => {
      expect(COMPARISON_OPERATORS['!='](5, 3)).to.be.true;
      expect(COMPARISON_OPERATORS['!='](5, 5)).to.be.false;
    });
    
    it('应执行大于比较', () => {
      expect(COMPARISON_OPERATORS['>'](5, 3)).to.be.true;
      expect(COMPARISON_OPERATORS['>'](3, 5)).to.be.false;
    });
    
    it('应执行大于等于比较', () => {
      expect(COMPARISON_OPERATORS['>='](5, 5)).to.be.true;
      expect(COMPARISON_OPERATORS['>='](5, 3)).to.be.true;
      expect(COMPARISON_OPERATORS['>='](3, 5)).to.be.false;
    });
    
    it('应执行小于比较', () => {
      expect(COMPARISON_OPERATORS['<'](3, 5)).to.be.true;
      expect(COMPARISON_OPERATORS['<'](5, 3)).to.be.false;
    });
    
    it('应执行小于等于比较', () => {
      expect(COMPARISON_OPERATORS['<='](5, 5)).to.be.true;
      expect(COMPARISON_OPERATORS['<='](3, 5)).to.be.true;
      expect(COMPARISON_OPERATORS['<='](5, 3)).to.be.false;
    });
  });
  
  describe('evaluateExpression', () => {
    it('应计算比较表达式', () => {
      expect(evaluateExpression('5 > 3')).to.be.true;
      expect(evaluateExpression('5 < 3')).to.be.false;
      expect(evaluateExpression('5 = 5')).to.be.true;
      expect(evaluateExpression('5 != 3')).to.be.true;
    });
    
    it('应计算算术比较表达式', () => {
      expect(evaluateExpression('5 + 3 = 8')).to.be.true;
      expect(evaluateExpression('5 - 3 = 2')).to.be.true;
      expect(evaluateExpression('5 * 3 = 15')).to.be.true;
      expect(evaluateExpression('6 / 3 = 2')).to.be.true;
      expect(evaluateExpression('5 + 3 = 10')).to.be.false;
    });
    
    it('应处理浮点数比较', () => {
      expect(evaluateExpression('1.1 + 2.2 = 3.3')).to.be.true;
    });
    
    it('应在无效表达式格式时抛出异常', () => {
      expect(() => evaluateExpression('invalid')).to.throw('不支持的表达式格式');
    });
    
    it('应在无效数字时抛出异常', () => {
      expect(() => evaluateExpression('5 + x = 8')).to.throw('包含无效的数字');
    });
    
    it('应在不支持的运算符时抛出异常', () => {
      expect(() => evaluateExpression('5 ? 3 = 8')).to.throw('格式不正确或包含不支持的运算符');
      expect(() => evaluateExpression('5 @ 3')).to.throw('不支持的比较运算符');
    });
  });
  
  describe('extractConditionValue', () => {
    it('应提取上下文变量值', () => {
      const world = createMockWorld({
        status: 'active'
      });
      
      expect(extractConditionValue(world as any, '{context.status}')).to.equal('active');
    });
    
    it('应在变量不存在时抛出异常', () => {
      const world = createMockWorld({});
      
      expect(() => extractConditionValue(world as any, '{context.status}')).to.throw('不存在键 status');
    });
    
    it('应保留非上下文变量字符串', () => {
      const world = createMockWorld({});
      
      expect(extractConditionValue(world as any, 'active')).to.equal('active');
    });
  });
}); 