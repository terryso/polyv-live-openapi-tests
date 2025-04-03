# API文档路径: docs/channel/operate/delete_channel.md
@channel @delete
Feature: 删除单个频道
  作为直播管理员
  我希望能够删除不再需要的频道
  以便于保持频道列表的整洁和管理

  @channel @delete @success @create
  Scenario: 成功删除频道
    Given 创建一个新频道
    # 使用上面创建的测试频道
    And 我设置路径参数 "channelId" 为 "{context.channelId}"
    When 我基于键名 "CHANNEL.DELETE" 发送请求
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
    
  @channel @delete @parameter @error
  Scenario: 删除不存在的频道
    # 使用一个不存在的频道ID
    Given 我设置路径参数 "channelId" 为 "99999999"
    When 我基于键名 "CHANNEL.DELETE" 发送请求
    Then 响应状态码应为 400
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "message": "*",
        "data": ""
      }
      """ 