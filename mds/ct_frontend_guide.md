# CT 模块前端搭建说明

## 1. 目标

CT 模块前端的核心目标是完成以下流程：

1. 选择一个已上传的 CT 文件记录
2. 发起 CT 分析任务
3. 轮询分析任务状态
4. 展示分析结果
5. 在失败时展示错误原因

当前后端仅支持：

- `B1_B2_CLASSIFICATION`


## 2. 前端页面建议

建议拆成一个独立页面，例如：

- `/ct-analysis`

页面可以分成 3 个区域：

- 文件选择区
- 任务操作区
- 结果展示区


## 3. 页面结构建议

### 3.1 文件选择区

用于输入或选择 `ctImageFileId`。

如果你们前端暂时还没有文件管理页，可以先做成一个简单输入框：

- 输入 `ctImageFileId`
- 显示当前分析类型为 `B1_B2_CLASSIFICATION`

后续如果接文件列表接口，可以改成：

- 下拉选择
- 表格选择
- 搜索后选择


### 3.2 任务操作区

建议放一个主按钮：

- `开始分析`

点击后调用：

```text
POST /api/ct-analysis/tasks
```

请求体：

```json
{
  "ctImageFileId": 90001,
  "analysisType": "B1_B2_CLASSIFICATION"
}
```

按钮状态建议：

- 未输入文件 ID 时禁用
- 请求发送中显示 `提交中`
- 提交成功后切换为 `分析中`


### 3.3 结果展示区

结果区建议展示以下内容：

- 任务 ID
- 任务状态
- 预测类别
- 置信度
- B1 概率
- B2 概率
- 风险等级
- 模型名称
- 医生确认状态
- 失败原因

建议用卡片或描述列表展示。


## 4. 接口对接说明

### 4.1 创建任务接口

```text
POST /api/ct-analysis/tasks
```

前端调用成功后会拿到：

- `taskId`
- `taskStatus`

示例响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": 10001,
    "ctImageFileId": 90001,
    "analysisType": "B1_B2_CLASSIFICATION",
    "taskStatus": "PENDING",
    "submittedAt": "2026-06-18T10:00:00"
  },
  "timestamp": "2026-06-18T10:00:00"
}
```


### 4.2 查询结果接口

```text
GET /api/ct-analysis/results/{taskId}
```

示例响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": 10001,
    "analysisType": "B1_B2_CLASSIFICATION",
    "taskStatus": "SUCCESS",
    "predictedCategory": "B2",
    "confidence": 0.912345,
    "classProbabilities": {
      "B1": 0.087655,
      "B2": 0.912345
    },
    "riskLevel": "HIGH",
    "modelName": "cq500_b1_b2_classifier_v1",
    "doctorConfirmStatus": "UNCONFIRMED",
    "failureReason": null
  },
  "timestamp": "2026-06-18T10:00:10"
}
```


## 5. 轮询逻辑

前端在创建任务成功后，需要根据 `taskId` 轮询结果接口。

建议规则：

- 轮询间隔：2 秒
- 最大轮询时长：2 到 5 分钟
- 当状态为 `SUCCESS` 时停止轮询
- 当状态为 `FAILED` 时停止轮询

建议状态判断：

- `PENDING`：显示“任务已创建，等待执行”
- `RUNNING`：显示“模型分析中”
- `SUCCESS`：展示分析结果
- `FAILED`：展示失败原因


## 6. 前端数据结构建议

可以定义两个核心类型。

### 6.1 创建任务返回

```ts
type CtAnalysisTask = {
  taskId: number
  ctImageFileId: number
  analysisType: string
  taskStatus: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  submittedAt: string
}
```

### 6.2 分析结果返回

```ts
type CtAnalysisResult = {
  taskId: number
  analysisType: string
  taskStatus: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  predictedCategory?: 'B1' | 'B2'
  confidence?: number
  classProbabilities?: {
    B1?: number
    B2?: number
  }
  riskLevel?: 'LOW' | 'HIGH'
  modelName?: string
  doctorConfirmStatus?: string
  failureReason?: string | null
}
```


## 7. 展示文案建议

建议对预测结果做更友好的中文展示。

### 7.1 类别说明

- `B1`：普通单纯头部外伤
- `B2`：复杂多发异常病例

### 7.2 风险说明

- `LOW`：低风险
- `HIGH`：高风险

### 7.3 状态说明

- `PENDING`：等待执行
- `RUNNING`：分析中
- `SUCCESS`：分析完成
- `FAILED`：分析失败


## 8. 推荐页面交互

建议交互流程如下：

1. 用户输入 `ctImageFileId`
2. 点击 `开始分析`
3. 页面立即显示任务卡片
4. 页面进入轮询状态
5. 若任务成功，显示分类结果和概率
6. 若任务失败，显示失败原因

建议补充以下 UI 提示：

- 提交任务成功提示
- 正在轮询时的加载动画
- 分析失败时的错误提示
- 支持“重新发起分析”按钮


## 9. 推荐组件拆分

如果你们使用 Vue 或 React，建议拆成：

- `CtAnalysisForm`
  - 输入文件 ID
  - 发起分析
- `CtAnalysisTaskCard`
  - 展示任务 ID、状态、提交时间
- `CtAnalysisResultCard`
  - 展示分类结果和概率
- `CtAnalysisStatusTag`
  - 状态标签


## 10. Axios 请求示例

```ts
import axios from 'axios'

export function createCtTask(ctImageFileId: number) {
  return axios.post('/api/ct-analysis/tasks', {
    ctImageFileId,
    analysisType: 'B1_B2_CLASSIFICATION'
  })
}

export function getCtResult(taskId: number) {
  return axios.get(`/api/ct-analysis/results/${taskId}`)
}
```


## 11. React 轮询示例

```tsx
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

export default function CtAnalysisPage() {
  const [ctImageFileId, setCtImageFileId] = useState('')
  const [taskId, setTaskId] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const timerRef = useRef<number | null>(null)

  const createTask = async () => {
    const res = await axios.post('/api/ct-analysis/tasks', {
      ctImageFileId: Number(ctImageFileId),
      analysisType: 'B1_B2_CLASSIFICATION'
    })
    const newTaskId = res.data.data.taskId
    setTaskId(newTaskId)
  }

  useEffect(() => {
    if (!taskId) return

    const poll = async () => {
      const res = await axios.get(`/api/ct-analysis/results/${taskId}`)
      const data = res.data.data
      setResult(data)

      if (data.taskStatus === 'SUCCESS' || data.taskStatus === 'FAILED') {
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }

    poll()
    timerRef.current = window.setInterval(poll, 2000)

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [taskId])

  return (
    <div>
      <h1>CT 分析</h1>
      <input
        value={ctImageFileId}
        onChange={(e) => setCtImageFileId(e.target.value)}
        placeholder="请输入 ctImageFileId"
      />
      <button onClick={createTask}>开始分析</button>

      {result && (
        <div>
          <p>任务状态: {result.taskStatus}</p>
          <p>预测类别: {result.predictedCategory}</p>
          <p>置信度: {result.confidence}</p>
          <p>风险等级: {result.riskLevel}</p>
          <p>失败原因: {result.failureReason}</p>
        </div>
      )}
    </div>
  )
}
```


## 12. 联调建议

建议按以下顺序联调：

1. 先手工准备一条可用的 `file_record`
2. 前端手工输入 `ctImageFileId`
3. 调用创建任务接口
4. 观察是否返回 `taskId`
5. 轮询结果接口
6. 确认能看到 `SUCCESS` 或 `FAILED`
7. 成功后再补文件选择、文件列表等增强功能


## 13. 当前限制

当前前端接入时需要注意：

- 只有一个分析类型，不需要让用户选择多个模型
- 当前结果没有热力图
- 当前结果没有异常切片定位
- 当前适合先做成“任务提交 + 结果展示”页面
- 如果 MinIO 中是压缩包，后端暂未支持自动解压


## 14. 推荐最小可用版本

如果你想先快速搭起来，前端最小可用版本只需要：

- 一个 `ctImageFileId` 输入框
- 一个“开始分析”按钮
- 一个轮询状态展示区
- 一个结果卡片

先跑通业务，再补美化和文件管理联动会更稳。
