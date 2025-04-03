# API文档路径: docs/account/delete_category.md
@account @category
Feature: 删除直播分类
  作为直播管理员
  我希望能够删除直播分类
  以便于整理和管理直播频道分类

  @account @delete
  Scenario: 成功删除直播分类
    Given 创建一个新频道分类
    When 我设置表单参数 "categoryId" 为上一步响应中的 "data.categoryId"
    And 我基于键名 "ACCOUNT.CATEGORY_DELETE" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "status" 应等于 "success"
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "message": "",
        "data": ""
      }
      """

  @account @delete @validation @error
  Scenario: 尝试删除默认分类
    When 我设置以下表单参数
      | 字段名       | 值             |
      | categoryId   | 544021     |
    And 我基于键名 "ACCOUNT.CATEGORY_DELETE" 发送请求
    Then 响应状态码应为 400
    And 响应字段 "status" 应等于 "error"
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "message": "can't change default category",
        "data": ""
      }
      """
      
  @account @delete @validation @error
  Scenario: 缺少分类ID参数
    When 我设置以下表单参数
      | 字段名       | 值             |
    And 我基于键名 "ACCOUNT.CATEGORY_DELETE" 发送请求
    Then 响应状态码应为 400
    And 响应字段 "status" 应等于 "error"
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "message": "*categoryId*",
        "data": ""
      }
      """
      
  @account @delete @validation @error
  Scenario: 删除不存在的分类ID
    When 我设置以下表单参数
      | 字段名       | 值                |
      | categoryId   | 999999999        |
    And 我基于键名 "ACCOUNT.CATEGORY_DELETE" 发送请求
    Then 响应状态码应为 400
    And 响应字段 "status" 应等于 "error"
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "message": "illegal category id: categoryId",
        "data": ""
      }
      """ 