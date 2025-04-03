# API文档路径: docs/account/create_category.md
@account @category
Feature: 创建直播分类
  作为直播管理员
  我希望能够创建直播分类
  以便于对直播频道进行分类管理

  @account @create @category @success
  Scenario: 成功创建直播分类
    When 我设置以下表单参数
      | 字段名       | 值       |
      | categoryName | 测试分类<timestamp>  |
    And 我基于键名 "ACCOUNT.CATEGORY_CREATE" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "status" 应等于 "success"
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": {
          "categoryId": "*",
          "categoryName": "测试分类*",
          "userId": "*",
          "rank": "*"
        }
      }
      """
    # 手动保存分类ID到上下文中，使钩子函数能清理它
    And 我保存响应中 "data.categoryId" 到上下文的 "categoryId"
    
  @account @create @query @category
  Scenario: 创建分类并查询分类列表
    # 步骤1: 创建测试数据
    Given 创建一个新频道分类
    # 手动保存分类ID到上下文中，使钩子函数能清理它
    And 我保存响应中 "data.categoryId" 到上下文的 "categoryId"
    
    # 步骤2: 查询分类列表
    When 我设置查询参数表格数据
      | 字段名 | 值 |
    And 我基于键名 "ACCOUNT.CATEGORY_LIST" 发送请求
    
    # 步骤3: 验证查询结果
    Then 响应状态码应为 200
    And 响应字段 "status" 应等于 "success"
    # 验证返回的分类列表中包含了创建的分类ID
    And 响应数组 "data" 包含 "categoryId" 为 "{context.categoryId}" 的元素
    
  @account @create @validation @error @category
  Scenario: 缺少分类名称参数
    # 步骤1: 发送没有categoryName参数的请求
    When 我设置以下表单参数
      | 字段名 | 值 |
    And 我基于键名 "ACCOUNT.CATEGORY_CREATE" 发送请求
    
    # 步骤2: 验证错误响应
    Then 响应状态码应为 400
    And 响应字段 "status" 应等于 "error"
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "message": "param should not be empty: categoryName",
        "data": ""
      }
      """
    
  @account @create @validation @error @category
  Scenario: 分类名称过长
    # 步骤1: 发送分类名称过长的请求
    When 我设置以下表单参数
      | 字段名       | 值       |
      | categoryName | 这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的分类名称 |
    And 我基于键名 "ACCOUNT.CATEGORY_CREATE" 发送请求
    
    # 步骤2: 验证错误响应
    Then 响应状态码应为 400
    And 响应字段 "status" 应等于 "error"
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "message": "param length is incorrect: categoryName",
        "data": ""
      }
      """
    
    