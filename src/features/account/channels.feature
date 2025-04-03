# API文档路径: docs/account/channels.md
@account @channels
Feature: 查询频道列表
  作为直播管理员
  我希望能够查询频道列表
  以便管理和查看所有的直播频道

  @account @search
  Scenario: 成功查询频道列表
    When 我设置查询参数表格数据
      | 字段名     | 值      |
      | keyword    | 测试    |
    And 我基于键名 "ACCOUNT.CHANNELS" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": {
          "channels": "*"
        }
      }
      """
    And 响应字段 "data.channels" 应为数组

  @account @search @filter
  Scenario: 按分类ID筛选频道列表
    When 我设置查询参数表格数据
      | 字段名      | 值       |
      | categoryId | 544021   |
    And 我基于键名 "ACCOUNT.CHANNELS" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": {
          "channels": "*"
        }
      }
      """
    And 响应字段 "data.channels" 应为数组

  @account @search @filter
  Scenario: 按标签ID筛选频道列表
    When 我设置查询参数表格数据
      | 字段名   | 值               |
      | labelId | e4dc1ftj7kaofufc |
    And 我基于键名 "ACCOUNT.CHANNELS" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": {
          "channels": "*"
        }
      }
      """
    And 响应字段 "data.channels" 应为数组

  @account @search @validation @error
  Scenario: 无效签名的错误处理
    When 我设置查询参数表格数据
      | 字段名  | 值                  |
      | sign   | INVALID_SIGNATURE   |
    And 我基于键名 "ACCOUNT.CHANNELS" 发送请求
    Then 响应状态码应为 403
    And 响应JSON应匹配
      """
      {
        "code": 403,
        "status": "error",
        "message": "*invalid signature*"
      }
      """