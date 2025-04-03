# API文档路径: docs/user/label_page.md
@user @label @label_page
Feature: 分页查询标签
  作为系统管理员
  我希望能够分页查询标签列表
  以便于对标签进行管理和使用

  @pagination
  Scenario: 成功分页查询标签列表
    When 我设置查询参数表格数据
      | 字段名     | 值      |
      | pageNumber | 1       |
      | pageSize   | 10      |
    And 我基于键名 "USER.LABEL_PAGE" 发送请求
    Then 响应状态码应为 200
    And 响应JSON应匹配
      """
      {
        "code": 200,
        "status": "success",
        "data": {
          "pageNumber": "*",
          "pageSize": "*",
          "totalPages": "*",
          "totalItems": "*",
          "contents": "*"
        },
        "success": true
      }
      """ 