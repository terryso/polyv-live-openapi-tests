/**
 * 数学表达式和条件判断相关的辅助函数
 */
import { CustomWorld } from '../support/world';
import { processContextVariables } from './step-helpers';

/**
 * 处理表达式中的上下文变量替换
 * @param world CustomWorld实例
 * @param expr 表达式字符串
 * @returns 处理后的表达式
 */
export function processExpression(world: CustomWorld, expr: string): string {
  // 替换所有的 {context.xyz} 变量
  return expr.replace(/{context\.([^}]+)}/g, (match, key) => {
    if (!world.context || world.context[key] === undefined) {
      throw new Error(`上下文中不存在变量: ${key}`);
    }
    
    const value = world.context[key];
    // 确保值是数字类型
    if (isNaN(Number(value))) {
      throw new Error(`上下文变量 ${key} 的值 "${value}" 不是有效的数字`);
    }
    
    return String(Number(value));
  });
}

/**
 * 算术运算符及其对应的运算函数
 */
export const ARITHMETIC_OPERATORS: Record<string, (a: number, b: number) => number> = {
  '+': (a: number, b: number) => a + b,
  '-': (a: number, b: number) => a - b,
  '*': (a: number, b: number) => a * b,
  '/': (a: number, b: number) => a / b
};

/**
 * 比较运算符及其对应的比较函数
 */
export const COMPARISON_OPERATORS: Record<string, (a: number, b: number) => boolean> = {
  '=': (a: number, b: number) => a === b,
  '==': (a: number, b: number) => a === b,
  '!=': (a: number, b: number) => a !== b,
  '>': (a: number, b: number) => a > b,
  '>=': (a: number, b: number) => a >= b,
  '<': (a: number, b: number) => a < b,
  '<=': (a: number, b: number) => a <= b
};

/**
 * 解析并计算表达式
 * 支持两种形式的表达式：
 * 1. 比较表达式：a > b
 * 2. 计算表达式：a + b = c
 * @param expr 数学表达式
 * @returns 表达式求值结果
 */
export function evaluateExpression(expr: string): boolean {
  // 分割表达式为操作数和运算符
  const parts = expr.trim().split(/\s+/);
  
  if (parts.length === 3) {
    // 形如 "a > b" 的比较表达式
    const [leftStr, operator, rightStr] = parts;
    const left = Number(leftStr);
    const right = Number(rightStr);
    
    if (isNaN(left) || isNaN(right)) {
      throw new Error(`表达式 "${expr}" 包含无效的数字`);
    }
    
    if (!COMPARISON_OPERATORS[operator]) {
      throw new Error(`不支持的比较运算符: ${operator}`);
    }
    
    return COMPARISON_OPERATORS[operator](left, right);
    
  } else if (parts.length === 5) {
    // 形如 "a + b = c" 的计算表达式
    const [aStr, op1, bStr, op2, cStr] = parts;
    const a = Number(aStr);
    const b = Number(bStr);
    const c = Number(cStr);
    
    if (isNaN(a) || isNaN(b) || isNaN(c)) {
      throw new Error(`表达式 "${expr}" 包含无效的数字`);
    }
    
    if (!ARITHMETIC_OPERATORS[op1] || op2 !== '=') {
      throw new Error(`表达式 "${expr}" 格式不正确或包含不支持的运算符`);
    }
    
    const result = ARITHMETIC_OPERATORS[op1](a, b);
    return Math.abs(result - c) < 0.0001; // 浮点数比较使用小误差范围
  }
  
  throw new Error(`不支持的表达式格式: "${expr}"`);
}

/**
 * 从世界上下文中提取条件变量值
 * @param world CustomWorld实例
 * @param conditionStr 条件字符串，可能包含上下文变量引用
 * @returns 提取的条件值
 */
export function extractConditionValue(world: CustomWorld, conditionStr: string): string {
  // 如果字符串是上下文变量引用格式，提取变量并返回
  const match = conditionStr.match(/^\{context\.([^}]+)\}$/);
  if (match && match[1]) {
    const key = match[1];
    if (!world.context || world.context[key] === undefined) {
      throw new Error(`不存在键 ${key}`);
    }
    return String(world.context[key]);
  }
  
  // 如果包含上下文变量但不是完全匹配形式，使用通用函数处理
  if (conditionStr.includes('{context.')) {
    return String(processContextVariables(world, conditionStr));
  }
  
  return conditionStr;
} 