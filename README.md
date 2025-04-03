# 保利威API测试框架

基于Cucumber.js和PactumJS的BDD API自动化测试框架，用于测试保利威直播API，支持TypeScript，提供中文测试描述和步骤定义。

## 特性

- 🚀 基于BDD的测试框架，使用中文Gherkin语法
- 💪 强大的TypeScript支持，提供完整类型定义
- 📝 中文化的测试描述，符合直播业务场景
- 🔄 完整的API测试生命周期管理
- 📊 自动化测试报告生成
- 🎯 场景驱动开发方法论
- 🛠 内置保利威API测试工具，包括签名生成等功能
- 🔍 支持深度JSON结构匹配和验证
- 📸 自动快照测试和比对功能
- 🔄 支持上下文数据保存和复用
- 🧪 全面的测试场景类型支持
- 🧹 测试数据自动清理机制

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量，包括API访问密钥和基础URL。

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成报告
npm run test:report

# 运行测试并显示详细输出
npm run test:verbose

# 运行指定标签的测试
npm run test:verbose -- --tags "@channel"
npm run test:verbose -- --tags "@account and @create"
```

## 项目结构

```
live-openapi-tests/
├── .cursor/           # Cursor IDE配置
│   └── rules/         # 开发规范和指引
│       └── tasks/     # 任务相关规范文件
│           ├── 010-feature-generation.mdc   # 特性文件生成规范
│           ├── 020-steps-generation.mdc     # 步骤文件生成规范
│           └── 030-scene-generation.mdc     # 场景添加规范
├── docs/              # API文档目录
│   └── v4/            # V4版本API文档
│       ├── user/      # 用户相关API文档
│       ├── channel/   # 频道相关API文档
│       └── ...        # 其他API文档
├── scripts/           # 工具脚本
├── src/
│   ├── api/           # API请求封装
│   │   ├── client.ts  # API客户端
│   │   └── urls.ts    # API URL配置
│   ├── features/      # 功能测试文件，按模块组织
│   │   ├── account/   # 账户相关功能
│   │   ├── channel/   # 频道相关功能
│   │   └── user/      # 用户相关功能
│   ├── steps/         # 步骤定义
│   │   └── common/    # 通用步骤定义
│   │       ├── data.steps.ts         # 数据准备步骤
│   │       └── api.steps.ts # 增强API测试步骤
│   ├── support/       # 支持文件
│   ├── snapshots/     # 快照测试文件
│   └── reports/       # 测试报告输出目录
├── .env.example       # 环境变量示例
├── .env               # 环境变量配置（本地开发）
├── cucumber.js        # Cucumber配置
├── package.json       # 项目配置
└── tsconfig.json      # TypeScript配置
```

## 测试命令与工作流

项目提供多种便捷命令简化测试开发流程：

### 基本测试命令

- `/test` - 执行所有测试用例
  ```bash
  npm test
  ```

- `/test 标签名 [标签名...]` - 执行标签测试
  ```bash
  # 单标签格式
  npm run test:verbose -- --tags '@user'
  
  # 多标签格式（AND关系）
  npm run test:verbose -- --tags '@login and @user'
  ```

### 功能开发命令

- `/add_feat -d API文档路径 [描述]` - 使用本地API文档生成功能文件
  ```bash
  # 例如：生成用户信息查询接口的特性文件
  /add_feat -d docs/v4/user/update_global_footer.md 修改页脚设置
  ```

- `/add_feat -y API_ID [描述]` - 从YAPI获取接口文档并生成功能文件
  ```bash
  # 例如：生成积分打赏设置接口的特性文件
  /add_feat -y 1670 设置全局积分打赏
  ```

- `/steps feature路径` - 生成步骤定义文件
  ```bash
  # 例如：为登录特性生成步骤定义
  /steps src/features/user/update_global_footer.feature
  ```

- `/add_scene feature路径` - 为特性添加新的测试场景
  ```bash
  # 例如：为登录特性添加新场景
  /add_scene src/features/user/update_global_footer.feature
  ```

- `/preview_feat -d API文档路径 [描述]` - 预览完整功能场景
  ```bash
  # 例如：预览用户信息查询接口的特性
  /preview_feat -d docs/v4/user/update_global_footer.md 修改页脚设置
  ```

## 编写测试

### 1. 创建功能文件

功能文件使用Gherkin语法，以`.feature`后缀保存在`src/features`目录下，按模块分类组织：

```gherkin
# API文档路径: docs/v4/user/update_global_footer.json
@user @global_setting
Feature: 修改页脚设置
  作为直播管理员
  我希望能够修改页脚设置
  以便于根据需求调整直播系统的页脚显示配置

  @user @update
  Scenario: 成功修改页脚设置
    # 先查询当前的页脚设置
    When 我基于键名 "USER.GLOBAL_SETTING_FOOTER_GET" 发送 "GET" 请求
    Then 响应状态码应为 200
    And 我保存响应中 "data.showFooterEnabled" 到上下文的 "originalShowFooterEnabled"
    
    # 修改页脚设置
    When 我设置JSON请求体为表格数据
      | 字段名               | 值                      |
      | showFooterEnabled    | Y                       |
      | footerText           | 保利威提供技术支持       |
    And 我基于键名 "USER.GLOBAL_SETTING_FOOTER_UPDATE" 发送 "POST" 请求
    Then 响应状态码应为 200
```

### 2. 使用内置步骤

项目提供了大量预定义步骤，特别是在`src/steps/common/api.steps.ts`中：

#### API请求相关步骤

- 设置请求体：
  ```gherkin
  我设置JSON请求体为表格数据
    | 字段名 | 值 |
    | name  | 测试频道 |
  ```

- 设置查询参数：
  ```gherkin
  我设置查询参数表格数据
    | 字段名   | 值    |
    | keyword  | 测试  |
  ```

- 发送请求（推荐的简化版本）：
  ```gherkin
  # 无需指定HTTP方法，自动从API配置获取
  我基于键名 "USER.GLOBAL_SETTING_FOOTER_UPDATE" 发送请求
  ```

- 发送请求（带方法的兼容模式）：
  ```gherkin
  # 需要手动指定或覆盖HTTP方法时使用
  我基于键名 "USER.GLOBAL_SETTING_FOOTER_UPDATE" 发送 "POST" 请求
  ```

#### 响应验证步骤

- 状态码验证：
  ```gherkin
  响应状态码应为 200
  ```

- 字段验证：
  ```gherkin
  响应字段 "data.showFooterEnabled" 应等于 "Y"
  ```

- JSON匹配：
  ```gherkin
  响应JSON应匹配
    """
    {
      "code": 200,
      "status": "success",
      "data": true
    }
    """
  ```

- 快照测试：
  ```gherkin
  我保存或验证快照 "user/global_setting_footer_update_response"
  ```

#### 上下文数据操作

- 保存响应数据：
  ```gherkin
  我保存响应中 "data.channelId" 到上下文的 "channelId"
  ```

- 使用上下文数据：
  ```gherkin
  我设置JSON请求体为表格数据
    | 字段名   | 值                    |
    | channelId  | {context.channelId}  |
  ```

### 3. 常见测试场景类型

根据测试场景类型使用对应的标签和模板：

#### 基础查询场景
```gherkin
@user @search
Scenario: 成功查询页脚设置
  When 我基于键名 "USER.GLOBAL_SETTING_FOOTER_GET" 发送请求
  Then 响应状态码应为 200
```

#### 创建或更新场景
```gherkin
@user @update
Scenario: 成功修改页脚设置
  # 先保存当前设置
  When 我基于键名 "USER.GLOBAL_SETTING_FOOTER_GET" 发送请求
  Then 响应状态码应为 200
  And 我保存响应中 "data.showFooterEnabled" 到上下文的 "originalShowFooterEnabled"
  
  # 更新设置
  When 我设置JSON请求体为表格数据
    | 字段名            | 值  |
    | showFooterEnabled | Y   |
  And 我基于键名 "USER.GLOBAL_SETTING_FOOTER_UPDATE" 发送请求
  Then 响应状态码应为 200
  
  # 验证更新成功
  When 我基于键名 "USER.GLOBAL_SETTING_FOOTER_GET" 发送请求
  Then 响应状态码应为 200
  And 响应字段 "data.showFooterEnabled" 应等于 "Y"
  
  # 恢复原始设置
  When 我设置JSON请求体为表格数据
    | 字段名            | 值                                  |
    | showFooterEnabled | {context.originalShowFooterEnabled} |
  And 我基于键名 "USER.GLOBAL_SETTING_FOOTER_UPDATE" 发送请求
  Then 响应状态码应为 200
```

#### 参数验证场景
```gherkin
@user @validation @error
Scenario: 参数长度超限
  When 我设置JSON请求体为表格数据
    | 字段名    | 值                                   |
    | footerText | 这是一个超过十二个字符的页脚文案会导致错误 |
  And 我基于键名 "USER.GLOBAL_SETTING_FOOTER_UPDATE" 发送 "POST" 请求
  Then 响应状态码应为 400
```

#### 数据生命周期场景
```gherkin
@channel @create @query @delete
Scenario: 创建频道并查询其详情
  # 创建数据
  Given 创建一个新频道
  And 我保存响应中 "data.channelId" 到上下文的 "channelId"

  # 查询操作
  When 我设置查询参数表格数据
    | 字段名     | 值                   |
    | channelId  | {context.channelId}  |
  And 我基于键名 "CHANNEL.DETAIL" 发送 "GET" 请求
  
  # 验证结果
  Then 响应状态码应为 200
```

## 高级功能

### 深度JSON匹配

支持使用通配符和模式匹配验证复杂的JSON响应：

```gherkin
响应JSON应匹配
  """
  {
    "code": 200,
    "data": {
      "id": "*",           # 任意值匹配
      "name": "*测试*",     # 包含"测试"的字符串
      "createTime": "*"    # 任意值匹配
    }
  }
  """
```

### 快照测试

使用快照测试比对API响应：

```gherkin
# 创建或验证快照
我保存或验证快照 "user/global_setting_footer_update_response"
```

快照文件存储在 `src/snapshots` 目录下。

### 数据准备和清理

使用标签和钩子实现测试数据的自动创建和清理：

```gherkin
@channel @create @delete
Scenario: 测试频道操作
  Given 创建一个新频道
  And 我保存响应中 "data.channelId" 到上下文的 "channelId"
  # 具有 @create 标签的场景会在测试结束后自动清理资源
```

## 开发规范

项目遵循严格的BDD测试开发规范：

1. **特性文件组织**
   - 按业务模块组织目录结构
   - 一个特性文件对应一个API功能
   - 标签命名规范化

2. **场景编写规范**
   - 场景命名应清晰描述测试目的
   - 使用Given-When-Then结构
   - 避免场景间的依赖

3. **API URL命名规范**
   - 扁平化命名（如 `USER.GLOBAL_SETTING_FOOTER_UPDATE`）
   - 全大写，使用下划线分隔
   - 模块名作为前缀

4. **完整项目规范可参考**
   - `.cursor/rules/tasks/010-feature-generation.mdc` - 特性文件生成规范
   - `.cursor/rules/tasks/020-steps-generation.mdc` - 步骤文件生成规范
   - `.cursor/rules/tasks/030-scene-generation.mdc` - 场景添加规范

## 常见问题

### 1. 环境变量配置

确保在运行测试前正确配置 `.env` 文件，需要设置：

```env
API_BASE_URL=https://api.example.com
POLYV_API_BASE_URL=https://api.polyv.net
POLYV_APP_ID=your_app_id
POLYV_APP_SECRET=your_app_secret
```

### 2. 测试报告生成

测试报告将生成在 `src/reports` 目录下：

```bash
npm run test:report
# 生成的报告文件: src/reports/cucumber-report.json
```

### 3. 调试测试

使用 `test:verbose` 命令查看详细的测试输出：

```bash
npm run test:verbose
```

### 4. 自定义步骤找不到

如果提示步骤未定义，请检查：
- 步骤文件是否放在 `src/steps` 目录下
- 命令行是否包含 `--require 'src/steps/**/*.ts'` 参数

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 遵循项目规范编写代码和测试
4. 提交变更
5. 创建 Pull Request

## 许可证

MIT 

## 请求步骤的重要改进

项目对API请求步骤进行了重构优化，支持两种请求发送方式：

### 1. 简化版请求步骤（推荐）
```gherkin
我基于键名 "USER.GLOBAL_SETTING_FOOTER_GET" 发送请求
```
- **优点**：简洁，易读，无需指定HTTP方法
- **原理**：自动从API配置中读取正确的方法（GET/POST等）
- **使用场景**：大多数常规API调用

### 2. 带方法的请求步骤（兼容模式）
```gherkin
我基于键名 "USER.GLOBAL_SETTING_FOOTER_GET" 发送 "GET" 请求
```
- **优点**：灵活，可覆盖默认配置的方法
- **使用场景**：需要临时覆盖默认HTTP方法的特殊情况

### 选择指南
1. 新编写的测试场景应**优先使用简化版请求步骤**
2. 仅在需要覆盖默认HTTP方法时，才使用带方法的请求步骤
3. 现有的测试场景可以逐步迁移到简化版本，但两种方式都能正常工作 

## CI/CD集成与钉钉通知

项目支持GitLab CI/CD集成，并配置了自动发送钉钉通知的功能，帮助团队及时了解测试结果。

### 钉钉机器人通知

测试框架集成了钉钉机器人通知功能，可以在测试完成后自动发送测试结果到指定的钉钉群。

#### 配置钉钉机器人

1. 在钉钉群中添加自定义机器人（群设置 -> 智能群助手 -> 添加机器人 -> 自定义）
2. 配置机器人安全设置，可以选择关键词或签名方式
3. 获取机器人的Webhook地址中的access_token
4. 如果使用签名方式，还需要记录下签名的密钥（secret）

#### 配置环境变量

在`.env`文件中添加钉钉机器人配置：

```bash
# 钉钉机器人配置
DINGTALK_ACCESS_TOKEN=your_access_token
DINGTALK_SECRET=your_secret_key
SEND_DINGTALK_NOTIFICATION=false
```

#### 手动触发通知

可以通过命令行手动发送测试结果通知：

```bash
# 格式：ts-node src/utils/send-notification.ts [测试名称] [总场景数] [通过场景数] [失败场景数] [耗时(毫秒)] [详情URL]
ts-node src/utils/send-notification.ts "保利威直播API测试" 25 24 1 15000 "https://gitlab.com/example/project/-/pipelines/123"
```

#### GitLab CI/CD集成

项目提供了`.gitlab-ci.yml.example`文件作为GitLab CI配置示例，包含了自动测试和发送钉钉通知的配置：

1. 在GitLab项目中添加CI/CD变量：
   - `DINGTALK_ACCESS_TOKEN`：钉钉机器人的access_token
   - `DINGTALK_SECRET`：钉钉机器人的加签密钥（如果启用了加签安全设置）

2. 复制`.gitlab-ci.yml.example`为`.gitlab-ci.yml`并根据项目需求调整

CI流程将在测试完成后自动发送包含测试结果的通知到钉钉群，包括：
- 测试通过/失败状态
- 测试场景统计（总数/通过/失败）
- 测试耗时
- 测试详情链接 