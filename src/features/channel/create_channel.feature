# API文档路径: docs/v4/channel/create.md
@channel @create_channel
Feature: 创建频道
  作为直播管理员
  我希望能够创建直播频道
  以便于进行直播活动

  @channel @create
  Scenario: 成功创建频道
    When 我设置JSON请求体为表格数据
      | 字段名           | 值               |
      | name            | 测试直播频道       |
      | newScene        | topclass         |
      | template        | ppt              |
      | pureRtcEnabled  | Y                |
      | type            | normal           |
      | doubleTeacherType | normal         |
      | linkMicLimit    | 6                |
    And 我基于键名 "CHANNEL.CREATE" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": {
          "channelId": "*",
          "userId": "*",
          "channelPasswd": "*"
        },
        "success": true
      }
      """
    And 我保存响应中 "data.channelId" 到上下文的 "channelId"

  @channel @create @validation @error
  Scenario: 缺少直播名称参数
    When 我设置JSON请求体为表格数据
      | 字段名           | 值               |
      | newScene        | topclass         |
      | template        | ppt              |
    And 我基于键名 "CHANNEL.CREATE" 发送请求
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "success": false,
        "error": {
          "code": 10001,
          "desc": "直播名称不能为空"
        }
      }
      """

  @channel @create @validation @error
  Scenario: 缺少直播场景参数
    When 我设置JSON请求体为表格数据
      | 字段名           | 值               |
      | name            | 测试直播频道       |
      | template        | ppt              |
    And 我基于键名 "CHANNEL.CREATE" 发送请求
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "success": false,
        "error": {
          "code": 10001,
          "desc": "直播场景不能为空"
        }
      }
      """

  @channel @create @validation @error
  Scenario: 研讨会场景模板校验
    When 我设置JSON请求体为表格数据
      | 字段名           | 值               |
      | name            | 测试直播频道       |
      | newScene        | seminar          |
      | template        | ppt2              |
    And 我基于键名 "CHANNEL.CREATE" 发送请求
    And 响应JSON应匹配
      """
      {
        "code": 400,
        "status": "error",
        "success": false,
        "error": {
          "code": 10001,
          "desc": "直播模板值不正确"
        }
      }
      """ 