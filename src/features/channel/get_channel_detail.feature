# API文档路径: docs/v4/channel/operate/get_channel_detail.md
@channel @detail
Feature: 查询频道信息
  作为直播管理员
  我希望能够查询指定频道的详细信息
  以便于了解和管理频道的各项配置和状态 

  @channel @create @query @delete
  Scenario: 创建频道并查询其详情
    Given 创建一个新频道

    # 查询刚创建的频道详情
    When 我设置查询参数表格数据
      | 字段名      | 值                   |
      | channelId  | {context.channelId}  |
    And 我基于键名 "CHANNEL.DETAIL" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "status" 应等于 "success"
    And 响应字段 "data.newScene" 应等于 "topclass"
    And 响应字段 "data.template" 应等于 "ppt"
    And 响应字段 "data.pureRtcEnabled" 应等于 "Y"
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": {
          "channelId": "{context.channelId}",
          "name": "*测试频道*",
          "watchStatus": "*",
          "watchStatusText": "*"
        }
      }
      """