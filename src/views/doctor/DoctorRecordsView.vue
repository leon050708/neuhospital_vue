<script setup>
import { computed, defineAsyncComponent, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import {
  confirmOutpatientRecord,
  createOutpatientRecord,
  getOutpatientRecordDetail,
  getOutpatientRecordPage,
  updateOutpatientRecord
} from '@/api/outpatientRecords'
import { getPatientDetail } from '@/api/patients'
import { getRegistrationDetail } from '@/api/registrations'
import { finishQueuePatient } from '@/api/queue'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const DoctorCtAnalysisPanel = defineAsyncComponent(() => import('@/components/doctor/DoctorCtAnalysisPanel.vue'))

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const doctorId = computed(() => authStore.profile?.bizId)
const currentSection = computed(() => route.meta?.section === 'history' ? 'history' : 'consultation')

const loading = ref(false)
const detailLoading = ref(false)
const submitting = ref(false)
const records = ref([])
const total = ref(0)
const selectedRecord = ref(null)
const activeRecordId = ref('')
const patientProfile = ref(null)
const ctPanelVisible = ref(false)
const CONTEXT_STORAGE_KEY = 'doctor-consultation-context'
const ctWorkflowState = ref({
  taskInfo: null,
  resultInfo: null,
  selectedFileRecord: null,
  previewUrl: '',
  polling: false
})

const query = reactive({
  pageNo: 1,
  pageSize: 20
})

const consultationContext = reactive({
  source: '',
  queueId: '',
  patientId: '',
  registrationId: '',
  departmentId: '',
  registrationNo: '',
  queueNo: ''
})

const isConsultationMode = computed(() => {
  return getRouteQueryValue('source') === 'queue' || consultationContext.source === 'queue'
})

const recordForm = reactive({
  chiefComplaint: '',
  presentIllness: '',
  pastHistory: '',
  allergyHistory: '',
  physicalExam: '',
  preliminaryDiagnosis: '',
  finalDiagnosis: '',
  advice: ''
})

function resetRecordForm() {
  recordForm.chiefComplaint = ''
  recordForm.presentIllness = ''
  recordForm.pastHistory = ''
  recordForm.allergyHistory = ''
  recordForm.physicalExam = ''
  recordForm.preliminaryDiagnosis = ''
  recordForm.finalDiagnosis = ''
  recordForm.advice = ''
}

function applyRecordToForm(record) {
  recordForm.chiefComplaint = record?.chiefComplaint || ''
  recordForm.presentIllness = record?.presentIllness || ''
  recordForm.pastHistory = record?.pastHistory || ''
  recordForm.allergyHistory = record?.allergyHistory || ''
  recordForm.physicalExam = record?.physicalExam || ''
  recordForm.preliminaryDiagnosis = record?.preliminaryDiagnosis || ''
  recordForm.finalDiagnosis = record?.finalDiagnosis || ''
  recordForm.advice = record?.advice || ''
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function getRouteQueryValue(key) {
  return typeof route.query[key] === 'string' ? route.query[key] : ''
}

function readStoredConsultationContext() {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.sessionStorage.getItem(CONTEXT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistConsultationContext() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify({ ...consultationContext }))
}

function applyConsultationContext(partial = {}) {
  Object.keys(consultationContext).forEach((key) => {
    const nextValue = partial[key]
    if (nextValue !== undefined && nextValue !== null && String(nextValue) !== '') {
      consultationContext[key] = String(nextValue)
    }
  })

  if (!consultationContext.source) {
    consultationContext.source = 'queue'
  }

  persistConsultationContext()
}

async function hydrateConsultationContext() {
  applyConsultationContext({
    ...readStoredConsultationContext(),
    source: getRouteQueryValue('source'),
    queueId: getRouteQueryValue('queueId'),
    patientId: getRouteQueryValue('patientId'),
    registrationId: getRouteQueryValue('registrationId'),
    departmentId: getRouteQueryValue('departmentId'),
    registrationNo: getRouteQueryValue('registrationNo'),
    queueNo: getRouteQueryValue('queueNo')
  })

  if (!isConsultationMode.value) {
    return
  }

  if (!consultationContext.registrationId) {
    return
  }

  if (consultationContext.patientId && consultationContext.departmentId) {
    return
  }

  try {
    const response = await getRegistrationDetail(Number(consultationContext.registrationId))
    const registration = unwrapResult(response, '加载挂号详情失败') || {}
    applyConsultationContext({
      patientId: registration.patientId,
      departmentId: registration.departmentId,
      registrationNo: registration.registrationNo
    })
  } catch (error) {
    ElMessage.warning(getErrorMessage(error, '当前接诊缺少挂号详情，可能无法创建病历'))
  }
}

const missingContextFields = computed(() => {
  const fields = []
  if (!consultationContext.patientId) {
    fields.push('patientId')
  }
  if (!consultationContext.registrationId) {
    fields.push('registrationId')
  }
  if (!consultationContext.departmentId) {
    fields.push('departmentId')
  }
  if (!doctorId.value) {
    fields.push('doctorId')
  }
  return fields
})

function buildRecordPayload() {
  return {
    registrationId: Number(consultationContext.registrationId),
    patientId: Number(consultationContext.patientId),
    doctorId: Number(doctorId.value),
    departmentId: Number(consultationContext.departmentId),
    chiefComplaint: recordForm.chiefComplaint,
    presentIllness: recordForm.presentIllness,
    pastHistory: recordForm.pastHistory,
    allergyHistory: recordForm.allergyHistory,
    physicalExam: recordForm.physicalExam,
    preliminaryDiagnosis: recordForm.preliminaryDiagnosis,
    finalDiagnosis: recordForm.finalDiagnosis,
    advice: recordForm.advice,
    diagnoses: []
  }
}

const hasSavedRecord = computed(() => Boolean(activeRecordId.value))
const hasPreliminaryDiagnosis = computed(() => Boolean(recordForm.preliminaryDiagnosis?.trim()))
const canOpenClinicalOrders = computed(() => hasSavedRecord.value)
const ctAnalysisCompleted = computed(() => ctWorkflowState.value.resultInfo?.taskStatus === 'SUCCESS')
const patientHistoryRecords = computed(() => {
  if (!consultationContext.patientId) {
    return []
  }

  return records.value
    .filter((item) => String(item.patientId) === consultationContext.patientId)
    .slice(0, 5)
})

const patientSummaryItems = computed(() => {
  const profile = patientProfile.value || {}
  const registrationInfo = selectedRecord.value || {}

  return [
    { label: '患者姓名', value: profile.realName || profile.patientName || profile.name || '--' },
    { label: '性别', value: profile.gender || '--' },
    { label: '年龄', value: profile.age || '--' },
    { label: '挂号科室', value: registrationInfo.departmentName || consultationContext.departmentId || '--' },
    { label: '叫号状态', value: consultationContext.queueNo ? `候诊号 ${consultationContext.queueNo}` : '待接诊' },
    { label: '过敏史', value: recordForm.allergyHistory || profile.allergyHistory || '--' },
    { label: '既往病史', value: recordForm.pastHistory || profile.medicalHistory || profile.pastHistory || '--' }
  ]
})

const workspaceStatusCards = computed(() => {
  const prescriptionStatus = canOpenClinicalOrders.value ? '未操作' : '待保存病历'
  const ctStatus = ctWorkflowState.value.resultInfo?.taskStatus
    ? ({
        SUCCESS: '已完成分析',
        RUNNING: '分析中',
        FAILED: '分析失败',
        PENDING: '待执行'
      })[ctWorkflowState.value.resultInfo?.taskStatus] || '未操作'
    : (ctWorkflowState.value.taskInfo ? '已提交待分析' : '未操作')

  return [
    { title: '开处方', status: prescriptionStatus, action: 'prescription' },
    { title: 'CT 分析', status: ctStatus, action: 'ct' }
  ]
})

function updateCtWorkflowState(nextState) {
  ctWorkflowState.value = {
    taskInfo: nextState?.taskInfo || null,
    resultInfo: nextState?.resultInfo || null,
    selectedFileRecord: nextState?.selectedFileRecord || null,
    previewUrl: nextState?.previewUrl || '',
    polling: Boolean(nextState?.polling)
  }
}

function openCtWorkbench() {
  ctPanelVisible.value = true
  if (typeof window !== 'undefined') {
    window.location.hash = '#ct-workbench'
  }
}

function goToDoctorOrders(targetTab, record = selectedRecord.value) {
  if (!record) {
    ElMessage.warning('请先创建或加载当前接诊病历')
    return
  }

  if (!hasSavedRecord.value) {
    ElMessage.warning('请先保存病历草稿，再继续检查、检验或处方操作')
    return
  }

  const targetPath = `/workspace/doctor/orders/${targetTab}`

  router.push({
    path: targetPath,
    query: {
      source: 'record',
      tab: targetTab,
      queueId: consultationContext.queueId || '',
      patientId: record.patientId || consultationContext.patientId || '',
      registrationId: record.registrationId || consultationContext.registrationId || '',
      medicalRecordId: record.id || '',
      departmentId: record.departmentId || consultationContext.departmentId || '',
      clinicalDiagnosis: record.finalDiagnosis || record.preliminaryDiagnosis || ''
    }
  })
}

async function loadPatientProfile(patientId) {
  if (isPreview.value || !patientId) {
    patientProfile.value = null
    return
  }

  try {
    const response = await getPatientDetail(Number(patientId))
    patientProfile.value = unwrapResult(response, '加载患者详情失败') || null
  } catch (error) {
    patientProfile.value = null
    ElMessage.warning(getErrorMessage(error, '加载患者详情失败'))
  }
}

async function loadRecords() {
  if (isPreview.value || !doctorId.value) {
    return
  }

  loading.value = true

  try {
    const response = await getOutpatientRecordPage({
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      doctorId: doctorId.value
    })

    const pageData = unwrapResult(response, '加载病历列表失败') || {}
    records.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载病历列表失败'))
  } finally {
    loading.value = false
  }
}

async function loadRecordDetail(recordId, { silent = false } = {}) {
  if (!recordId) {
    return
  }

  if (!silent) {
    detailLoading.value = true
  }

  try {
    const response = await getOutpatientRecordDetail(recordId)
    const data = unwrapResult(response, '加载病历详情失败') || null
    selectedRecord.value = data
    activeRecordId.value = data?.id ? String(data.id) : ''
    if (data) {
      applyConsultationContext({
        patientId: data.patientId,
        registrationId: data.registrationId,
        departmentId: data.departmentId
      })
    }
    applyRecordToForm(data)
    return data
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载病历详情失败'))
    return null
  } finally {
    if (!silent) {
      detailLoading.value = false
    }
  }
}

async function syncConsultationRecord() {
  await hydrateConsultationContext()
  await loadPatientProfile(consultationContext.patientId)

  if (!isConsultationMode.value || !consultationContext.registrationId) {
    return
  }

  if (!records.value.length) {
    selectedRecord.value = null
    activeRecordId.value = ''
    resetRecordForm()
    return
  }

  const matchedRecord = records.value.find(
    (item) => String(item.registrationId) === consultationContext.registrationId
  )

  if (matchedRecord) {
    await loadRecordDetail(matchedRecord.id, { silent: true })
    return
  }

  selectedRecord.value = null
  activeRecordId.value = ''
  resetRecordForm()
}

async function saveCurrentRecord() {
  await hydrateConsultationContext()

  if (missingContextFields.value.length) {
    ElMessage.warning(`当前接诊上下文不完整，缺少 ${missingContextFields.value.join('、')}，无法保存病历`)
    return
  }

  submitting.value = true

  try {
    if (activeRecordId.value) {
      const response = await updateOutpatientRecord(Number(activeRecordId.value), buildRecordPayload())
      unwrapResult(response, '更新病历失败')
      ElMessage.success('病历已保存')
      await Promise.all([loadRecords(), loadRecordDetail(Number(activeRecordId.value), { silent: true })])
      return
    }

    const response = await createOutpatientRecord(buildRecordPayload())
    const recordId = unwrapResult(response, '创建病历失败')
    activeRecordId.value = String(recordId)
    ElMessage.success('病历创建成功')
    await Promise.all([loadRecords(), loadRecordDetail(recordId, { silent: true })])
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '保存病历失败'))
  } finally {
    submitting.value = false
  }
}

async function confirmAndFinishVisit() {
  if (!activeRecordId.value) {
    ElMessage.warning('请先保存病历后再完成就诊')
    return
  }

  submitting.value = true

  try {
    const saveResponse = await updateOutpatientRecord(Number(activeRecordId.value), buildRecordPayload())
    unwrapResult(saveResponse, '更新病历失败')

    const confirmResponse = await confirmOutpatientRecord(Number(activeRecordId.value))
    unwrapResult(confirmResponse, '确认病历失败')

    if (consultationContext.queueId) {
      const finishResponse = await finishQueuePatient(Number(consultationContext.queueId), doctorId.value)
      unwrapResult(finishResponse, '完成就诊失败')
    }

    ElMessage.success('病历已确认，就诊已完成')
    await Promise.all([loadRecords(), loadRecordDetail(Number(activeRecordId.value), { silent: true })])

    router.replace('/workspace/doctor/queue')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '完成就诊失败'))
  } finally {
    submitting.value = false
  }
}

watch(
  () => route.query,
  async () => {
    if (isConsultationMode.value) {
      await syncConsultationRecord()
    }
  }
)

onMounted(async () => {
  await hydrateConsultationContext()
  await loadRecords()
  if (isConsultationMode.value) {
    await syncConsultationRecord()
  }
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Medical Record</div>
      <h2 class="section-title">病历诊断</h2>
      <p class="section-desc">
        当前页面改成一个就诊工作台：左边看患者信息，中间完成病历采集，右边只保留 CT 和处方能力，最后保存病历并结束就诊。
      </p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实病历接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!doctorId"
        title="当前登录信息里没有 doctor bizId，暂时无法查询医生病历"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <el-alert
          v-if="currentSection === 'consultation' && isConsultationMode"
          title="当前已进入就诊工作台。病历采集是主流程，右侧只保留手动处方和 CT 分析两个辅助模块。"
          type="success"
          :closable="false"
          show-icon
          class="notice"
        />

        <div v-if="currentSection === 'consultation' && isConsultationMode" class="context-bar">
          <span>queueNo: {{ consultationContext.queueNo || '--' }}</span>
          <span>registrationNo: {{ consultationContext.registrationNo || '--' }}</span>
          <span>patientId: {{ consultationContext.patientId || '--' }}</span>
          <span>registrationId: {{ consultationContext.registrationId || '--' }}</span>
        </div>

        <div v-if="currentSection === 'consultation' && isConsultationMode" class="workbench-grid">
          <aside class="sub-card patient-panel">
            <div class="card-head">
              <h3>患者信息区</h3>
              <span class="status-text">{{ selectedRecord?.status || '待采集' }}</span>
            </div>

            <div class="patient-summary">
              <div v-for="item in patientSummaryItems" :key="item.label" class="summary-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value || '--' }}</strong>
              </div>
            </div>

            <div class="history-panel">
              <div class="mini-section-head">
                <strong>历史就诊记录</strong>
                <span>{{ patientHistoryRecords.length }} 条</span>
              </div>
              <el-empty v-if="!patientHistoryRecords.length" description="暂无历史记录" :image-size="68" />
              <button
                v-for="item in patientHistoryRecords"
                :key="item.id"
                type="button"
                class="history-chip"
                @click="loadRecordDetail(item.id)"
              >
                <strong>{{ item.recordNo || `病例 #${item.id}` }}</strong>
                <span>{{ item.preliminaryDiagnosis || '未填写初步诊断' }}</span>
              </button>
            </div>
          </aside>

          <main class="sub-card record-panel">
            <div class="card-head">
              <div>
                <h3>病历采集区</h3>
                <p class="mini-desc">这里是医生的核心输入区，后续 CT 和处方都会复用这些信息。</p>
              </div>
              <span class="status-text">{{ activeRecordId ? '草稿已建立' : '待创建病历' }}</span>
            </div>

            <div class="record-form-grid">
              <div class="field-block field-span-2">
                <label>主诉</label>
                <el-input v-model="recordForm.chiefComplaint" placeholder="例如：头痛 3 天，伴恶心" />
              </div>
              <div class="field-block field-span-2">
                <label>现病史</label>
                <el-input v-model="recordForm.presentIllness" type="textarea" :rows="4" placeholder="补充症状变化、持续时间、诱因等" />
              </div>
              <div class="field-block">
                <label>既往史</label>
                <el-input v-model="recordForm.pastHistory" type="textarea" :rows="4" placeholder="高血压、糖尿病、既往手术等" />
              </div>
              <div class="field-block">
                <label>过敏史</label>
                <el-input v-model="recordForm.allergyHistory" type="textarea" :rows="4" placeholder="药物过敏、食物过敏等" />
              </div>
              <div class="field-block field-span-2">
                <label>体格检查</label>
                <el-input v-model="recordForm.physicalExam" type="textarea" :rows="4" placeholder="生命体征、体征检查结果" />
              </div>
              <div class="field-block">
                <label>初步诊断</label>
                <el-input v-model="recordForm.preliminaryDiagnosis" placeholder="形成初步诊断思路" />
              </div>
              <div class="field-block">
                <label>医生备注</label>
                <el-input v-model="recordForm.advice" placeholder="补充诊疗计划或注意事项" />
              </div>
              <div class="field-block field-span-2">
                <label>最终诊断</label>
                <el-input v-model="recordForm.finalDiagnosis" placeholder="可选：结合结果后填写最终诊断" />
              </div>
            </div>

            <div class="action-ribbon">
              <el-button type="primary" round :loading="submitting" @click="saveCurrentRecord">
                {{ activeRecordId ? '保存草稿' : '创建病历草稿' }}
              </el-button>
              <el-button round :disabled="!hasSavedRecord" @click="goToDoctorOrders('prescription')">医生确认处方</el-button>
              <el-button
                type="success"
                round
                :loading="submitting"
                :disabled="selectedRecord?.status === 'CONFIRMED' || !hasSavedRecord"
                @click="confirmAndFinishVisit"
              >
                保存病历并结束就诊
              </el-button>
            </div>

            <el-alert
              v-if="!hasSavedRecord"
              title="建议先保存病历草稿，再进入 CT 或处方模块。"
              type="info"
              :closable="false"
              show-icon
              class="workflow-tip"
            />
          </main>

          <aside class="sub-card assistant-panel">
            <div class="card-head">
              <div>
                <h3>辅助功能区</h3>
                <p class="mini-desc">这些模块都是可选的诊断增强能力，不强制按线性流程完成。</p>
              </div>
              <span class="status-text">可选模块</span>
            </div>

            <div class="module-stack">
              <article v-for="card in workspaceStatusCards" :key="card.title" class="module-card">
                <div>
                  <strong>{{ card.title }}</strong>
                  <p>{{ card.status }}</p>
                </div>
                <el-button
                  v-if="card.action !== 'ct'"
                  round
                  :disabled="!hasSavedRecord"
                  @click="goToDoctorOrders(card.action)"
                >
                  {{ hasSavedRecord ? '进入' : '待病历草稿' }}
                </el-button>
                <el-button v-else round @click="openCtWorkbench">查看模块</el-button>
              </article>
            </div>
          </aside>
        </div>

        <div v-if="currentSection === 'consultation' && isConsultationMode" id="ct-workbench" class="workbench-extensions">
          <div v-if="!ctPanelVisible" class="sub-card ct-lazy-card">
            <div>
              <strong>CT 分析与可视化</strong>
              <p class="mini-desc">默认不加载 CT 模块，避免影响进入就诊速度。需要时再手动展开。</p>
            </div>
            <el-button type="primary" round @click="openCtWorkbench">打开 CT 模块</el-button>
          </div>
          <DoctorCtAnalysisPanel v-else embedded @state-change="updateCtWorkflowState" />
        </div>

        <el-empty
          v-if="currentSection === 'consultation' && !isConsultationMode"
          description="当前页面用于从候诊队列进入接诊，请先在候诊队列选择患者"
          class="detail-block"
        />

        <el-table
          v-if="currentSection === 'history'"
          :data="records"
          v-loading="loading"
          class="table-block"
          empty-text="当前医生没有查询到病历记录"
        >
          <el-table-column prop="id" label="病历 ID" min-width="110" />
          <el-table-column prop="recordNo" label="病历编号" min-width="180" />
          <el-table-column prop="patientId" label="患者 ID" min-width="110" />
          <el-table-column prop="registrationId" label="挂号 ID" min-width="120" />
          <el-table-column prop="preliminaryDiagnosis" label="初步诊断" min-width="220" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" min-width="100" />
          <el-table-column label="操作" min-width="180" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button link type="primary" @click="loadRecordDetail(row.id)">查看详情</el-button>
                <el-button link @click="goToDoctorOrders('check', row)">开检查</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="currentSection === 'history'" class="list-footer">当前共 {{ total }} 条病历记录</div>

        <el-descriptions
          v-if="currentSection === 'history' && selectedRecord"
          :column="2"
          border
          class="detail-block"
        >
          <el-descriptions-item label="病历编号">{{ selectedRecord.recordNo || '--' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ selectedRecord.status || '--' }}</el-descriptions-item>
          <el-descriptions-item label="主诉">{{ selectedRecord.chiefComplaint || '--' }}</el-descriptions-item>
          <el-descriptions-item label="现病史">{{ selectedRecord.presentIllness || '--' }}</el-descriptions-item>
          <el-descriptions-item label="既往史">{{ selectedRecord.pastHistory || '--' }}</el-descriptions-item>
          <el-descriptions-item label="过敏史">{{ selectedRecord.allergyHistory || '--' }}</el-descriptions-item>
          <el-descriptions-item label="体格检查">{{ selectedRecord.physicalExam || '--' }}</el-descriptions-item>
          <el-descriptions-item label="初步诊断">{{ selectedRecord.preliminaryDiagnosis || '--' }}</el-descriptions-item>
          <el-descriptions-item label="最终诊断">{{ selectedRecord.finalDiagnosis || '--' }}</el-descriptions-item>
          <el-descriptions-item label="医嘱建议">{{ selectedRecord.advice || '--' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.notice,
.context-bar,
.table-block,
.list-footer,
.detail-block,
.section-grid {
  margin-top: 20px;
}

.context-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--text-secondary);
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.45fr) minmax(320px, 0.95fr);
  gap: 18px;
}

.sub-card {
  padding: 20px;
  border-radius: var(--radius-md);
  background: rgba(252, 254, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow-card);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.status-text {
  color: var(--text-secondary);
}

.patient-summary {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.summary-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(246, 250, 252, 0.92);
  border: 1px solid rgba(113, 156, 176, 0.12);
}

.summary-item span,
.summary-item strong,
.history-chip span,
.history-chip strong {
  display: block;
}

.summary-item span,
.history-chip span {
  color: var(--text-secondary);
  font-size: 13px;
}

.summary-item strong,
.history-chip strong {
  margin-top: 6px;
}

.history-panel,
.module-stack {
  margin-top: 20px;
}

.mini-section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.history-chip {
  width: 100%;
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(113, 156, 176, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
  cursor: pointer;
}

.record-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.field-block {
  display: grid;
  gap: 8px;
}

.field-block label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 700;
}

.field-span-2 {
  grid-column: span 2;
}

.action-ribbon {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.row-actions,
.entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.workflow-tip {
  margin-top: 16px;
}

.module-card {
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(246, 250, 252, 0.92);
  border: 1px solid rgba(113, 156, 176, 0.12);
}

.module-card + .module-card {
  margin-top: 12px;
}

.module-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.module-card p {
  margin: 6px 0 0;
  color: var(--text-secondary);
}

.mini-desc {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.workbench-extensions {
  margin-top: 20px;
}

.ct-lazy-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.list-footer {
  color: var(--text-secondary);
}

@media (max-width: 1260px) {
  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }

  .record-form-grid {
    grid-template-columns: 1fr;
  }

  .ct-lazy-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 980px) {
  .workbench-grid {
    grid-template-columns: 1fr;
  }
}
</style>
