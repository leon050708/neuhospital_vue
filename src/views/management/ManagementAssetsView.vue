<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getDepartments } from '@/api/departments'
import { getDrugPage } from '@/api/drugs'
import { getFileList } from '@/api/files'
import {
  offlineKnowledgeDocument,
  publishKnowledgeDocument,
  uploadKnowledgeDocument
} from '@/api/knowledge'
import { unwrapResult } from '@/utils/result'

const KNOWLEDGE_TYPE_OPTIONS = [
  { label: '挂号流程', value: 'REGISTRATION_PROCESS' },
  { label: '就诊须知', value: 'VISIT_NOTICE' },
  { label: '科室说明', value: 'DEPARTMENT_INFO' },
  { label: '材料准备', value: 'VISIT_PREPARATION' },
  { label: '检查须知', value: 'EXAM_NOTICE' },
  { label: '常见问题', value: 'FAQ' }
]

const STATUS_LABELS = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  OFFLINE: '已下线'
}

const PARSER_STATUS_LABELS = {
  PENDING: '等待解析',
  RUNNING: '解析中',
  EMBEDDED: '已向量化',
  FAILED: '解析失败'
}

const route = useRoute()
const isPreview = computed(() => Boolean(route.meta?.preview))
const currentSection = computed(() => {
  if (route.meta?.section === 'files') return 'files'
  if (route.meta?.section === 'knowledge') return 'knowledge'
  return 'drugs'
})

const drugLoading = ref(false)
const fileLoading = ref(false)
const uploadLoading = ref(false)
const knowledgeActionLoading = ref(false)
const drugs = ref([])
const files = ref([])
const departments = ref([])
const selectedFile = ref(null)
const latestUploadedDocument = ref(null)
const drugTotal = ref(0)
const fileTotal = ref(0)

const drugQuery = reactive({
  pageNo: 1,
  pageSize: 6,
  keyword: '',
  category: ''
})

const fileQuery = reactive({
  pageNo: 1,
  pageSize: 6,
  bizType: '',
  keyword: ''
})

const knowledgeForm = reactive({
  title: '',
  knowledgeType: 'REGISTRATION_PROCESS',
  departmentId: '',
  tags: '',
  publishNow: true
})

function normalizeFileRecord(record) {
  return {
    id: record.id,
    originalName: record.originalName || record.fileName || '--',
    bizType: record.bizType || '--',
    contentType: record.contentType || '--',
    uploadedAt: record.uploadedAt || record.createdAt || '--'
  }
}

function handleKnowledgeFileChange(uploadFile) {
  selectedFile.value = uploadFile?.raw || null

  if (!knowledgeForm.title && uploadFile?.name) {
    const nextTitle = uploadFile.name.replace(/\.[^.]+$/, '')
    knowledgeForm.title = nextTitle || uploadFile.name
  }
}

function handleKnowledgeFileRemove() {
  selectedFile.value = null
}

function resetKnowledgeForm() {
  selectedFile.value = null
  knowledgeForm.title = ''
  knowledgeForm.knowledgeType = 'REGISTRATION_PROCESS'
  knowledgeForm.departmentId = ''
  knowledgeForm.tags = ''
  knowledgeForm.publishNow = true
}

function formatKnowledgeStatus(status) {
  return STATUS_LABELS[status] || status || '--'
}

function formatParserStatus(status) {
  return PARSER_STATUS_LABELS[status] || status || '--'
}

async function loadDepartments() {
  if (isPreview.value) {
    return
  }

  try {
    const response = await getDepartments()
    departments.value = unwrapResult(response, '加载科室失败') || []
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载科室失败')
  }
}

async function loadDrugs() {
  if (isPreview.value) {
    return
  }

  drugLoading.value = true

  try {
    const response = await getDrugPage({
      pageNo: drugQuery.pageNo,
      pageSize: drugQuery.pageSize,
      keyword: drugQuery.keyword || undefined,
      category: drugQuery.category || undefined
    })

    const pageData = unwrapResult(response, '加载药品数据失败') || {}
    drugs.value = pageData.records || []
    drugTotal.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载药品数据失败')
  } finally {
    drugLoading.value = false
  }
}

async function loadFiles() {
  if (isPreview.value) {
    return
  }

  fileLoading.value = true

  try {
    const response = await getFileList({
      pageNo: fileQuery.pageNo,
      pageSize: fileQuery.pageSize,
      bizType: fileQuery.bizType || undefined,
      keyword: fileQuery.keyword || undefined
    })

    const pageData = unwrapResult(response, '加载文件记录失败') || {}
    files.value = (pageData.records || []).map(normalizeFileRecord)
    fileTotal.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载文件记录失败')
  } finally {
    fileLoading.value = false
  }
}

async function handleKnowledgeUpload() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择要上传的知识文档')
    return
  }

  if (!knowledgeForm.title.trim()) {
    ElMessage.warning('请输入文档标题')
    return
  }

  uploadLoading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('title', knowledgeForm.title.trim())
    formData.append('knowledgeType', knowledgeForm.knowledgeType)

    if (knowledgeForm.departmentId) {
      formData.append('departmentId', knowledgeForm.departmentId)
    }

    if (knowledgeForm.tags.trim()) {
      formData.append('tags', knowledgeForm.tags.trim())
    }

    formData.append('publishNow', String(knowledgeForm.publishNow))

    const response = await uploadKnowledgeDocument(formData)
    latestUploadedDocument.value = unwrapResult(response, '上传知识文档失败')
    ElMessage.success('知识文档上传成功')
    resetKnowledgeForm()
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '上传知识文档失败')
  } finally {
    uploadLoading.value = false
  }
}

async function runKnowledgeAction(action) {
  if (!latestUploadedDocument.value?.id) {
    return
  }

  knowledgeActionLoading.value = true

  try {
    const response = action === 'publish'
      ? await publishKnowledgeDocument(latestUploadedDocument.value.id)
      : await offlineKnowledgeDocument(latestUploadedDocument.value.id)

    latestUploadedDocument.value = unwrapResult(response, '更新知识文档状态失败') || latestUploadedDocument.value
    ElMessage.success(action === 'publish' ? '知识文档已发布' : '知识文档已下线')
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '更新知识文档状态失败')
  } finally {
    knowledgeActionLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadDrugs(), loadFiles(), loadDepartments()])
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Assets & Files</div>
      <h2 class="section-title">资产文件管理</h2>
      <p class="section-desc">药品库存、文件记录沿用原有接口；新增的知识库页第一版聚焦文档上传、发布和下线，方便和后端先完成联调。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实资产、文件和知识库接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <div v-else class="split-grid">
        <div v-if="currentSection === 'drugs'">
          <div class="toolbar">
            <h3 class="sub-title">药品库存</h3>
            <div class="toolbar-inputs">
              <el-input v-model="drugQuery.keyword" placeholder="药品名" clearable @keyup.enter="loadDrugs" />
              <el-input v-model="drugQuery.category" placeholder="分类" clearable @keyup.enter="loadDrugs" />
              <el-button round @click="loadDrugs">查询</el-button>
            </div>
          </div>

          <el-table
            :data="drugs"
            v-loading="drugLoading"
            class="table-block"
            empty-text="没有查询到药品数据"
          >
            <el-table-column prop="drugName" label="药品名称" min-width="170" />
            <el-table-column prop="category" label="分类" min-width="120" />
            <el-table-column prop="salePrice" label="售价" min-width="100" />
            <el-table-column prop="stockQuantity" label="库存" min-width="100" />
            <el-table-column prop="warningQuantity" label="预警值" min-width="100" />
          </el-table>

          <div class="list-footer">当前共 {{ drugTotal }} 条药品记录</div>
        </div>

        <div v-else-if="currentSection === 'files'">
          <div class="toolbar">
            <h3 class="sub-title">文件记录</h3>
            <div class="toolbar-inputs">
              <el-input v-model="fileQuery.bizType" placeholder="业务类型，如 CT" clearable @keyup.enter="loadFiles" />
              <el-input v-model="fileQuery.keyword" placeholder="文件名关键字" clearable @keyup.enter="loadFiles" />
              <el-button round @click="loadFiles">查询</el-button>
            </div>
          </div>

          <el-table
            :data="files"
            v-loading="fileLoading"
            class="table-block"
            empty-text="没有查询到文件记录"
          >
            <el-table-column prop="id" label="文件 ID" min-width="100" />
            <el-table-column prop="originalName" label="文件名" min-width="180" show-overflow-tooltip />
            <el-table-column prop="bizType" label="业务类型" min-width="100" />
            <el-table-column prop="contentType" label="内容类型" min-width="150" show-overflow-tooltip />
            <el-table-column prop="uploadedAt" label="上传时间" min-width="160" />
          </el-table>

          <div class="list-footer">当前共 {{ fileTotal }} 条文件记录</div>
        </div>

        <div v-else class="knowledge-grid">
          <div class="knowledge-form glass-subcard">
            <div class="toolbar">
              <h3 class="sub-title">知识文档上传</h3>
              <p class="section-tip">支持 `pdf`、`docx`、`md`、`txt`。当前后端暂无列表接口，所以这里会展示最近一次上传结果。</p>
            </div>

            <div class="form-grid">
              <el-input v-model="knowledgeForm.title" placeholder="文档标题" />

              <el-select v-model="knowledgeForm.knowledgeType" placeholder="知识类别">
                <el-option
                  v-for="item in KNOWLEDGE_TYPE_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>

              <el-select v-model="knowledgeForm.departmentId" placeholder="可选：关联科室" clearable filterable>
                <el-option
                  v-for="item in departments"
                  :key="item.id"
                  :label="item.departmentName || item.name || `科室 ${item.id}`"
                  :value="String(item.id)"
                />
              </el-select>

              <el-input v-model="knowledgeForm.tags" placeholder="可选：标签，多个用逗号分隔" />
            </div>

            <el-upload
              drag
              :auto-upload="false"
              :show-file-list="true"
              :limit="1"
              accept=".pdf,.docx,.md,.txt"
              :on-change="handleKnowledgeFileChange"
              :on-remove="handleKnowledgeFileRemove"
            >
              <div class="upload-drag-title">拖拽文件到这里，或点击选择</div>
              <div class="upload-drag-desc">建议先上传挂号流程、材料准备、检查须知等医院知识文档</div>
            </el-upload>

            <div class="publish-toggle">
              <span>上传后立即发布</span>
              <el-switch v-model="knowledgeForm.publishNow" />
            </div>

            <div class="knowledge-actions">
              <el-button type="primary" round :loading="uploadLoading" @click="handleKnowledgeUpload">
                {{ uploadLoading ? '上传中' : '上传知识文档' }}
              </el-button>
              <span v-if="selectedFile" class="selected-file-name">当前文件：{{ selectedFile.name }}</span>
            </div>
          </div>

          <div class="knowledge-result glass-subcard">
            <div class="toolbar">
              <h3 class="sub-title">最近上传结果</h3>
              <p class="section-tip">用于确认 `status`、`parserStatus`、`chunkCount` 是否符合联调预期。</p>
            </div>

            <el-empty v-if="!latestUploadedDocument" description="上传成功后会在这里显示文档状态" />

            <template v-else>
              <el-descriptions :column="2" border class="table-block">
                <el-descriptions-item label="文档 ID">{{ latestUploadedDocument.id || '--' }}</el-descriptions-item>
                <el-descriptions-item label="文档编号">{{ latestUploadedDocument.docNo || '--' }}</el-descriptions-item>
                <el-descriptions-item label="标题">{{ latestUploadedDocument.title || '--' }}</el-descriptions-item>
                <el-descriptions-item label="知识类别">{{ latestUploadedDocument.knowledgeType || '--' }}</el-descriptions-item>
                <el-descriptions-item label="科室 ID">{{ latestUploadedDocument.departmentId || '未关联' }}</el-descriptions-item>
                <el-descriptions-item label="标签">{{ latestUploadedDocument.tags || '无' }}</el-descriptions-item>
                <el-descriptions-item label="状态">{{ formatKnowledgeStatus(latestUploadedDocument.status) }}</el-descriptions-item>
                <el-descriptions-item label="解析状态">{{ formatParserStatus(latestUploadedDocument.parserStatus) }}</el-descriptions-item>
                <el-descriptions-item label="切片数">{{ latestUploadedDocument.chunkCount ?? '--' }}</el-descriptions-item>
              </el-descriptions>

              <div class="knowledge-actions">
                <el-button
                  round
                  :loading="knowledgeActionLoading"
                  @click="runKnowledgeAction('publish')"
                >
                  发布文档
                </el-button>
                <el-button
                  round
                  type="warning"
                  :loading="knowledgeActionLoading"
                  @click="runKnowledgeAction('offline')"
                >
                  下线文档
                </el-button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.split-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 20px;
}

.notice {
  margin-top: 20px;
}

.sub-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.toolbar {
  display: grid;
  gap: 14px;
}

.toolbar-inputs {
  display: flex;
  gap: 12px;
}

.table-block,
.list-footer {
  margin-top: 14px;
}

.list-footer,
.section-tip,
.selected-file-name {
  color: var(--text-secondary);
}

.knowledge-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 20px;
}

.knowledge-form,
.knowledge-result {
  padding: 22px;
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.upload-drag-title {
  font-size: 16px;
  font-weight: 700;
}

.upload-drag-desc {
  margin-top: 8px;
  color: var(--text-secondary);
}

.publish-toggle,
.knowledge-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}

@media (max-width: 1100px) {
  .toolbar-inputs,
  .knowledge-grid,
  .publish-toggle,
  .knowledge-actions {
    flex-direction: column;
  }

  .knowledge-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .publish-toggle,
  .knowledge-actions {
    align-items: stretch;
  }
}
</style>
