# 当前 API 文档

生成时间：2026-07-09  
整理依据：当前仓库控制器、DTO/VO、网关路由与安全配置代码  
建议访问入口：`http://localhost:10010`

## 1. 总览

### 1.1 网关入口

- 网关地址：`http://localhost:10010`
- 网关会统一校验 JWT，并向下游服务透传用户上下文请求头
- 除白名单接口外，所有 `/api/**` 默认都需要 `Authorization: Bearer <token>`

### 1.2 白名单接口

以下接口无需登录：

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `/v3/api-docs/**`
- `/swagger-ui/**`
- `/swagger-ui.html`
- `/doc.html`
- `/webjars/**`
- `/actuator/**`

### 1.3 微服务端口

通过网关访问时通常不需要关心端口；如果要直连各服务，可参考：

| 服务 | 端口 |
| --- | --- |
| gateway-service | `10010` |
| backend-service | `8081` |
| patient-service | `10021` |
| doctor-service | `10022` |
| registration-service | `10023` |
| file-service | `10020` |
| payment-service | `10024` |
| pharmacy-service | `10025` |
| inspection-service | `10026` |
| outpatient-service | `10027` |

### 1.4 网关路由映射

| 路由前缀 | 实际服务 |
| --- | --- |
| `/api/auth/**` | backend-service |
| `/api/system/**` | backend-service |
| `/api/patients/**` | patient-service |
| `/api/doctors/**` | doctor-service |
| `/api/departments/**` | doctor-service |
| `/api/schedules/**` | registration-service |
| `/api/schedule-templates/**` | registration-service |
| `/api/registrations/**` | registration-service |
| `/api/queue/**` | registration-service |
| `/api/outpatient/**` | outpatient-service |
| `/api/check-requests/**` | inspection-service |
| `/api/check-results/**` | inspection-service |
| `/api/inspection-requests/**` | inspection-service |
| `/api/inspection-results/**` | inspection-service |
| `/api/disposal-requests/**` | inspection-service |
| `/api/drugs/**` | pharmacy-service |
| `/api/prescriptions/**` | pharmacy-service |
| `/api/pharmacy/**` | pharmacy-service |
| `/api/payment/**` | payment-service |
| `/api/files/**` | file-service |
| `/api/ct-analysis/**` | backend-service |
| `/api/ai/**` | backend-service |

## 2. 鉴权与通用响应

### 2.1 请求头

除白名单外，统一使用：

```http
Authorization: Bearer <accessToken>
```

网关会向下游补充以下内部头：

- `X-User-Id`
- `X-Username`
- `X-User-Roles`
- `X-User-Type`
- `X-Biz-Id`
- `X-Session-Id`
- `X-Trace-Id`

### 2.2 统一响应包装

大多数接口返回：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2026-07-09T10:00:00"
}
```

分页结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [],
    "pageNo": 1,
    "pageSize": 10,
    "total": 56
  },
  "timestamp": "2026-07-09T10:00:00"
}
```

### 2.3 特殊返回风格

- 认证接口直接返回对象或空响应，不包 `Result`
- 挂号与排队部分接口返回 `ResponseEntity<Map>`，字段常见为 `code/message/data` 或 `success/message/msgId`
- 文件下载与预览接口直接返回二进制流

## 3. 认证模块

前缀：`/api/auth`

### `POST /api/auth/login`

- 说明：账号登录，获取 `accessToken` 与 `refreshToken`
- 鉴权：否
- 请求体：
  - `username`：用户名
  - `password`：密码
- 响应字段：
  - `accessToken`
  - `refreshToken`
  - `tokenType`
  - `accessTokenExpiresAt`
  - `refreshTokenExpiresAt`
  - `userId`
  - `username`
  - `role`
  - `userType`
  - `bizId`
  - `sessionId`
  - `refreshTokenId`

### `POST /api/auth/refresh`

- 说明：刷新访问令牌
- 鉴权：否
- 请求体：
  - `refreshToken`
- 响应字段：
  - `accessToken`
  - `tokenType`
  - `accessTokenExpiresAt`
  - `sessionId`

### `POST /api/auth/logout`

- 说明：退出登录，让当前会话失效
- 鉴权：否，代码层允许匿名，但通常应携带当前 token
- 请求头：
  - `Authorization`
- 响应：`204 No Content`

### `POST /api/auth/register`

- 说明：注册患者账号
- 鉴权：否
- 请求体：
  - `password`
  - `realName`
  - `phone`
  - `idCard`
  - `gender`
- 响应：`200 OK`

### `GET /api/auth/me`

- 说明：获取当前登录用户资料
- 鉴权：Bearer Token
- 响应字段：
  - `userId`
  - `username`
  - `role`
  - `userType`
  - `bizId`

## 4. 系统角色模块

### 4.1 角色管理

前缀：`/api/system/roles`  
角色要求：`ADMIN`、`MANAGEMENT`

#### `POST /api/system/roles`

- 说明：创建角色
- 请求体：
  - `roleCode`
  - `roleName`
  - `description`
  - `status`
- 响应：`RoleVO`

#### `PUT /api/system/roles/{id}`

- 说明：更新角色
- 请求体：
  - `roleName`
  - `description`
  - `status`
- 响应：`RoleVO`

#### `GET /api/system/roles/{id}`

- 说明：查询角色详情
- 响应：`RoleVO`

#### `GET /api/system/roles`

- 说明：分页查询角色
- 查询参数：
  - `pageNo`，默认 `1`
  - `pageSize`，默认 `10`
  - `keyword`
  - `status`
- 响应字段：
  - `records[].id`
  - `records[].roleCode`
  - `records[].roleName`
  - `records[].description`
  - `records[].status`
  - `records[].createdAt`
  - `records[].updatedAt`

### 4.2 用户角色分配

前缀：`/api/system/users`  
角色要求：`ADMIN`、`MANAGEMENT`

#### `GET /api/system/users/{userId}/roles`

- 说明：查询用户已分配角色
- 响应字段：
  - `relationId`
  - `roleId`
  - `roleCode`
  - `roleName`
  - `roleStatus`
  - `assignedAt`

#### `PUT /api/system/users/{userId}/roles`

- 说明：重设用户角色列表
- 请求体：
  - `roleIds`：角色 ID 数组
- 响应：分配后的 `UserRoleVO[]`

## 5. 患者模块

前缀：`/api/patients`

### `POST /api/patients`

- 说明：新增患者
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体：
  - `name`
  - `gender`
  - `birthDate`
  - `phone`
  - `idCard`
  - `bloodType`
  - `allergySummary`
  - `historySummary`
  - `emergencyContact`
  - `emergencyPhone`
- 响应：`PatientVO`

### `GET /api/patients/{id}`

- 说明：查询患者详情
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`、`DOCTOR`，或本人
- 响应字段：
  - `id`
  - `patientNo`
  - `name`
  - `gender`
  - `birthDate`
  - `phone`
  - `idCard`
  - `bloodType`
  - `allergySummary`
  - `historySummary`
  - `status`

### `PUT /api/patients/{id}`

- 说明：更新患者信息
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`，或本人
- 请求体：
  - `name`
  - `phone`
  - `bloodType`
  - `allergySummary`
  - `historySummary`
  - `emergencyContact`
  - `emergencyPhone`
  - `status`

### `GET /api/patients`

- 说明：分页查询患者
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`、`DOCTOR`
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `keyword`

## 6. 医生与科室模块

### 6.1 医生管理

前缀：`/api/doctors`

#### `POST /api/doctors`

- 说明：新增医生
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体：
  - `name`
  - `gender`
  - `title`
  - `departmentId`
  - `introduction`
  - `specialty`
  - `phone`

#### `GET /api/doctors/{id}`

- 说明：查询医生详情
- 响应主字段：
  - `id`
  - `doctorNo`
  - `name`
  - `gender`
  - `title`
  - `departmentId`
  - `departmentName`
  - `introduction`
  - `specialty`
  - `phone`
  - `status`

#### `PUT /api/doctors/{id}`

- 说明：更新医生信息
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体：
  - `name`
  - `title`
  - `departmentId`
  - `introduction`
  - `specialty`
  - `phone`
  - `status`

#### `GET /api/doctors/page`

- 说明：分页查询医生
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `departmentId`
  - `keyword`

#### `GET /api/doctors`

- 说明：查询医生列表
- 查询参数：
  - `departmentId`

### 6.2 科室管理

前缀：`/api/departments`

#### `POST /api/departments`

- 说明：新增科室
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体：
  - `deptCode`
  - `deptName`
  - `deptType`
  - `description`

#### `GET /api/departments/{id}`

- 说明：查询科室详情

#### `PUT /api/departments/{id}`

- 说明：更新科室
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体：
  - `deptName`
  - `deptType`
  - `description`
  - `status`

#### `GET /api/departments`

- 说明：查询全部科室

#### `GET /api/departments/tree`

- 说明：伪树接口，当前直接返回平铺列表

## 7. 排班与挂号模块

### 7.1 医生排班

前缀：`/api/schedules`

#### `POST /api/schedules`

- 说明：新增排班
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体：
  - `doctorId`
  - `departmentId`
  - `scheduleDate`
  - `timeSlot`
  - `sourceCount`
  - `feeAmount`
  - `sourceType`
- 备注：`timeSlot` 注释推断可为 `AM`、`PM`、`NIGHT`

#### `POST /api/schedules/generate`

- 说明：按模板批量生成排班
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体可为空，可选字段：
  - `days`
  - `startDate`
  - `doctorId`
  - `departmentId`
- 响应字段：
  - `startDate`
  - `endDate`
  - `createdCount`
  - `skippedCount`
  - `createdScheduleIds`

#### `PUT /api/schedules/{id}`

- 说明：更新排班
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体：
  - `sourceCount`
  - `feeAmount`
  - `sourceType`
  - `status`
- 备注：代码注释推断 `status` 可为 `ENABLED`、`DISABLED`、`CLOSED`

#### `POST /api/schedules/{id}/close`

- 说明：关闭排班
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`

#### `GET /api/schedules`

- 说明：分页查询排班
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `doctorId`
  - `departmentId`
  - `scheduleDate`
  - `timeSlot`
  - `bookableOnly`
- 响应主字段：
  - `id`
  - `doctorId`
  - `doctorName`
  - `departmentId`
  - `departmentName`
  - `scheduleDate`
  - `timeSlot`
  - `sourceCount`
  - `availableCount`
  - `feeAmount`
  - `sourceType`
  - `status`

### 7.2 排班模板

前缀：`/api/schedule-templates`

#### `POST /api/schedule-templates`

- 说明：新增排班模板
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 请求体：
  - `doctorId`
  - `departmentId`
  - `dayOfWeek`
  - `timeSlot`
  - `sourceCount`
  - `feeAmount`
  - `sourceType`

#### `GET /api/schedule-templates/{id}`

- 说明：查询模板详情

#### `GET /api/schedule-templates`

- 说明：分页查询模板
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `doctorId`
  - `departmentId`

#### `PUT /api/schedule-templates/{id}`

- 说明：更新模板
- 请求体：
  - `sourceCount`
  - `feeAmount`
  - `sourceType`
  - `status`

#### `POST /api/schedule-templates/{id}/disable`

- 说明：停用模板

### 7.3 挂号

前缀：`/api/registrations`

#### `POST /api/registrations/quick`

- 说明：患者抢号/快速挂号，提交后进入异步排队出票
- 角色：`PATIENT`
- 请求体：
  - `scheduleId`
- 响应示例：

```json
{
  "success": true,
  "message": "抢号受理成功，正在排队出票中",
  "msgId": "..."
}
```

#### `GET /api/registrations/my`

- 说明：查询当前患者自己的挂号记录
- 角色：`PATIENT`
- 查询参数：
  - `pageNo`
  - `pageSize`

#### `GET /api/registrations`

- 说明：查询全部挂号记录
- 角色：`ADMIN`、`MANAGEMENT`、`REGISTRATION_CLERK`
- 查询参数：
  - `pageNo`
  - `pageSize`

#### `GET /api/registrations/{id}`

- 说明：查询单条挂号详情
- 角色：由 `accessEvaluator.canAccessRegistration` 决定

#### `POST /api/registrations/{id}/cancel`

- 说明：患者退号
- 角色：`PATIENT`

#### `POST /api/registrations/{id}/check-in`

- 说明：患者报到签到
- 角色：`PATIENT`

### 7.4 排队叫号

前缀：`/api/queue`

#### `GET /api/queue/doctor/me`

- 说明：查询当前医生候诊队列
- 角色：`DOCTOR`
- 响应主字段：
  - `id`
  - `registrationId`
  - `patientId`
  - `queueNo`
  - `queueStatus`
  - `calledAt`
  - `registrationNo`
  - `registeredAt`

#### `POST /api/queue/{id}/call`

- 说明：叫号
- 角色：`DOCTOR`

#### `POST /api/queue/{id}/skip`

- 说明：过号
- 角色：`DOCTOR`

#### `POST /api/queue/{id}/finish`

- 说明：就诊完成
- 角色：`DOCTOR`

## 8. 门诊病历模块

前缀：`/api/outpatient/records`

### `POST /api/outpatient/records`

- 说明：创建病历
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`
- 请求体：
  - `registrationId`
  - `patientId`
  - `doctorId`
  - `departmentId`
  - `chiefComplaint`
  - `presentIllness`
  - `pastHistory`
  - `allergyHistory`
  - `physicalExam`
  - `preliminaryDiagnosis`
  - `diagnoses[]`

### `GET /api/outpatient/records/{id}`

- 说明：查询病历详情
- 角色：医生/管理角色，或当前有权查看的患者
- 响应主字段：
  - `id`
  - `recordNo`
  - `patientId`
  - `doctorId`
  - `departmentId`
  - `registrationId`
  - `chiefComplaint`
  - `presentIllness`
  - `pastHistory`
  - `allergyHistory`
  - `physicalExam`
  - `preliminaryDiagnosis`
  - `finalDiagnosis`
  - `advice`
  - `status`
  - `confirmedAt`
  - `createdAt`
  - `diagnoses[]`

### `PUT /api/outpatient/records/{id}`

- 说明：更新病历
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`
- 请求体：
  - `chiefComplaint`
  - `presentIllness`
  - `pastHistory`
  - `allergyHistory`
  - `physicalExam`
  - `preliminaryDiagnosis`
  - `finalDiagnosis`
  - `advice`
  - `diagnoses[]`

### `POST /api/outpatient/records/{id}/confirm`

- 说明：确认病历
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`

### `GET /api/outpatient/records`

- 说明：分页查询病历
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`、`PATIENT`
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `patientId`
  - `doctorId`
- 备注：当前登录人为 `PATIENT` 时，服务端会自动将 `patientId` 强制为本人

### `POST /api/outpatient/records/{id}/diagnoses`

- 说明：批量保存诊断列表
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`
- 请求体 `diagnoses[]` 子项字段：
  - `diseaseCode`
  - `diseaseName`
  - `diagnosisType`
  - `suspectedFlag`

### `GET /api/outpatient/records/{id}/diagnoses`

- 说明：查询病历诊断列表
- 角色：医生/管理角色，或当前有权查看的患者

## 9. 检查检验与处置模块

### 9.1 检查申请

前缀：`/api/check-requests`

#### `POST /api/check-requests`

- 说明：创建检查申请
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`
- 请求体：
  - `patientId`
  - `registrationId`
  - `medicalRecordId`
  - `departmentId`
  - `targetDepartmentId`
  - `checkItemCode`
  - `checkItemName`
  - `clinicalDiagnosis`
  - `purpose`
  - `urgentFlag`

#### `GET /api/check-requests/{id}`

- 说明：查询检查申请详情

#### `GET /api/check-requests`

- 说明：分页查询检查申请
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `patientId`
  - `doctorId`

#### `POST /api/check-requests/{id}/cancel`

- 说明：取消检查申请

### 9.2 检查结果

前缀：`/api/check-results`

#### `POST /api/check-results`

- 说明：录入检查结果
- 请求体：
  - `checkRequestId`
  - `resultText`
  - `resultSummary`
  - `conclusion`
  - `reportFileId`

#### `GET /api/check-results/{id}`

- 说明：查询检查结果详情
- 响应字段：
  - `id`
  - `checkRequestId`
  - `reportNo`
  - `resultText`
  - `resultSummary`
  - `conclusion`
  - `reportFileId`
  - `reportDoctorId`
  - `reportedAt`
  - `status`

#### `POST /api/check-results/{id}/confirm`

- 说明：确认检查结果

### 9.3 检验申请

前缀：`/api/inspection-requests`

#### `POST /api/inspection-requests`

- 说明：创建检验申请
- 请求体：
  - `patientId`
  - `registrationId`
  - `medicalRecordId`
  - `departmentId`
  - `targetDepartmentId`
  - `inspectionItemCode`
  - `inspectionItemName`
  - `sampleType`
  - `urgentFlag`

#### `GET /api/inspection-requests/{id}`

- 说明：查询检验申请详情

#### `GET /api/inspection-requests`

- 说明：分页查询检验申请
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `patientId`
  - `doctorId`

#### `POST /api/inspection-requests/{id}/cancel`

- 说明：取消检验申请

### 9.4 检验结果

前缀：`/api/inspection-results`

#### `POST /api/inspection-results`

- 说明：录入检验结果
- 请求体：
  - `inspectionRequestId`
  - `resultSummary`
  - `conclusion`
  - `items[]`
- `items[]` 子项字段：
  - `itemCode`
  - `itemName`
  - `resultValue`
  - `unit`
  - `referenceRange`
  - `abnormalFlag`

#### `GET /api/inspection-results/{id}`

- 说明：查询检验结果详情
- 响应字段：
  - `id`
  - `inspectionRequestId`
  - `reportNo`
  - `resultSummary`
  - `conclusion`
  - `reportDoctorId`
  - `reportedAt`
  - `status`
  - `items[]`

#### `POST /api/inspection-results/{id}/confirm`

- 说明：确认检验结果

### 9.5 处置申请

前缀：`/api/disposal-requests`

#### `POST /api/disposal-requests`

- 说明：创建处置申请
- 请求体：
  - `patientId`
  - `registrationId`
  - `medicalRecordId`
  - `doctorId`
  - `departmentId`
  - `disposalItemCode`
  - `disposalItemName`
  - `quantity`
  - `remark`

#### `GET /api/disposal-requests/{id}`

- 说明：查询处置申请详情

#### `GET /api/disposal-requests`

- 说明：分页查询处置申请
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `patientId`
  - `doctorId`

#### `POST /api/disposal-requests/{id}/cancel`

- 说明：取消处置申请

#### `POST /api/disposal-requests/{id}/finish`

- 说明：完成处置

## 10. 支付模块

前缀：`/api/payment`

### `GET /api/payment/pending`

- 说明：查询当前患者待缴费项目
- 角色：`PATIENT`
- 响应字段：
  - `itemType`
  - `bizId`
  - `itemName`
  - `amount`
  - `createdAt`

### `POST /api/payment/create`

- 说明：创建支付订单
- 角色：`PATIENT`
- 请求体：
  - `items[]`
- `items[]` 子项字段：
  - `itemType`
  - `bizId`
- 备注：`patientId` 会由服务端自动注入当前患者

### `POST /api/payment/{id}/pay`

- 说明：模拟支付成功
- 角色：`PATIENT`

## 11. 药房模块

### 11.1 药品管理

前缀：`/api/drugs`

#### `POST /api/drugs`

- 说明：新增药品
- 角色：`ADMIN`、`PHARMACIST`
- 请求体：
  - `drugCode`
  - `drugName`
  - `genericName`
  - `specification`
  - `unit`
  - `category`
  - `manufacturer`
  - `salePrice`
  - `stockQuantity`
  - `warningQuantity`
  - `contraindication`
  - `status`

#### `PUT /api/drugs/{id}`

- 说明：更新药品
- 角色：`ADMIN`、`PHARMACIST`
- 请求体：
  - `drugName`
  - `genericName`
  - `specification`
  - `unit`
  - `category`
  - `manufacturer`
  - `salePrice`
  - `warningQuantity`
  - `contraindication`
  - `status`

#### `POST /api/drugs/{id}/stock-adjust`

- 说明：调整库存
- 角色：`ADMIN`、`PHARMACIST`
- 请求体：
  - `adjustQuantity`

#### `GET /api/drugs/{id}`

- 说明：查询药品详情
- 响应字段：
  - `id`
  - `drugCode`
  - `drugName`
  - `genericName`
  - `specification`
  - `unit`
  - `category`
  - `manufacturer`
  - `salePrice`
  - `stockQuantity`
  - `warningQuantity`
  - `contraindication`
  - `status`

#### `GET /api/drugs`

- 说明：分页查询药品
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `keyword`
  - `category`

### 11.2 处方

前缀：`/api/prescriptions`

#### `POST /api/prescriptions`

- 说明：创建处方
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`
- 请求体：
  - `patientId`
  - `registrationId`
  - `medicalRecordId`
  - `doctorId`
  - `departmentId`
  - `remark`
  - `items[]`
- `items[]` 子项字段：
  - `drugId`
  - `dosage`
  - `frequency`
  - `days`
  - `quantity`
  - `usageMethod`

#### `GET /api/prescriptions/{id}`

- 说明：查询处方详情
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`、`PHARMACIST`
- 响应主字段：
  - `id`
  - `prescriptionNo`
  - `patientId`
  - `registrationId`
  - `medicalRecordId`
  - `doctorId`
  - `departmentId`
  - `status`
  - `totalAmount`
  - `remark`
  - `requestedAt`
  - `items[]`

#### `GET /api/prescriptions`

- 说明：分页查询处方
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`、`PHARMACIST`
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `patientId`
  - `doctorId`

### 11.3 发药

前缀：`/api/pharmacy/dispense`

#### `POST /api/pharmacy/dispense`

- 说明：执行发药
- 角色：`ADMIN`、`PHARMACIST`
- 请求体：
  - `prescriptionId`
  - `pharmacyUserId`

## 12. 文件模块

前缀：`/api/files`

### `POST /api/files/upload`

- 说明：上传单文件
- 请求类型：`multipart/form-data`
- 表单字段：
  - `file`
  - `bizType`
  - `bizId`
  - `bucketName`
  - `objectKeyPrefix`
  - `uploaderId`
- 响应：`FileRecordVO`

### `POST /api/files/upload-directory`

- 说明：上传目录
- 请求类型：`multipart/form-data`
- 表单字段：
  - `files[]`
  - `relativePaths[]`
  - `caseName`
  - `bizType`
  - `bizId`
  - `bucketName`
  - `objectKeyPrefix`
  - `uploaderId`

### `GET /api/files`

- 说明：分页查询文件
- 查询参数：
  - `pageNo`
  - `pageSize`
  - `bizType`
  - `bizId`
  - `keyword`

### `GET /api/files/{fileId}`

- 说明：查询文件元数据
- 响应字段：
  - `id`
  - `bizType`
  - `bizId`
  - `bucketName`
  - `objectKey`
  - `originalName`
  - `fileType`
  - `contentType`
  - `fileSize`
  - `uploaderId`
  - `uploadedAt`
  - `status`
  - `createdAt`
  - `updatedAt`

### `GET /api/files/{fileId}/preview-url`

- 说明：获取预签名预览地址
- 查询参数：
  - `expiresInSeconds`
- 响应字段：
  - `fileId`
  - `previewUrl`
  - `expiresInSeconds`

### `GET /api/files/{fileId}/download`

- 说明：下载文件
- 响应：二进制流，带 `Content-Disposition`

### `GET /api/files/{fileId}/preview`

- 说明：直接预览文件内容
- 响应：二进制流

## 13. CT 影像分析模块

前缀：`/api/ct-analysis`

### `POST /api/ct-analysis/tasks`

- 说明：提交 CT 分析任务
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`
- 请求体：
  - `ctImageFileId`
  - `analysisType`
- 响应字段：
  - `taskId`
  - `ctImageFileId`
  - `analysisType`
  - `taskStatus`
  - `submittedAt`

### `GET /api/ct-analysis/results/{taskId}`

- 说明：查询分析结果
- 角色：`DOCTOR`、`ADMIN`、`MANAGEMENT`
- 响应字段：
  - `taskId`
  - `analysisType`
  - `taskStatus`
  - `predictedCategory`
  - `confidence`
  - `classProbabilities`
  - `riskLevel`
  - `modelName`
  - `doctorConfirmStatus`
  - `failureReason`

## 14. AI 模块

### 14.1 患者对话

前缀：`/api/ai/chat/sessions`

#### `POST /api/ai/chat/sessions`

- 说明：创建 AI 会话
- 鉴权：需要患者登录，代码中通过 `SecurityUtils.getCurrentPatientId()` 校验
- 请求体：
  - `registrationId`
  - `sessionType`
- 响应字段：
  - `sessionNo`
  - `registrationId`
  - `sessionType`
  - `status`
  - `startedAt`

#### `POST /api/ai/chat/sessions/{sessionNo}/messages`

- 说明：发送消息并获取模型回复
- 鉴权：需要患者登录
- 请求体：
  - `content`
- 响应：`Result<String>`

### 14.2 知识库管理

前缀：`/api/admin/ai/knowledge/documents`  
角色：`ADMIN`、`MANAGEMENT`

#### `POST /api/admin/ai/knowledge/documents/upload`

- 说明：上传知识文档并入库
- 请求类型：`multipart/form-data`
- 表单字段：
  - `file`
  - `title`
  - `knowledgeType`
  - `departmentId`
  - `tags`
  - `publishNow`
- 响应字段：
  - `id`
  - `docNo`
  - `title`
  - `knowledgeType`
  - `departmentId`
  - `tags`
  - `status`
  - `parserStatus`
  - `chunkCount`

#### `POST /api/admin/ai/knowledge/documents/{documentId}/publish`

- 说明：发布知识文档

#### `POST /api/admin/ai/knowledge/documents/{documentId}/offline`

- 说明：下线知识文档

#### `POST /api/admin/ai/knowledge/documents/{documentId}/reindex`

- 说明：重建向量索引
- 响应：重建后的 chunk 数量

### 14.3 DashScope 测试接口

前缀：`/api/ai/test`

#### `GET /api/ai/test/chat`

- 说明：调用 DashScope 进行简单对话测试
- 查询参数：
  - `prompt`，默认 `你好，请自我介绍一下。`
- 响应：纯字符串

## 15. Swagger / OpenAPI

### 15.1 网关可访问地址

- Swagger UI：`http://localhost:10010/swagger-ui.html`
- OpenAPI JSON：`http://localhost:10010/v3/api-docs`

### 15.2 说明

- `backend-service` 已显式配置 `springdoc` 与 `bearerAuth`
- 多个拆分后的微服务也配置了 `springdoc`，但网关当前只显式放行了 `backend-service` 的文档路径
- 如果要看拆分服务自己的 Swagger，建议直接访问对应服务端口下的 `/swagger-ui.html`

## 16. 现状备注

- 当前文档是根据代码静态整理，不依赖运行时抓包
- `status`、`timeSlot`、`sourceType` 等部分枚举值，若代码中未写成 enum，本文件仅在注释可见处做了推断说明
- `registration-service` 的挂号与排队接口响应结构与其他模块不完全统一，前端联调时需要单独适配
