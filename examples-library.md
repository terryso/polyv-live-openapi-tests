---
description: 场景和步骤示例库，提供各种场景类型的完整代码示例
globs: src/features/**/*.feature
alwaysApply: false
---

# 示例库

本文档收集了各种场景类型的完整代码示例，供编写测试场景时参考。

## 目录

- [查询类场景](#查询类场景)
- [创建类场景](#创建类场景)
- [更新类场景](#更新类场景)
- [删除类场景](#删除类场景)
- [参数验证场景](#参数验证场景)
- [错误处理场景](#错误处理场景)
- [数据生命周期场景](#数据生命周期场景)
- [场景大纲示例](#场景大纲示例)

## 查询类场景

### 基础查询场景

```gherkin
@account @channels @search
Scenario: 成功查询频道列表
  When 我设置查询参数表格数据
    | 字段名  | 值   |
    | keyword | 测试 |
  And 我基于键名 "ACCOUNT.CHANNELS" 发送请求
  Then 响应状态码应为 200
  And 响应JSON应匹配
    """
    {
      "code": 200,
      "status": "success",
      "data": {
        "channels": "*"
      }
    }
    """
  And 响应字段 "data.channels" 应为数组
```

### 带筛选条件的查询场景

```gherkin
@account @channels @search @filter
Scenario: 按分类ID筛选频道列表
  When 我设置查询参数表格数据
    | 字段名     | 值     |
    | categoryId | 544021 |
  And 我基于键名 "ACCOUNT.CHANNELS" 发送请求
  Then 响应状态码应为 200
  And 响应JSON应匹配
    """
    {
      "code": 200,
      "status": "success",
      "data": {
        "channels": "*"
      }
    }
    """
  And 响应字段 "data.channels" 应为数组
```

### 分页查询场景

```gherkin
@robot @list @pagination
Scenario: 机器人列表基础分页
  When 我设置查询参数表格数据
    | 字段名     | 值 |
    | pageNumber | 1  |
    | pageSize   | 10 |
  And 我基于键名 "ROBOT.LIST" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "status" 应等于 "success"
  And 响应字段 "data.pageNumber" 应等于数值 1
  And 响应字段 "data.pageSize" 应等于数值 10
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
```

## 创建类场景

### 基础创建场景

```gherkin
@account @category @create @success
Scenario: 成功创建直播分类
  When 我设置以下表单参数
    | 字段名       | 值                  |
    | categoryName | 测试分类<timestamp> |
  And 我基于键名 "ACCOUNT.CATEGORY_CREATE" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "status" 应等于 "success"
  And 响应JSON应匹配
    """
    {
      "code": 200,
      "status": "success",
      "data": {
        "categoryId": "*",
        "categoryName": "测试分类*",
        "userId": "*",
        "rank": "*"
      }
    }
    """
  And 我保存响应中 "data.categoryId" 到上下文的 "categoryId"
```

### 复杂创建场景（JSON请求体）

```gherkin
@channel @create
Scenario: 成功创建频道
  When 我设置JSON请求体为表格数据
    | 字段名            | 值           |
    | name              | 测试直播频道 |
    | newScene          | topclass     |
    | template          | ppt          |
    | pureRtcEnabled    | Y            |
    | type              | normal       |
    | doubleTeacherType | normal       |
    | linkMicLimit      | 6            |
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
```

### 批量创建场景

```gherkin
@robot @save_batch @create
Scenario: 成功批量创建机器人虚拟昵称
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
```

## 更新类场景

### 基础更新场景

```gherkin
@user @global_setting @update
Scenario: 成功修改全局频道设置
  When 我基于键名 "USER.GLOBAL_SETTING_SWITCH_GET" 发送请求
  Then 响应状态码应为 200
  And 我保存响应中 "data.pptCoveredEnabled" 到上下文的 "originalPptCoveredEnabled"
  When 我设置JSON请求体为表格数据
    | 字段名            | 值 |
    | pptCoveredEnabled | Y  |
  And 我基于键名 "USER.GLOBAL_SETTING_SWITCH_UPDATE" 发送请求
  Then 响应状态码应为 200
  When 我基于键名 "USER.GLOBAL_SETTING_SWITCH_GET" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "data.pptCoveredEnabled" 应等于 "Y"
  # 恢复原始值
  When 我设置JSON请求体为表格数据
    | 字段名            | 值                                  |
    | pptCoveredEnabled | {context.originalPptCoveredEnabled} |
  And 我基于键名 "USER.GLOBAL_SETTING_SWITCH_UPDATE" 发送请求
  Then 响应状态码应为 200
```

## 删除类场景

### 基础删除场景

```gherkin
@account @category @delete
Scenario: 成功删除直播分类
  Given 创建一个新频道分类
  When 我设置表单参数 "categoryId" 为上一步响应中的 "data.categoryId"
  And 我基于键名 "ACCOUNT.CATEGORY_DELETE" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "status" 应等于 "success"
  And 响应JSON应匹配
    """
    {
      "code": 200,
      "status": "success",
      "message": "",
      "data": ""
    }
    """
```

### 批量删除场景

```gherkin
@channel @batch_delete
Scenario: 成功批量删除频道
  Given 创建一个新频道
  When 我设置JSON请求体为表格数据
    | 字段名     | 值                      |
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
```

## 参数验证场景

### 必填参数验证

```gherkin
@channel @create @validation @error
Scenario: 缺少直播名称参数
  When 我设置JSON请求体为表格数据
    | 字段名   | 值       |
    | newScene | topclass |
    | template | ppt      |
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
```

### 参数格式验证

```gherkin
@account @category @create @validation @error
Scenario: 分类名称过长
  When 我设置以下表单参数
    | 字段名       | 值                                               |
    | categoryName | 这是一个非常非常非常非常非常非常非常非常非常长的分类名称 |
  And 我基于键名 "ACCOUNT.CATEGORY_CREATE" 发送请求
  Then 响应状态码应为 400
  And 响应字段 "status" 应等于 "error"
  And 响应JSON应匹配
    """
    {
      "code": 400,
      "status": "error",
      "message": "param length is incorrect: categoryName",
      "data": ""
    }
    """
```

## 错误处理场景

### 资源不存在错误

```gherkin
@account @category @delete @error
Scenario: 删除不存在的分类ID
  When 我设置以下表单参数
    | 字段名     | 值        |
    | categoryId | 999999999 |
  And 我基于键名 "ACCOUNT.CATEGORY_DELETE" 发送请求
  Then 响应状态码应为 400
  And 响应字段 "status" 应等于 "error"
  And 响应JSON应匹配
    """
    {
      "code": 400,
      "status": "error",
      "message": "illegal category id: categoryId",
      "data": ""
    }
    """
```

### 业务规则错误

```gherkin
@account @category @delete @error
Scenario: 尝试删除默认分类
  When 我设置以下表单参数
    | 字段名     | 值     |
    | categoryId | 544021 |
  And 我基于键名 "ACCOUNT.CATEGORY_DELETE" 发送请求
  Then 响应状态码应为 400
  And 响应字段 "status" 应等于 "error"
  And 响应JSON应匹配
    """
    {
      "code": 400,
      "status": "error",
      "message": "can't change default category",
      "data": ""
    }
    """
```

## 数据生命周期场景

### 创建-查询-验证场景

```gherkin
@category @create @account
Scenario: 创建分类并查询分类列表
  Given 创建一个新频道分类
  And 我保存响应中 "data.categoryId" 到上下文的 "categoryId"
  When 我设置查询参数表格数据
    | 字段名 | 值 |
  And 我基于键名 "ACCOUNT.CATEGORY_LIST" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "status" 应等于 "success"
  And 响应数组 "data" 包含 "categoryId" 为 "{context.categoryId}" 的元素
```

### 创建-更新-验证-删除场景

```gherkin
@channel @create @update @delete
Scenario: 创建频道并更新其信息后删除
  # 1. 创建频道
  Given 创建一个新频道
  And 我保存响应中 "data.channelId" 到上下文的 "channelId"
  
  # 2. 更新频道信息
  When 我设置JSON请求体为表格数据
    | 字段名    | 值                  |
    | channelId | {context.channelId} |
    | name      | 更新后的频道名称    |
  And 我基于键名 "CHANNEL.UPDATE" 发送请求
  Then 响应状态码应为 200
  
  # 3. 验证更新成功
  When 我设置查询参数表格数据
    | 字段名    | 值                  |
    | channelId | {context.channelId} |
  And 我基于键名 "CHANNEL.DETAIL" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "data.name" 应等于 "更新后的频道名称"
  
  # 4. 场景结束后自动清理（依赖@create标签和钩子函数）
```

## 场景大纲示例

### 分页参数测试

```gherkin
@robot @list @pagination
Scenario Outline: 机器人列表分页测试
  When 我设置查询参数表格数据
    | 字段名      | 值            |
    | pageNumber  | <页码>        |
    | pageSize    | <每页条数>    |
  And 我基于键名 "ROBOT.LIST" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "data.pageNumber" 应等于数值 <页码>
  And 响应字段 "data.pageSize" 应等于数值 <每页条数>

  Examples:
    | 页码 | 每页条数 |
    | 1    | 5        |
    | 2    | 5        |
```

### 边界值测试

```gherkin
@user @global_setting @validation
Scenario Outline: 不同类型字段的边界值测试
  When 我设置JSON请求体为表格数据
    | 字段名   | 值        |
    | <字段名> | <测试值>  |
  And 我基于键名 "USER.GLOBAL_SETTING_UPDATE" 发送请求
  Then 响应状态码应为 <预期状态码>
  And 响应字段 "status" 应等于 "<预期状态>"
  And 响应字段 "message" 应包含 "<错误消息>"

  Examples:
    | 字段名      | 测试值   | 预期状态码 | 预期状态 | 错误消息     |
    | maxDuration | -1       | 400        | error    | 参数不合法   |
    | maxDuration | 0        | 400        | error    | 参数不能为零 |
    | maxDuration | 36001    | 400        | error    | 超出最大限制 |
    | maxDuration | 3600     | 200        | success  |             |
```

### 多条件组合测试

```gherkin
@account @channels @search @filter
Scenario Outline: 组合条件筛选频道列表
  When 我设置查询参数表格数据
    | 字段名      | 值        |
    | <筛选字段>  | <筛选值>  |
    | pageSize    | 10        |
  And 我基于键名 "ACCOUNT.CHANNELS" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "data.channels" 应为数组

  Examples:
    | 筛选字段    | 筛选值     |
    | keyword     | 测试       |
    | categoryId  | 544021     |
    | status      | published  |
    | labelId     | label123   |
``` 