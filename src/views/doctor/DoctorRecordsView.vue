<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import {
  confirmOutpatientRecord,
  createOutpatientRecord,
  getOutpatientRecordDetail,
  getOutpatientRecordPage,
  updateOutpatientRecord
} from '@/api/outpatientRecords'
import { getRegistrationDetail } from '@/api/registrations'
import { finishQueuePatient } from '@/api/queue'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const doctorId = computed(() => authStore.profile?.bizId)

const loading = ref(false)
const detailLoading = ref(false)
const submitting = ref(false)
const records = ref([])
const total = ref(0)
const selectedRecord = ref(null)
const activeRecordId = ref('')
const CONTEXT_STORAGE_KEY = 'doctor-consultation-context'

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

function goToDoctorOrders(targetTab, record = selectedRecord.value) {
  if (!record) {
    ElMessage.warning('请先创建或加载当前接诊病历')
    return
  }

  const basePath = route.meta?.preview ? '/preview/doctor/orders' : '/workspace/doctor/orders'

  router.push({
    path: basePath,
    query: {
      source: 'record',
      tab: targetTab,
      patientId: record.patientId || consultationContext.patientId || '',
      registrationId: record.registrationId || consultationContext.registrationId || '',
      medicalRecordId: record.id || '',
      departmentId: record.departmentId || consultationContext.departmentId || '',
      clinicalDiagnosis: record.finalDiagnosis || record.preliminaryDiagnosis || ''
    }
  })
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

    const queuePath = route.meta?.preview ? '/preview/doctor/queue' : '/workspace/doctor/queue'
    router.replace(queuePath)
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
        当前流程调整为：候诊队列叫号后进入这里接诊，保存/确认病历后再完成就诊。
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
          v-if="isConsultationMode"
          title="当前已从候诊队列进入接诊，可先保存病历，再开检查/检验/处方，最后确认病历并完成就诊。"
          type="success"
          :closable="false"
          show-icon
          class="notice"
        />

        <div v-if="isConsultationMode" class="context-bar">
          <span>queueNo: {{ consultationContext.queueNo || '--' }}</span>
          <span>registrationNo: {{ consultationContext.registrationNo || '--' }}</span>
          <span>patientId: {{ consultationContext.patientId || '--' }}</span>
          <span>registrationId: {{ consultationContext.registrationId || '--' }}</span>
        </div>

        <div v-if="isConsultationMode" class="section-grid consult-grid">
          <article class="sub-card">
            <div class="card-head">
              <h3>当前接诊病历</h3>
              <span class="status-text">{{ selectedRecord?.status || (activeRecordId ? 'DRAFT' : '未创建') }}</span>
            </div>

            <div class="form-grid">
              <el-input v-model="recordForm.chiefComplaint" placeholder="主诉" />
              <el-input v-model="recordForm.presentIllness" placeholder="现病史" />
              <el-input v-model="recordForm.pastHistory" placeholder="既往史" />
              <el-input v-model="recordForm.allergyHistory" placeholder="过敏史" />
              <el-input v-model="recordForm.physicalExam" placeholder="体格检查" />
              <el-input v-model="recordForm.preliminaryDiagnosis" placeholder="初步诊断" />
              <el-input v-model="recordForm.finalDiagnosis" placeholder="最终诊断" />
              <el-input
                v-model="recordForm.advice"
                type="textarea"
                :rows="4"
                placeholder="医嘱建议"
              />
            </div>

            <div class="row-actions">
              <el-button type="primary" round :loading="submitting" @click="saveCurrentRecord">
                {{ activeRecordId ? '保存病历' : '创建病历' }}
              </el-button>
              <el-button round @click="goToDoctorOrders('check')">开检查</el-button>
              <el-button round @click="goToDoctorOrders('inspection')">开检验</el-button>
              <el-button round @click="goToDoctorOrders('prescription')">开处方</el-button>
              <el-button
                type="success"
                round
                :loading="submitting"
                :disabled="selectedRecord?.status === 'CONFIRMED'"
                @click="confirmAndFinishVisit"
              >
                确认病历并完成就诊
              </el-button>
            </div>
          </article>

          <article class="sub-card">
            <h3>当前病历详情</h3>
            <el-skeleton v-if="detailLoading" :rows="6" animated />
            <el-descriptions v-else-if="selectedRecord" :column="1" border class="detail-block">
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
            <el-empty v-else description="当前接诊还没有创建病历" />
          </article>
        </div>

        <el-table
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

        <div class="list-footer">当前共 {{ total }} 条病历记录</div>

        <el-descriptions
          v-if="!isConsultationMode && selectedRecord"
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

.consult-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 1fr);
  gap: 16px;
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

.form-grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.list-footer {
  color: var(--text-secondary);
}

@media (max-width: 980px) {
  .consult-grid {
    grid-template-columns: 1fr;
  }
}
</style>
