<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { createCtAnalysisTask, getCtAnalysisResult } from '@/api/ctAnalysis'
import { getFileList, getFilePreviewUrl, uploadDirectory } from '@/api/files'

const ANALYSIS_TYPE = 'B1_B2_CLASSIFICATION'
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 2 * 60 * 1000

const submitting = ref(false)
const uploading = ref(false)
const fileListLoading = ref(false)
const polling = ref(false)
const pollTimer = ref(null)
const pollStartedAt = ref(0)
const consecutiveQueryFailures = ref(0)
const selectedUploadFiles = ref([])
const fileRecords = ref([])
const totalFiles = ref(0)
const selectedFileRecord = ref(null)
const previewUrl = ref('')

const form = reactive({
  ctImageFileId: ''
})

const uploadForm = reactive({
  caseName: '',
  objectKeyPrefix: 'ct/cases'
})

const fileQuery = reactive({
  pageNo: 1,
  pageSize: 6,
  bizType: 'CT',
  keyword: ''
})

const taskInfo = ref(null)
const resultInfo = ref(null)
const statusMessage = ref('等待输入 CT 文件 ID')

const canSubmit = computed(() => {
  return Boolean(form.ctImageFileId) && !submitting.value && !polling.value
})

const statusTextMap = {
  PENDING: '等待执行',
  RUNNING: '分析中',
  SUCCESS: '分析完成',
  FAILED: '分析失败'
}

const riskTextMap = {
  LOW: '低风险',
  HIGH: '高风险'
}

const categoryTextMap = {
  B1: '普通单纯头部外伤',
  B2: '复杂多发异常病例'
}

const statusTagType = computed(() => {
  const status = resultInfo.value?.taskStatus || taskInfo.value?.taskStatus

  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'RUNNING') return 'warning'
  return 'info'
})

const displayStatusText = computed(() => {
  const status = resultInfo.value?.taskStatus || taskInfo.value?.taskStatus
  return statusTextMap[status] || '未开始'
})

const confidencePercent = computed(() => {
  const confidence = resultInfo.value?.confidence
  if (typeof confidence !== 'number') {
    return 0
  }

  return Math.round(confidence * 100)
})

function formatPercent(value) {
  if (typeof value !== 'number') {
    return '--'
  }

  return `${(value * 100).toFixed(2)}%`
}

function normalizeFileRecord(record) {
  return {
    id: record.id,
    originalName: record.originalName || record.fileName || '--',
    bucketName: record.bucketName || record.bucket_name || '--',
    objectKey: record.objectKey || record.object_key || '--',
    bizType: record.bizType || '--',
    contentType: record.contentType || '--',
    size: record.fileSize || record.size || 0,
    uploadedAt: record.uploadedAt || record.createdAt || '--'
  }
}

function inferCaseName(files) {
  const firstFile = files[0]
  const relativePath = firstFile?.webkitRelativePath || firstFile?.name || 'ct-case'
  const parts = relativePath.split('/')
  return parts.length > 1 ? parts[0] : relativePath.replace(/\.[^.]+$/, '')
}

function clearPolling() {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value)
    pollTimer.value = null
  }
  polling.value = false
  consecutiveQueryFailures.value = 0
}

async function fetchResult(taskId) {
  const response = await getCtAnalysisResult(taskId)
  resultInfo.value = response.data
  return response.data
}

async function pollResult(taskId) {
  try {
    const result = await fetchResult(taskId)
    consecutiveQueryFailures.value = 0
    const status = result.taskStatus

    if (status === 'SUCCESS') {
      statusMessage.value = '分析完成，已返回模型结果'
      clearPolling()
      return
    }

    if (status === 'FAILED') {
      statusMessage.value = result.failureReason || '分析失败，请稍后重试'
      clearPolling()
      return
    }

    if (Date.now() - pollStartedAt.value > POLL_TIMEOUT_MS) {
      statusMessage.value = '轮询超时，请稍后手动重试'
      clearPolling()
      return
    }

    statusMessage.value = status === 'RUNNING' ? '模型分析中' : '任务已创建，等待执行'
    pollTimer.value = setTimeout(() => {
      pollResult(taskId)
    }, POLL_INTERVAL_MS)
  } catch (error) {
    consecutiveQueryFailures.value += 1
    statusMessage.value = error.response?.data?.message || '结果查询失败，请稍后重试'

    if (consecutiveQueryFailures.value >= 3) {
      clearPolling()
      return
    }

    pollTimer.value = setTimeout(() => {
      pollResult(taskId)
    }, POLL_INTERVAL_MS)
  }
}

async function loadFileRecords() {
  fileListLoading.value = true

  try {
    const response = await getFileList({
      pageNo: fileQuery.pageNo,
      pageSize: fileQuery.pageSize,
      bizType: fileQuery.bizType,
      keyword: fileQuery.keyword || undefined
    })

    const pageData = response.data || {}
    fileRecords.value = (pageData.records || []).map(normalizeFileRecord)
    totalFiles.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载文件列表失败')
  } finally {
    fileListLoading.value = false
  }
}

async function handlePreview(fileId) {
  try {
    const response = await getFilePreviewUrl(fileId)
    previewUrl.value = response.data?.previewUrl || response.data?.url || response.data || ''
    if (!previewUrl.value) {
      ElMessage.warning('当前文件暂未返回可用预览地址')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取预览地址失败')
  }
}

function selectFileRecord(record) {
  selectedFileRecord.value = record
  form.ctImageFileId = String(record.id)
  previewUrl.value = ''
}

function handleNativeFileChange(event) {
  const files = Array.from(event.target.files || [])
  selectedUploadFiles.value = files

  if (!uploadForm.caseName && files.length) {
    uploadForm.caseName = inferCaseName(files)
  }
}

async function uploadSelectedFile() {
  if (!selectedUploadFiles.value.length) {
    ElMessage.warning('请先选择一个 CT 病例目录')
    return
  }

  if (!uploadForm.caseName) {
    ElMessage.warning('请填写病例目录名称')
    return
  }

  uploading.value = true

  try {
    const formData = new FormData()
    selectedUploadFiles.value.forEach((file) => {
      formData.append('files', file)
      formData.append('relativePaths', file.webkitRelativePath || file.name)
    })
    formData.append('bizType', 'CT')
    formData.append('objectKeyPrefix', uploadForm.objectKeyPrefix)
    formData.append('caseName', uploadForm.caseName)

    const response = await uploadDirectory(formData)
    const fileRecord = normalizeFileRecord(response.data)

    selectedFileRecord.value = fileRecord
    form.ctImageFileId = String(fileRecord.id)
    selectedUploadFiles.value = []
    previewUrl.value = ''

    await loadFileRecords()
    ElMessage.success('病例目录上传成功，已生成可供 CT 使用的目录型文件记录')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '病例目录上传失败')
  } finally {
    uploading.value = false
  }
}

async function startAnalysis(forceRetry = false) {
  if (!forceRetry && !canSubmit.value) {
    return
  }

  if (!form.ctImageFileId) {
    return
  }

  submitting.value = true
  clearPolling()
  resultInfo.value = null

  try {
    const response = await createCtAnalysisTask({
      ctImageFileId: Number(form.ctImageFileId),
      analysisType: ANALYSIS_TYPE
    })

    taskInfo.value = response.data
    statusMessage.value = '任务已创建，等待执行'
    ElMessage.success('CT 分析任务已提交')

    polling.value = true
    pollStartedAt.value = Date.now()
    pollResult(response.data.taskId)
  } catch (error) {
    statusMessage.value = error.response?.data?.message || '提交分析任务失败'
    ElMessage.error(statusMessage.value)
  } finally {
    submitting.value = false
  }
}

function retryAnalysis() {
  startAnalysis(true)
}

onBeforeUnmount(() => {
  clearPolling()
})

</script>

<template>
  <section class="content-grid">
    <article class="glass-card ct-hero">
      <div>
        <div class="status-chip">Ct Analysis Module</div>
        <h2 class="section-title">医生端 CT 智能分析</h2>
        <p class="section-desc">
          输入一条已存在的 `file_record` 记录 ID，也就是 `ctImageFileId`，
          发起 `B1_B2_CLASSIFICATION` 分析任务，系统会自动轮询状态并展示分类结果、风险等级与医生确认状态。
        </p>
      </div>
      <div class="hero-badge">CT</div>
    </article>

    <div class="ct-grid">
      <article class="glass-card panel-card">
        <div class="hud-label">File Select</div>
        <h3>文件记录选择区</h3>
        <p>
          现在已经接入目录上传链路，可以先上传一个 CT 病例目录自动生成目录型 `file_record`，
          也可以直接从下方文件列表中选择已有记录。这里的 `ctImageFileId` 就是 `file_record.id`。
        </p>

        <div class="file-record-tip">
          <strong>当前正确链路</strong>
          <span>前端上传的是 CT 病例目录，后端会按相对路径保留目录结构写入 MinIO。</span>
          <span>最终只生成一条目录型 `file_record`，其 `id` 就是后续 CT 分析使用的 `ctImageFileId`。</span>
        </div>

        <div class="upload-panel">
          <div class="upload-head">
            <strong>上传 CT 病例目录</strong>
            <span>会调用 `/api/files/upload-directory`，自动生成一条目录型 `file_record`。</span>
          </div>

          <div class="upload-meta-grid">
            <el-input
              v-model="uploadForm.caseName"
              placeholder="病例目录名，例如 case-001"
              size="large"
            />
            <el-input
              v-model="uploadForm.objectKeyPrefix"
              placeholder="对象前缀，例如 ct/cases"
              size="large"
            />
          </div>

          <div class="upload-row">
            <input class="file-input" type="file" webkitdirectory multiple @change="handleNativeFileChange" />
            <el-button
              type="primary"
              round
              :loading="uploading"
              @click="uploadSelectedFile"
            >
              {{ uploading ? '上传中' : '上传目录并生成文件记录' }}
            </el-button>
          </div>
          <small v-if="selectedUploadFiles.length" class="upload-file-name">
            已选择 {{ selectedUploadFiles.length }} 个文件，病例目录：{{ uploadForm.caseName || '未命名' }}
          </small>
        </div>

        <el-form label-position="top" class="form-block">
          <el-form-item label="CT 文件 ID">
            <el-input
              v-model="form.ctImageFileId"
              placeholder="请输入 file_record.id，例如 90001"
              size="large"
              clearable
            />
          </el-form-item>
          <el-form-item label="分析类型">
            <el-input :model-value="ANALYSIS_TYPE" size="large" disabled />
          </el-form-item>
          <div class="action-row">
            <el-button
              type="primary"
              size="large"
              round
              :disabled="!canSubmit"
              :loading="submitting"
              @click="startAnalysis"
            >
              {{ submitting ? '提交中' : polling ? '已创建任务' : '开始分析' }}
            </el-button>
            <el-button
              size="large"
              round
              :disabled="!form.ctImageFileId"
              @click="retryAnalysis"
            >
              重新发起分析
            </el-button>
          </div>
        </el-form>

        <div class="file-list-panel">
          <div class="list-toolbar">
            <el-input
              v-model="fileQuery.keyword"
              placeholder="按文件名搜索，例如 case"
              clearable
              @keyup.enter="loadFileRecords"
            />
            <el-button round @click="loadFileRecords">查询</el-button>
          </div>

          <el-table
            :data="fileRecords"
            v-loading="fileListLoading"
            class="file-table"
            :empty-text="fileListLoading ? '加载中...' : '点击查询后显示 CT 文件记录'"
          >
            <el-table-column prop="id" label="file_record.id" min-width="130" />
            <el-table-column prop="originalName" label="文件名" min-width="220" show-overflow-tooltip />
            <el-table-column prop="bizType" label="业务类型" min-width="110" />
            <el-table-column label="操作" min-width="180" fixed="right">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button link type="primary" @click="selectFileRecord(row)">选择</el-button>
                  <el-button link @click="handlePreview(row.id)">预览地址</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="list-footer">
            <span>共 {{ totalFiles }} 条文件记录</span>
            <span v-if="selectedFileRecord">当前已选：{{ selectedFileRecord.originalName }} / {{ selectedFileRecord.id }}</span>
          </div>
        </div>
      </article>

      <article class="glass-card panel-card">
        <div class="hud-label">Task Status</div>
        <h3>任务操作区</h3>
        <p>创建任务成功后将自动每 2 秒轮询一次，直到分析成功、失败或超时。</p>

        <div class="task-status-card">
          <div class="task-status-head">
            <span>当前状态</span>
            <el-tag :type="statusTagType" effect="light">{{ displayStatusText }}</el-tag>
          </div>
          <strong>{{ statusMessage }}</strong>
          <small v-if="taskInfo?.submittedAt">提交时间：{{ taskInfo.submittedAt }}</small>
          <small v-if="polling">轮询间隔：2 秒，页面离开后会自动停止轮询</small>
        </div>

        <el-descriptions
          v-if="taskInfo"
          :column="1"
          border
          class="ct-descriptions"
        >
          <el-descriptions-item label="任务 ID">{{ taskInfo.taskId }}</el-descriptions-item>
          <el-descriptions-item label="CT 文件 ID">{{ taskInfo.ctImageFileId }}</el-descriptions-item>
          <el-descriptions-item label="分析类型">{{ taskInfo.analysisType }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">
            {{ statusTextMap[taskInfo.taskStatus] || taskInfo.taskStatus }}
          </el-descriptions-item>
        </el-descriptions>
      </article>
    </div>

    <article class="glass-card panel-card">
      <div class="result-head">
        <div>
          <div class="hud-label">Result View</div>
          <h3>结果展示区</h3>
        </div>
        <div class="result-metric" v-if="resultInfo?.taskStatus === 'SUCCESS'">
          <span>置信度</span>
          <strong>{{ confidencePercent }}%</strong>
        </div>
      </div>

      <el-empty
        v-if="!taskInfo && !resultInfo"
        description="提交 CT 分析任务后，这里会显示模型结果"
      />

      <template v-else>
        <el-alert
          :title="statusMessage"
          :type="resultInfo?.taskStatus === 'FAILED' ? 'error' : 'info'"
          :closable="false"
          show-icon
          class="result-alert"
        />

        <div v-if="resultInfo?.taskStatus === 'SUCCESS'" class="result-grid">
          <article class="result-highlight">
            <span>预测类别</span>
            <strong>{{ categoryTextMap[resultInfo.predictedCategory] || resultInfo.predictedCategory }}</strong>
            <small>{{ resultInfo.predictedCategory }}</small>
          </article>

          <article class="result-highlight">
            <span>风险等级</span>
            <strong>{{ riskTextMap[resultInfo.riskLevel] || resultInfo.riskLevel || '--' }}</strong>
            <small>{{ resultInfo.modelName || '--' }}</small>
          </article>

          <article class="result-highlight">
            <span>医生确认</span>
            <strong>{{ resultInfo.doctorConfirmStatus || 'UNCONFIRMED' }}</strong>
            <small>确认前仅供辅助参考</small>
          </article>
        </div>

        <el-descriptions
          v-if="resultInfo"
          :column="2"
          border
          class="ct-descriptions"
        >
          <el-descriptions-item label="任务 ID">{{ resultInfo.taskId }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">
            {{ statusTextMap[resultInfo.taskStatus] || resultInfo.taskStatus }}
          </el-descriptions-item>
          <el-descriptions-item label="分析类型">{{ resultInfo.analysisType }}</el-descriptions-item>
          <el-descriptions-item label="置信度">{{ formatPercent(resultInfo.confidence) }}</el-descriptions-item>
          <el-descriptions-item label="B1 概率">
            {{ formatPercent(resultInfo.classProbabilities?.B1) }}
          </el-descriptions-item>
          <el-descriptions-item label="B2 概率">
            {{ formatPercent(resultInfo.classProbabilities?.B2) }}
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            {{ riskTextMap[resultInfo.riskLevel] || resultInfo.riskLevel || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="模型名称">{{ resultInfo.modelName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="医生确认状态">
            {{ resultInfo.doctorConfirmStatus || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="失败原因">
            {{ resultInfo.failureReason || '--' }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="previewUrl" class="preview-box">
          <div class="hud-label">Preview Url</div>
          <a :href="previewUrl" target="_blank" rel="noreferrer">{{ previewUrl }}</a>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.ct-hero,
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.ct-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.hero-badge {
  display: grid;
  width: 132px;
  place-items: center;
  border-radius: 4px;
  background: linear-gradient(135deg, #7db6dc 0%, #76cfc1 100%);
  color: #fff;
  font-family: 'Barlow', sans-serif;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.ct-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 20px;
}

.panel-card h3 {
  margin: 14px 0 0;
  font-size: 24px;
  font-weight: 900;
}

.panel-card p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  line-height: 1.8;
}

.form-block {
  margin-top: 22px;
}

.file-record-tip {
  display: grid;
  gap: 8px;
  margin-top: 20px;
  padding: 16px 18px;
  border: 1px solid rgba(121, 189, 224, 0.16);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.4);
}

.file-record-tip strong {
  font-size: 15px;
  font-weight: 800;
}

.file-record-tip span {
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 13px;
}

.upload-panel,
.file-list-panel {
  margin-top: 20px;
  padding: 16px 18px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.38);
}

.upload-head strong,
.upload-head span {
  display: block;
}

.upload-head strong {
  font-size: 15px;
  font-weight: 800;
}

.upload-head span {
  margin-top: 8px;
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 13px;
}

.upload-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.upload-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}

.file-input {
  flex: 1;
  min-width: 240px;
  padding: 12px 14px;
  border: 1px solid rgba(121, 189, 224, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-primary);
}

.upload-file-name {
  display: block;
  margin-top: 12px;
  color: var(--text-secondary);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.list-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.file-table {
  margin-top: 16px;
}

.row-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.task-status-card {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.42);
}

.task-status-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.task-status-card strong {
  display: block;
  margin-top: 14px;
  font-size: 18px;
  font-weight: 800;
}

.task-status-card small {
  display: block;
  margin-top: 10px;
  color: var(--text-secondary);
}

.list-footer,
.preview-box {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
  color: var(--text-secondary);
  font-size: 13px;
}

.preview-box {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.36);
}

.preview-box a {
  color: #477893;
  word-break: break-all;
}

.ct-descriptions {
  margin-top: 20px;
}

.result-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.result-metric {
  min-width: 160px;
  padding: 16px 18px;
  border-radius: 6px;
  background: var(--bg-accent-soft);
  text-align: right;
}

.result-metric span,
.result-metric strong {
  display: block;
}

.result-metric span {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.result-metric strong {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 900;
}

.result-alert {
  margin-top: 20px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.result-highlight {
  padding: 18px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.46);
}

.result-highlight span,
.result-highlight strong,
.result-highlight small {
  display: block;
}

.result-highlight span {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.result-highlight strong {
  margin-top: 12px;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.35;
}

.result-highlight small {
  margin-top: 8px;
  color: var(--text-secondary);
}

@media (max-width: 1100px) {
  .ct-grid,
  .result-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .ct-hero,
  .result-head {
    flex-direction: column;
  }

  .hero-badge,
  .result-metric {
    width: 100%;
  }

  .list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .upload-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
