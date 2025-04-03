# 分页查询标签

### 接口描述
```
1、分页查询标签
2、接口支持https协议
```

### 接口URL
```
https://api.polyv.net/live/v4/user/label/page
```

### 请求方式
```
GET
```

### 接口约束
1、接口同时支持HTTP 、HTTPS ，建议使用HTTPS 确保接口安全，接口调用有频率限制

### 请求参数描述
| 参数名 | 必选 | 类型 | 说明 |
| --- | --- | --- |-----------------------------------------------------------------------------------------------|
| appId | true | String | 账号appId【详见[获取密钥]】 |
| timestamp | true | Long | 当前13位毫秒级时间戳，3分钟内有效 |
| sign | true | String | 签名，为32位大写的MD5值 |
| pageNumber | true | Integer | 当前页码 |
| pageSize | true | Integer | 分页大小 |

### 示例
```requestUrl
https://api.polyv.net/live/v4/user/label/page?appId=frlr1zazn3&timestamp=1670471250000&sign=149397BFD607C518A841DAF8777D6A7E&pageNumber=1&pageSize=10
```

### 响应参数描述
| 参数名 | 类型 | 说明 |
| --- |---------|------------------------------------------|
| code | Integer | 响应状态码，200为成功返回，非200为失败 |
| status | String | 响应结果，由业务决定，成功返回success，失败返回error |
| success | Boolean | 响应结果，由业务决定，成功返回true，失败返回false |
| data | Object | 标签分页数据【详见[data字段说明]】 |
| error | Object | 状态码非200时的错误信息【详见[Error字段说明]】 |
| requestId | String | 请求ID，每次请求生成的唯一的 UUID |

### Error参数描述
| 参数名 | 类型 | 说明 |
| --- | --- | --- |
| code | Integer | 错误代码，用于确定具体的错误原因 |
| desc | String | 错误描述，与 error.code 对应 |

#### data参数描述
| 参数名 | 类型 | 说明 |
| --- |---------|-------|
| pageNumber | String | 分页页码 |
| pageSize | Integer | 分页大小 |
| totalPages | String | 总页数 |
| totalItems | String | 总记录数 |
| contents | Array | 标签数组 |

##### contents参数描述
| 参数名 | 类型 | 说明 |
|------|---------|---------|
| id | String | 标签id |
| name | String | 标签名称 |

### 响应示例
成功示例
```json
{
  "code": 200,
  "status": "success",
  "requestId": "e4faf1183b2c4ff493e6aeb192209b25.72.16994949189217641",
  "data": {
    "pageNumber": 1,
    "pageSize": 10,
    "totalPages": 1,
    "totalItems": 2,
    "contents": [
      {
        "id": "3zn3ezy0o2h89eo8",
        "name": "标签2"
      },
      {
        "id": "zpmz3640wkxpj267",
        "name": "标签1"
      }
    ]
  },
  "success": true
}
```

异常示例
```json
{
  "code": 400,
  "status": "error",
  "requestId": "d310b70bc329403f87f77f9203d50f89.128.16360831552223589",
  "error": {
    "code": 20001,
    "desc": "application not found."
  },
  "success": false
}
``` 