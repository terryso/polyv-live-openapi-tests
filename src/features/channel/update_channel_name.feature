# API文档路径: docs/channel/update_channelname.md
@channel @update_channel_name
Feature: 修改频道名称
  作为直播管理员
  我希望能够修改直播频道的名称
  以便于更新频道信息

  @update @create
  Scenario: 成功修改频道名称
    # 先创建一个测试频道
    Given 创建一个新频道
    And 我保存响应中 "data.channelId" 到上下文的 "channelId"
    # 更新频道名称
    When 我设置查询参数 "name" 为 "更新后的频道名称"
    And 我设置路径参数 "channelId" 为 "{context.channelId}"
    And 我基于键名 "CHANNEL.UPDATE_NAME" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "message": "",
        "data": true
      }
      """
    # 验证更新是否生效
    When 我设置查询参数 "channelId" 为 "{context.channelId}"
    And 我基于键名 "CHANNEL.DETAIL" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "data.name" 应等于 "更新后的频道名称"

  @update @validation @error
  Scenario: 无效的频道ID
    When 我设置查询参数 "name" 为 "测试频道名称"
    And 我设置路径参数 "channelId" 为 "invalidChannelId123"
    And 我基于键名 "CHANNEL.UPDATE_NAME" 发送请求
    Then 响应状态码应为 400
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "message": "param type error",
        "data": ""
      }
      """

  @update
  Scenario: 不提供频道名称参数也能更新成功
    # 先创建一个测试频道
    Given 创建一个新频道
    And 我保存响应中 "data.channelId" 到上下文的 "channelId"
    # 更新时不提供name参数
    When 我设置路径参数 "channelId" 为 "{context.channelId}"
    And 我基于键名 "CHANNEL.UPDATE_NAME" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "message": "",
        "data": true
      }
      """ 