# API文档路径: docs/v4/robot/robot_delete_batch.json
@robot @robot_delete_batch
Feature: 批量删除机器人信息
  作为直播管理员
  我希望能够批量删除机器人信息
  以便于高效管理和清理不需要的机器人虚拟昵称

  @robot @create @delete
  Scenario: 成功批量删除机器人信息
    # 步骤1: 创建测试数据 - 批量创建两个机器人
    When 我设置JSON请求体为
      """
      [
        {"name":"测试机器人1"},
        {"name":"测试机器人2"}
      ]
      """
    And 我基于键名 "ROBOT.SAVE_BATCH" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "requestId": "*",
        "data": null,
        "success": true
      }
      """
    
    # 获取最新的机器人列表
    When 我设置查询参数表格数据
      | 字段名      | 值  |
      | pageNumber  | 1   |
      | pageSize    | 2   |
    And 我基于键名 "ROBOT.LIST" 发送请求
    Then 响应状态码应为 200
    # 保存前两个机器人ID，因为创建的总是最新的
    And 我保存响应中 "data.contents[0].id" 到上下文的 "robotId1"
    And 我保存响应中 "data.contents[1].id" 到上下文的 "robotId2"
    
    # 将获取的ID保存到上下文变量，也打印出来便于确认
    Then 我保存响应中 "data.contents[0].name" 到上下文的 "robotName1"
    And 我保存响应中 "data.contents[1].name" 到上下文的 "robotName2"

    # 步骤2: 删除刚创建的机器人信息
    When 我设置以下表单参数
      | 字段名 | 值                                     |
      | ids    | {context.robotId1},{context.robotId2} |
    And 我基于键名 "ROBOT.DELETE_BATCH" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "requestId": "*",
        "data": null,
        "success": true
      }
      """
    
    # 步骤3: 验证删除结果 - 确认已删除的机器人不再存在
    When 我设置查询参数表格数据
      | 字段名      | 值  |
      | pageNumber  | 1   |
      | pageSize    | 50  |
    And 我基于键名 "ROBOT.LIST" 发送请求
    Then 响应状态码应为 200
    
    # 验证删除后列表中不再包含已删除的机器人ID
    And 响应数组 "data.contents" 不包含 "id" 为 "{context.robotId1}" 的元素
    And 响应数组 "data.contents" 不包含 "id" 为 "{context.robotId2}" 的元素