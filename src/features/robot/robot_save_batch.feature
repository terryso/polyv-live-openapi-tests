# API文档路径: docs/v4/robot/robot_save_batch.md
@robot @save_batch
Feature: 批量创建机器人虚拟昵称
  作为直播管理员
  我希望能够批量创建机器人虚拟昵称
  以便于批量管理虚拟用户形象

  @robot @create
  Scenario: 成功批量创建机器人虚拟昵称
    # 使用正确的步骤顺序和JSON结构
    When 我设置JSON请求体为
      """
      [
        {
          "name": "测试机器人1",
          "avatar": "https://liveimages.videocc.net/defaultImg/avatar/viewer.png"
        },
        {
          "name": "测试机器人2"
        }
      ]
      """
    And 我基于键名 "ROBOT.SAVE_BATCH" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "status" 应等于 "success"
    And 响应字段 "success" 应为布尔值 true
    And 我保存或验证快照 "robot/robot_save_batch_response"

  @robot @validation
  Scenario: 机器人名称长度测试
    When 我设置JSON请求体为
      """
      [
        {
          "name": "这是一个超过二十个字符长度的测试机器人名称用于验证边界条件这是一个超过二十个字符长度的测试机器人名称用于验证边界条件"
        }
      ]
      """
    And 我基于键名 "ROBOT.SAVE_BATCH" 发送请求
    # 服务器接受长名称，返回成功状态码
    Then 响应状态码应为 200
    And 响应字段 "status" 应等于 "success"
    And 响应字段 "success" 应为布尔值 true
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": null,
        "success": true
      }
      """

  @robot @batch @save @snapshot
  Scenario: 批量保存机器人配置
    # 测试创建多个机器人
    When 我设置JSON请求体为
      """
      [
        {"name": "测试机器人1"},
        {"name": "测试机器人2"},
        {"name": "测试机器人3"}
      ]
      """
    And 我基于键名 "ROBOT.SAVE_BATCH" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "status" 应等于 "success"
    And 响应字段 "success" 应为布尔值 true

  @robot @robot_save_batch @robot @custom_name
  Scenario: 创建指定名称的机器人并验证
    Given 创建名为 "测试自定义名称机器人" 的机器人
    When 我设置查询参数表格数据
      | 字段名     | 值 |
      | pageNumber | 1  |
      | pageSize   | 50 |
    And 我基于键名 "ROBOT.LIST" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "data.pageNumber" 应等于数值 1
    And 响应字段 "status" 应等于 "success"
    And 响应数组 "data.contents" 包含 "name" 为 "测试自定义名称机器人" 的元素 