# API文档路径: docs/v4/robot/robot_list.md
@robot @list @robot_list
Feature: 分页查询机器人虚拟昵称
  作为直播管理员
  我希望能够分页查询机器人虚拟昵称列表
  以便于管理和查看所有的机器人虚拟形象

  @robot @query
  Scenario: 成功查询机器人虚拟昵称列表
    When 我设置查询参数表格数据
      | 字段名      | 值 |
      | pageNumber  | 1  |
      | pageSize    | 10 |
    And 我基于键名 "ROBOT.LIST" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "status" 应等于 "success"
    And 响应字段 "data.pageNumber" 应等于数值 1
    And 响应字段 "data.pageSize" 应等于数值 10
    # 即使是空数组也是有效的数组
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": {
          "pageNumber": 1,
          "pageSize": 10,
          "totalPages": "*",
          "totalItems": "*",
          "contents": "*"
        },
        "success": true
      }
      """
    # And 我保存或验证快照 "robot/robot_list_response"

  @robot @pagination
  Scenario Outline: 机器人列表分页测试
    # 根据不同页码参数测试分页
    When 我设置查询参数表格数据
      | 字段名      | 值            |
      | pageNumber  | <页码>         |
      | pageSize    | <每页条数>      |
    And 我基于键名 "ROBOT.LIST" 发送请求
    Then 响应状态码应为 200
    And 响应字段 "data.pageNumber" 应等于数值 <页码>
    And 响应字段 "data.pageSize" 应等于数值 <每页条数>

    Examples:
      | 页码 | 每页条数 |
      | 1    | 5       |
      | 2    | 5       |

  @robot @create @query @delete
  Scenario: 创建机器人并查询列表验证后删除
    # 步骤1: 创建测试数据
    Given 创建一个新机器人
    
    # 步骤2: 查询所有机器人列表
    When 我设置查询参数表格数据
      | 字段名      | 值  |
      | pageNumber  | 1   |
      | pageSize    | 100  |
    And 我基于键名 "ROBOT.LIST" 发送请求
    Then 响应状态码应为 200
    
    # 步骤3: 验证查询结果中包含新创建的机器人
    And 响应字段 "data.pageNumber" 应等于数值 1
    And 响应字段 "status" 应等于 "success"
    And 响应数组 "data.contents" 包含 "name" 为 "{context.robotName}" 的元素
    
    # 步骤5: 结束场景 - 自动清理机器人
    # 通过钩子函数自动清理创建的机器人 