# API文档路径: docs/channel/operate/batch_delete_channels.md
@channel @batch_delete_channels
Feature: 批量删除频道
  作为直播管理员
  我希望能够批量删除直播频道
  以便于高效管理和清理不需要的频道

  @channel @delete
  Scenario: 成功批量删除频道
    Given 创建一个新频道
    When 我设置JSON请求体为表格数据
      | 字段名      | 值                  |
      | channelIds | ["{context.channelId}"] |
    And 我基于键名 "CHANNEL.BATCH_DELETE" 发送请求
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