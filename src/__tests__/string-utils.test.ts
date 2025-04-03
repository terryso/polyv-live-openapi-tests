import { expect } from 'chai';
import { describe, it } from 'mocha';
import {
  camelCaseToSnakeCase,
  snakeCaseToCamelCase,
  capitalizeFirstLetter,
  lowercaseFirstLetter,
  generateUniqueString,
  truncateString
} from '../utils/string-utils';

describe('字符串工具函数测试', () => {
  describe('camelCaseToSnakeCase函数', () => {
    it('应该将驼峰命名法转换为下划线命名法', () => {
      expect(camelCaseToSnakeCase('userId')).to.equal('user_id');
      expect(camelCaseToSnakeCase('channelId')).to.equal('channel_id');
      expect(camelCaseToSnakeCase('UserInfo')).to.equal('user_info');
      expect(camelCaseToSnakeCase('APIKey')).to.equal('a_p_i_key');
      expect(camelCaseToSnakeCase('sortByName')).to.equal('sort_by_name');
    });

    it('应该处理已经是下划线格式的字符串', () => {
      expect(camelCaseToSnakeCase('user_id')).to.equal('user_id');
    });

    it('应该处理空字符串', () => {
      expect(camelCaseToSnakeCase('')).to.equal('');
    });
  });

  describe('snakeCaseToCamelCase函数', () => {
    it('应该将下划线命名法转换为驼峰命名法', () => {
      expect(snakeCaseToCamelCase('user_id')).to.equal('userId');
      expect(snakeCaseToCamelCase('channel_id')).to.equal('channelId');
      expect(snakeCaseToCamelCase('user_info')).to.equal('userInfo');
      expect(snakeCaseToCamelCase('api_key')).to.equal('apiKey');
      expect(snakeCaseToCamelCase('sort_by_name')).to.equal('sortByName');
    });

    it('应该处理已经是驼峰格式的字符串', () => {
      expect(snakeCaseToCamelCase('userId')).to.equal('userId');
    });

    it('应该处理空字符串', () => {
      expect(snakeCaseToCamelCase('')).to.equal('');
    });
  });

  describe('capitalizeFirstLetter函数', () => {
    it('应该将字符串首字母大写', () => {
      expect(capitalizeFirstLetter('hello')).to.equal('Hello');
      expect(capitalizeFirstLetter('world')).to.equal('World');
      expect(capitalizeFirstLetter('test')).to.equal('Test');
    });

    it('应该处理已经首字母大写的字符串', () => {
      expect(capitalizeFirstLetter('Hello')).to.equal('Hello');
    });

    it('应该处理空字符串', () => {
      expect(capitalizeFirstLetter('')).to.equal('');
    });

    it('应该处理单个字符', () => {
      expect(capitalizeFirstLetter('a')).to.equal('A');
    });

    it('应该处理null和undefined', () => {
      expect(capitalizeFirstLetter(null as any)).to.equal(null);
      expect(capitalizeFirstLetter(undefined as any)).to.equal(undefined);
    });
  });

  describe('lowercaseFirstLetter函数', () => {
    it('应该将字符串首字母小写', () => {
      expect(lowercaseFirstLetter('Hello')).to.equal('hello');
      expect(lowercaseFirstLetter('World')).to.equal('world');
      expect(lowercaseFirstLetter('Test')).to.equal('test');
    });

    it('应该处理已经首字母小写的字符串', () => {
      expect(lowercaseFirstLetter('hello')).to.equal('hello');
    });

    it('应该处理空字符串', () => {
      expect(lowercaseFirstLetter('')).to.equal('');
    });

    it('应该处理单个字符', () => {
      expect(lowercaseFirstLetter('A')).to.equal('a');
    });

    it('应该处理null和undefined', () => {
      expect(lowercaseFirstLetter(null as any)).to.equal(null);
      expect(lowercaseFirstLetter(undefined as any)).to.equal(undefined);
    });
  });

  describe('generateUniqueString函数', () => {
    it('应该生成包含时间戳的唯一字符串', () => {
      const result1 = generateUniqueString();
      const result2 = generateUniqueString();
      
      // 每次调用应返回不同结果
      expect(result1).to.not.equal(result2);
      
      // 结果应该是字符串
      expect(typeof result1).to.equal('string');
      expect(typeof result2).to.equal('string');
      
      // 结果应该包含下划线
      expect(result1).to.include('_');
      expect(result2).to.include('_');
    });

    it('应该使用提供的前缀', () => {
      const prefix = 'test_';
      const result = generateUniqueString(prefix);
      
      // 结果应该以前缀开头
      expect(result.startsWith(prefix)).to.be.true;
    });
  });

  describe('truncateString函数', () => {
    it('应该截断超过最大长度的字符串并添加省略号', () => {
      const longString = 'This is a very long string that should be truncated';
      const maxLength = 20;
      const expected = 'This is a very lo...';
      
      expect(truncateString(longString, maxLength)).to.equal(expected);
    });

    it('不应修改短于最大长度的字符串', () => {
      const shortString = 'Short string';
      const maxLength = 20;
      
      expect(truncateString(shortString, maxLength)).to.equal(shortString);
    });

    it('应该处理刚好等于最大长度的字符串', () => {
      const exactString = 'Exactly twenty char';
      const maxLength = 20;
      
      expect(truncateString(exactString, maxLength)).to.equal(exactString);
    });

    it('应该处理空字符串', () => {
      expect(truncateString('', 10)).to.equal('');
    });

    it('应该处理null和undefined', () => {
      expect(truncateString(null as any, 10)).to.equal(null);
      expect(truncateString(undefined as any, 10)).to.equal(undefined);
    });
  });
}); 