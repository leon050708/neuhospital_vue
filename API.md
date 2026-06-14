# Neuhospital API

基于当前项目源码整理，服务默认端口为 `8080`。

## 1. 基本说明

- Base URL: `http://localhost:8080`
- 大多数接口返回统一结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2026-06-14T12:00:00"
}
```

- 分页 `data` 结构：

```json
{
  "records": [],
  "pageNo": 1,
  "pageSize": 10,
  "total": 100
}
```

- 特殊说明：
  - `/api/auth/*` 多数接口不使用 `Result` 包装
  - `/api/registrations/quick` 返回自定义 JSON
  - 当前项目大多数业务接口未做统一登录拦截
  - 业务报错时，很多接口 HTTP 状态仍然是 `200`，需要看 `code` 和 `message`

## 2. 认证接口

### 2.1 登录

- 方法：`POST`
- 路径：`/api/auth/login`

请求体：

```json
{
  "username": "doctor001",
  "password": "password123"
}
```

响应：

```json
{
  "accessToken": "xxx",
  "refreshToken": "xxx",
  "tokenType": "Bearer",
  "accessTokenExpiresAt": "2026-06-14T12:00:00Z",
  "refreshTokenExpiresAt": "2026-06-21T12:00:00Z",
  "userId": 1,
  "username": "doctor001",
  "role": "DOCTOR",
  "userType": "DOCTOR",
  "bizId": 1001,
  "sessionId": "sess_xxx",
  "refreshTokenId": "rt_xxx"
}
```

### 2.2 刷新令牌

- 方法：`POST`
- 路径：`/api/auth/refresh`

请求体：

```json
{
  "refreshToken": "xxx"
}
```

响应：

```json
{
  "accessToken": "xxx",
  "tokenType": "Bearer",
  "accessTokenExpiresAt": "2026-06-14T12:00:00Z",
  "sessionId": "sess_xxx"
}
```

### 2.3 登出

- 方法：`POST`
- 路径：`/api/auth/logout`
- 请求头：`Authorization: Bearer <accessToken>`

响应：

- `204 No Content`

### 2.4 注册

- 方法：`POST`
- 路径：`/api/auth/register`

请求体：

```json
{
  "username": "zhangsan",
  "password": "123456",
  "realName": "张三",
  "phone": "13800000000",
  "idCard": "110101199001011234",
  "gender": "MALE"
}
```

响应：

- `200 OK`

### 2.5 当前登录人

- 方法：`GET`
- 路径：`/api/auth/me`
- 请求头：`Authorization: Bearer <accessToken>`

响应：

```json
{
  "userId": 1,
  "username": "zhangsan",
  "role": "PATIENT",
  "userType": "PATIENT",
  "bizId": 2001
}
```

## 3. 科室接口

### 3.1 新建科室

- 方法：`POST`
- 路径：`/api/departments`

请求体：

```json
{
  "deptCode": "CARD",
  "deptName": "心内科",
  "deptType": "CLINICAL",
  "description": "心血管相关门诊"
}
```

响应 `data`：

```json
{
  "id": 1,
  "deptCode": "CARD",
  "deptName": "心内科",
  "deptType": "CLINICAL",
  "description": "心血管相关门诊",
  "status": "ENABLED"
}
```

### 3.2 查询科室详情

- 方法：`GET`
- 路径：`/api/departments/{id}`

### 3.3 更新科室

- 方法：`PUT`
- 路径：`/api/departments/{id}`

请求体：

```json
{
  "deptName": "神经内科",
  "deptType": "CLINICAL",
  "description": "更新后的描述",
  "status": "ENABLED"
}
```

### 3.4 查询全部科室

- 方法：`GET`
- 路径：`/api/departments`

响应 `data`：

- `DepartmentVO[]`

说明：

- 只返回 `status=ENABLED` 的科室

### 3.5 科室树

- 方法：`GET`
- 路径：`/api/departments/tree`

说明：

- 当前代码中并不是真树结构，实际返回平铺列表

## 4. 医生接口

### 4.1 新建医生

- 方法：`POST`
- 路径：`/api/doctors`

请求体：

```json
{
  "name": "李医生",
  "gender": "MALE",
  "title": "主任医师",
  "departmentId": 1,
  "introduction": "从业20年",
  "specialty": "高血压、冠心病",
  "phone": "13900000000"
}
```

响应 `data`：

```json
{
  "id": 1,
  "doctorNo": "DOC-20260614120000000",
  "name": "李医生",
  "gender": "MALE",
  "title": "主任医师",
  "departmentId": 1,
  "departmentName": "心内科",
  "introduction": "从业20年",
  "specialty": "高血压、冠心病",
  "phone": "13900000000",
  "status": "ENABLED"
}
```

说明：

- 创建成功后会联动创建医生登录账号

### 4.2 医生详情

- 方法：`GET`
- 路径：`/api/doctors/{id}`

### 4.3 更新医生

- 方法：`PUT`
- 路径：`/api/doctors/{id}`

请求体：

```json
{
  "name": "李主任",
  "title": "副主任医师",
  "departmentId": 1,
  "introduction": "更新简介",
  "specialty": "心律失常",
  "phone": "13900000001",
  "status": "ENABLED"
}
```

### 4.4 医生分页

- 方法：`GET`
- 路径：`/api/doctors/page`

查询参数：

- `pageNo`
- `pageSize`
- `departmentId`
- `keyword`

示例：

```text
/api/doctors/page?pageNo=1&pageSize=10&departmentId=1&keyword=李
```

### 4.5 医生列表

- 方法：`GET`
- 路径：`/api/doctors`

查询参数：

- `departmentId`，可选

说明：

- 只返回启用中的医生

## 5. 患者接口

### 5.1 新建患者

- 方法：`POST`
- 路径：`/api/patients`

请求体：

```json
{
  "name": "张三",
  "gender": "MALE",
  "birthDate": "1990-01-01",
  "phone": "13800138000",
  "idCard": "110105199001011234",
  "bloodType": "A",
  "allergySummary": "青霉素过敏",
  "historySummary": "高血压病史",
  "emergencyContact": "李四",
  "emergencyPhone": "13800138001"
}
```

响应 `data`：

```json
{
  "id": 1,
  "patientNo": "PAT-20260614120000000",
  "name": "张三",
  "gender": "MALE",
  "birthDate": "1990-01-01",
  "phone": "13800138000",
  "idCard": "110105199001011234",
  "bloodType": "A",
  "allergySummary": "青霉素过敏",
  "historySummary": "高血压病史",
  "status": "ENABLED"
}
```

说明：

- 创建成功后会联动创建患者登录账号

### 5.2 患者详情

- 方法：`GET`
- 路径：`/api/patients/{id}`

### 5.3 更新患者

- 方法：`PUT`
- 路径：`/api/patients/{id}`

请求体：

```json
{
  "name": "张三",
  "phone": "13800138002",
  "bloodType": "B",
  "allergySummary": "无",
  "historySummary": "无",
  "emergencyContact": "王五",
  "emergencyPhone": "13800138003",
  "status": "ENABLED"
}
```

### 5.4 患者分页

- 方法：`GET`
- 路径：`/api/patients`

查询参数：

- `pageNo`
- `pageSize`
- `keyword`

## 6. 排班接口

### 6.1 新建排班

- 方法：`POST`
- 路径：`/api/schedules`

请求体：

```json
{
  "doctorId": 1,
  "departmentId": 1,
  "scheduleDate": "2026-06-15",
  "timeSlot": "AM",
  "sourceCount": 20,
  "feeAmount": 50.00,
  "sourceType": "NORMAL"
}
```

响应 `data`：

```json
{
  "id": 1,
  "doctorId": 1,
  "doctorName": "李医生",
  "departmentId": 1,
  "departmentName": "心内科",
  "scheduleDate": "2026-06-15",
  "timeSlot": "AM",
  "sourceCount": 20,
  "availableCount": 20,
  "feeAmount": 50.00,
  "sourceType": "NORMAL",
  "status": "ENABLED"
}
```

说明：

- `timeSlot` 注释定义为 `AM`、`PM`、`NIGHT`
- 默认 `status=ENABLED`
- 初始 `availableCount=sourceCount`

### 6.2 更新排班

- 方法：`PUT`
- 路径：`/api/schedules/{id}`

请求体：

```json
{
  "sourceCount": 30,
  "feeAmount": 80.00,
  "sourceType": "EXPERT",
  "status": "ENABLED"
}
```

说明：

- `sourceCount` 不能小于已挂出的号源数

### 6.3 关闭排班

- 方法：`POST`
- 路径：`/api/schedules/{id}/close`

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 6.4 排班分页

- 方法：`GET`
- 路径：`/api/schedules`

查询参数：

- `pageNo`
- `pageSize`
- `doctorId`
- `departmentId`
- `scheduleDate`
- `timeSlot`

示例：

```text
/api/schedules?pageNo=1&pageSize=10&doctorId=1&scheduleDate=2026-06-15&timeSlot=AM
```

## 7. 挂号接口

### 7.1 快速抢号

- 方法：`POST`
- 路径：`/api/registrations/quick`

请求体：

```json
{
  "scheduleId": 1,
  "patientId": 1
}
```

成功响应：

```json
{
  "success": true,
  "message": "抢号受理成功，正在排队出票中",
  "msgId": "xxxxxxxx"
}
```

失败响应：

```json
{
  "success": false,
  "message": "手慢了，当前排班号源已满"
}
```

说明：

- 当前只有受理接口
- 没有查询挂号处理结果的接口
- 内部包含限流、分布式锁、Redis 库存预扣减

## 8. 门诊病历接口

### 8.1 新建病历

- 方法：`POST`
- 路径：`/api/outpatient/records`

请求体：

```json
{
  "registrationId": 50001,
  "patientId": 20001,
  "doctorId": 30001,
  "departmentId": 40001,
  "chiefComplaint": "头痛3天，加重1天",
  "presentIllness": "无恶心呕吐",
  "pastHistory": "无",
  "allergyHistory": "无",
  "physicalExam": "生命体征平稳",
  "preliminaryDiagnosis": "偏头痛",
  "diagnoses": [
    {
      "diseaseCode": "G43",
      "diseaseName": "偏头痛",
      "diagnosisType": "MAIN",
      "suspectedFlag": false
    }
  ]
}
```

响应 `data`：

```json
1
```

说明：

- 返回病历 ID
- 默认状态为 `DRAFT`

### 8.2 病历详情

- 方法：`GET`
- 路径：`/api/outpatient/records/{id}`

响应 `data`：

```json
{
  "id": 1,
  "recordNo": "MR1710000000000",
  "patientId": 20001,
  "doctorId": 30001,
  "departmentId": 40001,
  "registrationId": 50001,
  "chiefComplaint": "头痛3天，加重1天",
  "presentIllness": "无恶心呕吐",
  "pastHistory": "无",
  "allergyHistory": "无",
  "physicalExam": "生命体征平稳",
  "preliminaryDiagnosis": "偏头痛",
  "finalDiagnosis": "偏头痛",
  "advice": "注意休息",
  "status": "DRAFT",
  "confirmedAt": null,
  "createdAt": "2026-06-14T12:00:00",
  "diagnoses": [
    {
      "id": 1,
      "diseaseCode": "G43",
      "diseaseName": "偏头痛",
      "diagnosisType": "MAIN",
      "suspectedFlag": false
    }
  ]
}
```

### 8.3 更新病历

- 方法：`PUT`
- 路径：`/api/outpatient/records/{id}`

请求体：

```json
{
  "chiefComplaint": "头痛3天",
  "presentIllness": "无恶心呕吐",
  "pastHistory": "既往体健",
  "allergyHistory": "无",
  "physicalExam": "正常",
  "preliminaryDiagnosis": "偏头痛",
  "finalDiagnosis": "偏头痛",
  "advice": "多休息",
  "diagnoses": [
    {
      "diseaseCode": "G43",
      "diseaseName": "偏头痛",
      "diagnosisType": "MAIN",
      "suspectedFlag": false
    }
  ]
}
```

说明：

- 已确认病历不可修改

### 8.4 确认病历

- 方法：`POST`
- 路径：`/api/outpatient/records/{id}/confirm`

说明：

- 确认后状态改为 `CONFIRMED`

### 8.5 病历分页

- 方法：`GET`
- 路径：`/api/outpatient/records`

查询参数：

- `pageNo`
- `pageSize`
- `patientId`
- `doctorId`

### 8.6 保存病历诊断明细

- 方法：`POST`
- 路径：`/api/outpatient/records/{id}/diagnoses`

请求体：

```json
[
  {
    "diseaseCode": "G43",
    "diseaseName": "偏头痛",
    "diagnosisType": "MAIN",
    "suspectedFlag": false
  }
]
```

说明：

- 会覆盖原有诊断明细
- 已确认病历不可修改

### 8.7 查询病历诊断明细

- 方法：`GET`
- 路径：`/api/outpatient/records/{id}/diagnoses`

## 9. 药品接口

### 9.1 新增药品

- 方法：`POST`
- 路径：`/api/drugs`

请求体：

```json
{
  "drugCode": "AMOX-001",
  "drugName": "阿莫西林胶囊",
  "genericName": "阿莫西林",
  "specification": "0.25g*50粒",
  "unit": "盒",
  "category": "抗生素",
  "manufacturer": "某药厂",
  "salePrice": 15.50,
  "stockQuantity": 100,
  "warningQuantity": 10,
  "contraindication": "青霉素过敏者禁用",
  "status": "ENABLED"
}
```

响应 `data`：

```json
1
```

说明：

- 返回药品 ID
- `drugCode` 为空时会自动生成
- `stockQuantity` 默认 `0`
- `warningQuantity` 默认 `10`
- `status` 默认 `ENABLED`

### 9.2 更新药品

- 方法：`PUT`
- 路径：`/api/drugs/{id}`

请求体：

```json
{
  "drugName": "布洛芬缓释胶囊",
  "genericName": "布洛芬",
  "specification": "0.3g*20粒",
  "unit": "盒",
  "category": "止痛药",
  "manufacturer": "某药厂",
  "salePrice": 22.00,
  "warningQuantity": 20,
  "contraindication": "胃溃疡慎用",
  "status": "ENABLED"
}
```

说明：

- 此接口不能修改库存

### 9.3 库存调整

- 方法：`POST`
- 路径：`/api/drugs/{id}/stock-adjust`

请求体：

```json
{
  "adjustQuantity": 20
}
```

说明：

- 正数表示入库
- 负数表示扣减
- 不允许扣减后库存小于 `0`

### 9.4 药品详情

- 方法：`GET`
- 路径：`/api/drugs/{id}`

响应 `data`：

```json
{
  "id": 1,
  "drugCode": "AMOX-001",
  "drugName": "阿莫西林胶囊",
  "genericName": "阿莫西林",
  "specification": "0.25g*50粒",
  "unit": "盒",
  "category": "抗生素",
  "manufacturer": "某药厂",
  "salePrice": 15.50,
  "stockQuantity": 100,
  "warningQuantity": 10,
  "contraindication": "青霉素过敏者禁用",
  "status": "ENABLED"
}
```

### 9.5 药品分页

- 方法：`GET`
- 路径：`/api/drugs`

查询参数：

- `pageNo`
- `pageSize`
- `keyword`
- `category`

示例：

```text
/api/drugs?pageNo=1&pageSize=10&keyword=阿莫西林&category=抗生素
```

## 10. 常见状态值

以下状态值来自当前源码实现和注释，前后端联调时可直接参考：

- 通用启停状态：`ENABLED`、`DISABLED`
- 排班状态：`ENABLED`、`DISABLED`、`CLOSED`
- 病历状态：`DRAFT`、`CONFIRMED`
- 接诊队列状态：`WAITING`
- 挂号时间段：`AM`、`PM`、`NIGHT`

## 11. 常见错误说明

常见业务错误示例：

- 科室编码重复：`该科室编码已存在，无法重复创建`
- 医生手机号重复：`该手机号已绑定其他医生`
- 患者身份证重复：`该身份证号已建档，无法重复创建`
- 排班重复：`该医生在此时间段已有排班`
- 号源不足：`手慢了，当前排班号源已满`
- 病历已确认不可修改：`病历已确认，不可修改`
- 药品库存不足：`库存不足，无法扣减`

## 12. 当前缺失但业务上可能需要的接口

按现有代码来看，下面这些接口还没有提供：

- 挂号结果查询
- 挂号列表查询
- 挂号详情查询
- 取消挂号
- 删除科室/医生/患者/药品
- 药品分类字典接口
- 登录态统一鉴权拦截
- Swagger / OpenAPI 自动文档
