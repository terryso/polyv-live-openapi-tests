# 修改频道名称

## 接口描述

```
1、设置频道名称
2、接口URL中的{channelId}为频道号
3、接口支持https协议
```

## 接口URL

```
http://api.polyv.net/live/v2/channels/{channelId}/update
```

## 请求方式

```
POST
```

## 接口约束

1、接口同时支持HTTP、HTTPS，建议使用HTTPS确保接口安全，接口调用有频率限制

## 请求参数描述

| 参数名    | 必选  | 类型    | 说明                                           |
| --------- | ----- | ------- | ---------------------------------------------- |
| appId     | true  | String  | 账号appId                                      |
| timestamp | true  | Long    | 当前13位毫秒级时间戳，3分钟内有效              |
| sign      | true  | String  | 签名，为32位大写的MD5值                        |
| name      | true  | String  | 修改后的频道名称                              |

## 示例

```
http://api.polyv.net/live/v2/channels/1965681/update
```

表单参数：
```
appId=frlr1zazn3&name=Junit%E6%B5%8B%E8%AF%95%28%E5%8B%BF%E5%88%A0%29\_%E6%B5%8B%E8%AF%95&sign=4E5BB446930D8E9B5C61F6EF1C1FF992×tamp=1621840467218
```

## 响应参数描述

| 参数名  | 类型    | 说明                                        |
| ------- | ------- | ------------------------------------------- |
| code    | Integer | 响应状态码，200为成功返回，非200为失败     |
| status  | String  | 响应状态文本信息                           |
| message | String  | 响应描述信息，当code为400或者500的时候，辅助描述错误原因 |
| data    | String  | 请求成功时，返回值是true，请求失败时，返回值是空 |

## 响应示例

成功示例：
```json
{
  "code": 200,
  "status": "success",
  "message": "",
  "data": true
}
```

异常示例：
```json
{
  "code": 400,
  "status": "error",
  "message": "invalid signature.",
  "data": ""
}
```

## 错误码

| 错误码 | 描述           |
| ------ | -------------- |
| 10001  | 参数不合法     |
| 10002  | 频道不存在     |
| 10003  | 没有操作权限   |