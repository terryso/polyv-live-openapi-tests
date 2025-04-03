# API文档路径: docs/user/list_label.md
@user @label
Feature: 分页查询标签
  作为直播管理员
  我希望能够分页查询标签
  以便于管理和查看所有的标签数据

  @page
  Scenario: 成功查询标签列表
    When 我设置查询参数表格数据
      | 字段名      | 值  |
      | pageNumber  | 1   |
      | pageSize    | 10  |
    And 我基于键名 "USER.LABEL_PAGE" 发送请求
    Then 响应状态码应为 200
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