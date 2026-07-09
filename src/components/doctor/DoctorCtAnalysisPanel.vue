<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { fetchViewerVolumeNrrd, uploadDicomFilesForViewer } from '@/api/ctViewer'
import DoctorCtSliceViewer from '@/components/doctor/DoctorCtSliceViewer.vue'
import { createCtAnalysisTask, getCtAnalysisResult } from '@/api/ctAnalysis'
import { getFileList, getFilePreviewUrl, uploadDirectory } from '@/api/files'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['state-change'])

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
const visualizationCaseFiles = ref([])
const fileRecords = ref([])
const totalFiles = ref(0)
const selectedFileRecord = ref(null)
const previewUrl = ref('')
const generatedVolumePreviewUrl = ref('')
const heatmapPreviewUrl = ref('')
const heatmapLoading = ref(false)
const activeVisualTab = ref('original')
const viewerActivated = ref(false)
const visualizing = ref(false)

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

const analysisSourceFileId = computed(() => {
  return String(taskInfo.value?.ctImageFileId || form.ctImageFileId || selectedFileRecord.value?.id || '')
})

const analysisSourceRecord = computed(() => {
  if (!analysisSourceFileId.value) {
    return selectedFileRecord.value
  }

  return fileRecords.value.find((item) => String(item.id) === analysisSourceFileId.value)
    || (selectedFileRecord.value && String(selectedFileRecord.value.id) === analysisSourceFileId.value ? selectedFileRecord.value : null)
})

const viewerSourceUrl = computed(() => {
  return generatedVolumePreviewUrl.value || previewUrl.value || ''
})

const isNrrdPreview = computed(() => {
  const fileName = String(analysisSourceRecord.value?.originalName || '').toLowerCase()
  const preview = String(previewUrl.value || '').toLowerCase()
  return Boolean(generatedVolumePreviewUrl.value) || fileName.endsWith('.nrrd') || preview.includes('.nrrd')
})

const previewRenderMode = computed(() => {
  const fileName = analysisSourceRecord.value?.originalName || ''
  const contentType = analysisSourceRecord.value?.contentType || ''
  const normalizedName = fileName.toLowerCase()

  if (contentType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(normalizedName)) {
    return 'image'
  }

  if (contentType.includes('pdf') || normalizedName.endsWith('.pdf')) {
    return 'pdf'
  }

  if (previewUrl.value) {
    return 'frame'
  }

  return 'none'
})

const hasViewerSource = computed(() => {
  return Boolean(viewerSourceUrl.value)
})

function emitStateChange() {
  emit('state-change', {
    taskInfo: taskInfo.value,
    resultInfo: resultInfo.value,
    selectedFileRecord: selectedFileRecord.value,
    previewUrl: previewUrl.value,
    heatmapPreviewUrl: heatmapPreviewUrl.value,
    polling: polling.value
  })
}

function revokeGeneratedPreviewUrl() {
  if (generatedVolumePreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(generatedVolumePreviewUrl.value)
  }
  generatedVolumePreviewUrl.value = ''
}

function deactivateViewer() {
  viewerActivated.value = false
  activeVisualTab.value = 'original'
}

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

function isDirectoryLikeRecord(record) {
  if (!record) {
    return false
  }

  const contentType = String(record.contentType || '').toLowerCase()
  const objectKey = String(record.objectKey || '')
  const originalName = String(record.originalName || '')

  return (
    !contentType ||
    contentType.includes('directory') ||
    objectKey.endsWith('/') ||
    (!/\.[a-z0-9]+$/i.test(originalName) && Number(record.size || 0) === 0)
  )
}

function isPreviewableRecord(record) {
  if (!record || isDirectoryLikeRecord(record)) {
    return false
  }

  const contentType = String(record.contentType || '').toLowerCase()
  const originalName = String(record.originalName || '').toLowerCase()

  if (contentType.startsWith('image/') || contentType.includes('pdf')) {
    return true
  }

  return /\.(png|jpe?g|webp|gif|bmp|svg|pdf)$/i.test(originalName)
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
  emitStateChange()
}

async function fetchResult(taskId) {
  const response = await getCtAnalysisResult(taskId)
  resultInfo.value = response.data
  emitStateChange()
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
  const currentRecord = fileRecords.value.find((item) => String(item.id) === String(fileId))
    || (selectedFileRecord.value && String(selectedFileRecord.value.id) === String(fileId) ? selectedFileRecord.value : null)

  if (currentRecord && isDirectoryLikeRecord(currentRecord)) {
    previewUrl.value = ''
    viewerActivated.value = false
    emitStateChange()
    ElMessage.info('当前记录是 CT 病例目录，不能直接当单张影像预览')
    return
  }

  try {
    const response = await getFilePreviewUrl(fileId)
    previewUrl.value = response.data?.previewUrl || response.data?.url || response.data || ''
    if (!previewUrl.value) {
      ElMessage.warning('当前文件暂未返回可用预览地址')
      viewerActivated.value = false
      return
    }
    viewerActivated.value = true
    emitStateChange()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取预览地址失败')
  }
}

function selectFileRecord(record) {
  selectedFileRecord.value = record
  form.ctImageFileId = String(record.id)
  previewUrl.value = ''
  revokeGeneratedPreviewUrl()
  activeVisualTab.value = 'original'
  viewerActivated.value = false
  emitStateChange()
}

async function activateViewer() {
  if (!analysisSourceRecord.value) {
    ElMessage.warning('请先在左侧选择 CT，并以这条 CT 数据发起分析')
    return
  }

  if (isDirectoryLikeRecord(analysisSourceRecord.value)) {
    if (!visualizationCaseFiles.value.length) {
      ElMessage.warning('当前分析 CT 是目录型数据。请先重新选择本地同一份 CT 目录，再调用可视化')
      return
    }

    visualizing.value = true

    try {
      const loadResult = await uploadDicomFilesForViewer(visualizationCaseFiles.value)
      const arrayBuffer = await fetchViewerVolumeNrrd(loadResult.volume_id)
      revokeGeneratedPreviewUrl()
      generatedVolumePreviewUrl.value = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/octet-stream' }))
      activeVisualTab.value = 'original'
      viewerActivated.value = true
      ElMessage.success('已基于当前分析 CT 数据生成可视化体数据')
    } catch (error) {
      ElMessage.error(error.message || 'CT 可视化加载失败')
    } finally {
      visualizing.value = false
    }
    return
  }

  if (!isPreviewableRecord(analysisSourceRecord.value)) {
    ElMessage.warning('当前分析使用的 CT 数据不支持直接原图可视化')
    return
  }

  await handlePreview(analysisSourceRecord.value.id)
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

    visualizationCaseFiles.value = [...selectedUploadFiles.value]
    selectedFileRecord.value = fileRecord
    form.ctImageFileId = String(fileRecord.id)
    selectedUploadFiles.value = []
    previewUrl.value = ''
    revokeGeneratedPreviewUrl()
    activeVisualTab.value = 'original'
    viewerActivated.value = false

    await loadFileRecords()
    ElMessage.info('CT 已上传完成，右侧会基于这条分析 CT 数据进行可视化')
    emitStateChange()
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
    emitStateChange()
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

async function loadHeatmapPreview(fileId) {
  if (!fileId) {
    heatmapPreviewUrl.value = ''
    emitStateChange()
    return
  }

  heatmapLoading.value = true

  try {
    const response = await getFilePreviewUrl(fileId)
    heatmapPreviewUrl.value = response.data?.previewUrl || response.data?.url || response.data || ''
    emitStateChange()
  } catch (error) {
    heatmapPreviewUrl.value = ''
    ElMessage.warning(error.response?.data?.message || '热力图预览加载失败')
  } finally {
    heatmapLoading.value = false
  }
}

watch(
  () => resultInfo.value?.heatmapFileId,
  (fileId) => {
    loadHeatmapPreview(fileId)
  },
  { immediate: true }
)

watch([taskInfo, resultInfo, selectedFileRecord, previewUrl, heatmapPreviewUrl, polling], emitStateChange, { deep: true })

onBeforeUnmount(() => {
  clearPolling()
  revokeGeneratedPreviewUrl()
})
</script>

<template>
  <div class="ct-panel" :class="{ embedded }">
    <div class="result-head">
      <div>
        <div class="hud-label">CT Workflow</div>
        <h3>{{ embedded ? 'CT 分析与可视化' : '医生端 CT 智能分析' }}</h3>
        <p>
          先选择或上传当前患者的 CT 病例目录，再发起分析任务。这里会同时展示文件预览和分析结果，
          避免 CT 分析脱离当前接诊流程。
        </p>
      </div>
      <div class="result-metric" v-if="resultInfo?.taskStatus === 'SUCCESS'">
        <span>置信度</span>
        <strong>{{ confidencePercent }}%</strong>
      </div>
    </div>

    <div class="ct-grid">
      <article class="sub-card">
        <div class="upload-head">
          <strong>病例目录与文件记录</strong>
          <span>上传 CT 病例目录后，会生成一条目录型 `file_record` 供后续分析使用。</span>
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
          <el-button type="primary" round :loading="uploading" @click="uploadSelectedFile">
            {{ uploading ? '上传中' : '上传目录' }}
          </el-button>
        </div>

        <small v-if="selectedUploadFiles.length" class="upload-file-name">
          已选择 {{ selectedUploadFiles.length }} 个文件，病例目录：{{ uploadForm.caseName || '未命名' }}
        </small>

        <el-form label-position="top" class="form-block">
          <el-form-item label="CT 文件 ID">
            <el-input
              v-model="form.ctImageFileId"
              placeholder="请输入 file_record.id"
              size="large"
              clearable
            />
          </el-form-item>
          <el-form-item label="分析类型">
            <el-input :model-value="ANALYSIS_TYPE" size="large" disabled />
          </el-form-item>
          <div class="action-row">
            <el-button type="primary" size="large" round :disabled="!canSubmit" :loading="submitting" @click="startAnalysis">
              {{ submitting ? '提交中' : polling ? '已创建任务' : '开始分析' }}
            </el-button>
            <el-button size="large" round :disabled="!form.ctImageFileId" @click="retryAnalysis">
              重新分析
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
            <el-table-column prop="id" label="file_record.id" min-width="120" />
            <el-table-column prop="originalName" label="文件名" min-width="220" show-overflow-tooltip />
            <el-table-column prop="bizType" label="业务类型" min-width="110" />
            <el-table-column label="操作" min-width="180" fixed="right">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button link type="primary" @click="selectFileRecord(row)">选择</el-button>
                  <el-button link @click="handlePreview(row.id)">预览</el-button>
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

      <article class="sub-card">
        <div class="task-status-card">
          <div class="task-status-head">
            <span>当前状态</span>
            <el-tag :type="statusTagType" effect="light">{{ displayStatusText }}</el-tag>
          </div>
          <strong>{{ statusMessage }}</strong>
          <small v-if="taskInfo?.submittedAt">提交时间：{{ taskInfo.submittedAt }}</small>
          <small v-if="polling">轮询间隔：2 秒，页面离开后会自动停止轮询</small>
        </div>

        <el-descriptions v-if="taskInfo" :column="1" border class="ct-descriptions">
          <el-descriptions-item label="任务 ID">{{ taskInfo.taskId }}</el-descriptions-item>
          <el-descriptions-item label="CT 文件 ID">{{ taskInfo.ctImageFileId }}</el-descriptions-item>
          <el-descriptions-item label="分析类型">{{ taskInfo.analysisType }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">
            {{ statusTextMap[taskInfo.taskStatus] || taskInfo.taskStatus }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="preview-shell">
          <div class="preview-head">
            <div>
              <strong>CT 影像</strong>
              <span>右侧可视化直接使用左侧“开始分析”对应的 CT 数据。目录型 CT 会按 `web-ct-viewer` 的方式转换后展示。</span>
            </div>
            <div class="local-nrrd-tools">
              <el-button type="primary" round :loading="visualizing" :disabled="!analysisSourceFileId" @click="activateViewer">
                {{ visualizing ? '可视化加载中' : '调用 CT 可视化' }}
              </el-button>
              <el-button v-if="viewerActivated" round @click="deactivateViewer">返回上一步</el-button>
            </div>
          </div>

          <div v-if="analysisSourceFileId" class="local-nrrd-banner">
            当前分析 CT：{{ analysisSourceRecord?.originalName || '--' }} / {{ analysisSourceFileId }}
          </div>

          <div v-if="viewerActivated && (heatmapPreviewUrl || viewerSourceUrl)" class="visual-switcher">
            <el-segmented
              v-model="activeVisualTab"
              :options="[
                { label: 'CT原图', value: 'original' },
                { label: '辅助热力图', value: 'heatmap', disabled: !heatmapPreviewUrl }
              ]"
            />
          </div>

          <el-empty
            v-if="!viewerActivated && !heatmapLoading"
            description="先在左侧选择 CT 并开始分析，再手动点击“调用 CT 可视化”"
          />

          <el-skeleton v-else-if="viewerActivated && heatmapLoading && activeVisualTab === 'heatmap'" :rows="8" animated />

          <template v-else>
            <template v-if="viewerActivated && activeVisualTab === 'heatmap' && heatmapPreviewUrl">
              <img :src="heatmapPreviewUrl" alt="CT 热力图预览" class="preview-media" />
              <a :href="heatmapPreviewUrl" target="_blank" rel="noreferrer" class="preview-link">{{ heatmapPreviewUrl }}</a>
            </template>

            <template v-else-if="viewerActivated && hasViewerSource">
              <DoctorCtSliceViewer
                v-if="isNrrdPreview"
                :source-url="viewerSourceUrl"
                :file-name="analysisSourceRecord?.originalName || ''"
                :force-nrrd="true"
              />
              <img v-if="previewRenderMode === 'image'" :src="viewerSourceUrl" alt="CT 影像预览" class="preview-media" />
              <iframe
                v-else-if="!isNrrdPreview"
                :src="viewerSourceUrl"
                class="preview-frame"
                title="CT 影像预览"
              />
              <a v-if="!isNrrdPreview" :href="viewerSourceUrl" target="_blank" rel="noreferrer" class="preview-link">{{ viewerSourceUrl }}</a>
            </template>
          </template>
        </div>
      </article>
    </div>

    <article class="sub-card result-card">
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

        <el-descriptions v-if="resultInfo" :column="2" border class="ct-descriptions">
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
          <el-descriptions-item label="异常切片">
            {{ resultInfo.abnormalSlices?.length ? resultInfo.abnormalSlices.join('、') : '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="模型名称">{{ resultInfo.modelName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="热力图文件 ID">{{ resultInfo.heatmapFileId || '--' }}</el-descriptions-item>
          <el-descriptions-item label="医生确认状态">
            {{ resultInfo.doctorConfirmStatus || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="失败原因">
            {{ resultInfo.failureReason || '--' }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </article>
  </div>
</template>

<style scoped>
.ct-panel {
  display: grid;
  gap: 20px;
}

.ct-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 20px;
}

.sub-card {
  padding: 20px;
  border-radius: var(--radius-md);
  background: rgba(252, 254, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow-card);
}

.result-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.result-head h3 {
  margin: 10px 0 0;
  font-size: 24px;
  font-weight: 900;
}

.result-head p,
.upload-head span,
.preview-head span {
  margin-top: 10px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.result-metric {
  min-width: 120px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(79, 162, 191, 0.12), rgba(85, 191, 154, 0.12));
  text-align: right;
}

.result-metric span {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
}

.result-metric strong {
  font-size: 28px;
}

.upload-head strong,
.preview-head strong {
  display: block;
  font-size: 16px;
  font-weight: 800;
}

.preview-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.local-nrrd-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.local-nrrd-input {
  min-width: 220px;
}

.local-nrrd-banner {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(79, 162, 191, 0.1);
  border: 1px solid rgba(79, 162, 191, 0.18);
  color: var(--text-secondary);
  font-size: 13px;
}

.upload-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.upload-row,
.list-toolbar,
.action-row,
.row-actions,
.list-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
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

.upload-file-name,
.list-footer {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.form-block,
.file-list-panel,
.preview-shell,
.visual-switcher,
.result-alert,
.ct-descriptions {
  margin-top: 20px;
}

.file-table {
  margin-top: 16px;
}

.task-status-card {
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

.preview-shell {
  padding: 18px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.42);
}

.preview-media,
.preview-frame {
  width: 100%;
  min-height: 360px;
  margin-top: 14px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: #f5f9fb;
}

.preview-media {
  object-fit: contain;
}

.preview-frame {
  border: 1px solid var(--border-soft);
}

.preview-link {
  display: block;
  margin-top: 14px;
  color: #477893;
  word-break: break-all;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.result-highlight {
  padding: 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(79, 162, 191, 0.1), rgba(85, 191, 154, 0.14));
}

.result-highlight span,
.result-highlight small {
  display: block;
  color: var(--text-secondary);
}

.result-highlight strong {
  display: block;
  margin-top: 8px;
  font-size: 18px;
}

@media (max-width: 1080px) {
  .ct-grid,
  .result-grid,
  .upload-meta-grid {
    grid-template-columns: 1fr;
  }

  .preview-media,
  .preview-frame {
    min-height: 280px;
  }
}
</style>
