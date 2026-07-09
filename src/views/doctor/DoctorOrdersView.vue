<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import { createCheckRequest, getCheckRequestDetail, getCheckRequestsPage, cancelCheckRequest } from '@/api/checkRequests'
import { confirmCheckResult, createCheckResult, getCheckResultDetail } from '@/api/checkResults'
import { createInspectionRequest, getInspectionRequestDetail, getInspectionRequestsPage, cancelInspectionRequest } from '@/api/inspectionRequests'
import { confirmInspectionResult, createInspectionResult, getInspectionResultDetail } from '@/api/inspectionResults'
import { confirmOutpatientRecord } from '@/api/outpatientRecords'
import { getDrugPage } from '@/api/drugs'
import { createPrescription, getPrescriptionDetail, getPrescriptionsPage } from '@/api/prescriptions'
import { finishQueuePatient } from '@/api/queue'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const doctorId = computed(() => authStore.profile?.bizId)

const activeTab = ref('check')
const loadingCheck = ref(false)
const loadingInspection = ref(false)
const loadingPrescription = ref(false)
const loadingDrugs = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)

const checkList = ref([])
const inspectionList = ref([])
const prescriptionList = ref([])
const drugs = ref([])

const checkTotal = ref(0)
const inspectionTotal = ref(0)
const prescriptionTotal = ref(0)

const selectedCheckDetail = ref(null)
const selectedInspectionDetail = ref(null)
const selectedPrescriptionDetail = ref(null)
const checkResultDetail = ref(null)
const inspectionResultDetail = ref(null)

const checkForm = reactive({
  patientId: '',
  registrationId: '',
  medicalRecordId: '',
  departmentId: '',
  targetDepartmentId: '',
  checkItemCode: '',
  checkItemName: '',
  clinicalDiagnosis: '',
  purpose: '',
  urgentFlag: false
})

const inspectionForm = reactive({
  patientId: '',
  registrationId: '',
  medicalRecordId: '',
  departmentId: '',
  targetDepartmentId: '',
  inspectionItemCode: '',
  inspectionItemName: '',
  sampleType: '',
  urgentFlag: false
})

const prescriptionForm = reactive({
  patientId: '',
  registrationId: '',
  medicalRecordId: '',
  departmentId: '',
  prescriptionType: 'WESTERN',
  remark: '',
  items: [
    {
      drugId: '',
      dosage: '',
      frequency: '',
      days: 1,
      usageMethod: ''
    }
  ]
})

const checkResultForm = reactive({
  checkRequestId: '',
  resultText: '',
  resultSummary: '',
  conclusion: '',
  reportFileId: ''
})

const inspectionResultForm = reactive({
  inspectionRequestId: '',
  resultSummary: '',
  conclusion: '',
  items: [
    {
      itemCode: '',
      itemName: '',
      resultValue: '',
      unit: '',
      referenceRange: '',
      abnormalFlag: ''
    }
  ]
})

const checkResultLookupId = ref('')
const inspectionResultLookupId = ref('')
const finishingVisit = ref(false)

const CHECK_ITEM_OPTIONS = [
  { code: 'CT_HEAD', name: '头颅 CT 平扫', targetDepartmentId: '3001', purpose: '排查颅内出血、骨折和急性损伤' },
  { code: 'CT_CHEST', name: '胸部 CT', targetDepartmentId: '3001', purpose: '评估肺部感染、结节及胸腔情况' },
  { code: 'XR_CHEST', name: '胸部 X 线片', targetDepartmentId: '3001', purpose: '初筛肺部与胸廓异常' },
  { code: 'US_ABDOMEN', name: '腹部彩超', targetDepartmentId: '3002', purpose: '评估肝胆胰脾肾及腹部积液' }
]

const INSPECTION_ITEM_OPTIONS = [
  { code: 'CBC', name: '血常规', sampleType: '静脉血', targetDepartmentId: '4001' },
  { code: 'CRP', name: 'C 反应蛋白', sampleType: '静脉血', targetDepartmentId: '4001' },
  { code: 'LIVER_FN', name: '肝功能', sampleType: '静脉血', targetDepartmentId: '4001' },
  { code: 'URINE_RT', name: '尿常规', sampleType: '尿液', targetDepartmentId: '4002' }
]

const DEPARTMENT_OPTIONS = [
  { value: '3001', label: '影像科' },
  { value: '3002', label: '超声科' },
  { value: '4001', label: '检验科' },
  { value: '4002', label: '尿检室' }
]

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function getPrescriptionSubmitErrorMessage(error) {
  const message = getErrorMessage(error, '创建处方失败')

  if (message.includes('Access Denied')) {
    return '后端拒绝了当前账号的处方提交权限，请检查医生账号是否被允许访问 /api/prescriptions，或重新登录后再试'
  }

  if (message.includes('prescription_type') || message.includes('PrescriptionMapper.insert')) {
    return '后端处方服务仍未写入 prescriptionType，当前报错需要后端补齐 PrescriptionCreateReq 和保存逻辑后才能提交成功'
  }

  return message
}

function toOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  return Number(value)
}

function toOptionalString(value) {
  return value ? String(value).trim() : ''
}

function resolveDailyFrequencyTimes(frequency) {
  const normalized = toOptionalString(frequency).toLowerCase()

  if (!normalized) {
    return null
  }

  const chineseMatch = normalized.match(/(?:每日|每天|一日|每晚|每晨)(\d+)次/)
  if (chineseMatch) {
    return Number(chineseMatch[1])
  }

  const englishMap = {
    qd: 1,
    qn: 1,
    bid: 2,
    tid: 3,
    qid: 4
  }

  if (englishMap[normalized]) {
    return englishMap[normalized]
  }

  const hourlyMatch = normalized.match(/^q(\d+)h$/)
  if (hourlyMatch) {
    const hours = Number(hourlyMatch[1])
    return hours > 0 ? Math.floor(24 / hours) : null
  }

  const genericMatch = normalized.match(/(\d+)次/)
  if (genericMatch) {
    return Number(genericMatch[1])
  }

  return null
}

function calculatePrescriptionQuantity(item) {
  const dailyTimes = resolveDailyFrequencyTimes(item.frequency)
  const days = Number(item.days)

  if (!dailyTimes || !days) {
    return null
  }

  return dailyTimes * days
}

function hasRequiredContext(form) {
  return Boolean(form.patientId && form.registrationId && form.medicalRecordId && form.departmentId)
}

const canReturnToConsultation = computed(() => route.query.source === 'record')
const canFinishVisitFromPrescription = computed(() => {
  return Boolean(
    route.query.source === 'record'
    && doctorId.value
    && typeof route.query.medicalRecordId === 'string'
    && route.query.medicalRecordId
    && typeof route.query.queueId === 'string'
    && route.query.queueId
  )
})

function applyRecordContextFromQuery() {
  const tab = typeof route.query.tab === 'string' ? route.query.tab : ''
  const patientId = typeof route.query.patientId === 'string' ? route.query.patientId : ''
  const registrationId = typeof route.query.registrationId === 'string' ? route.query.registrationId : ''
  const medicalRecordId = typeof route.query.medicalRecordId === 'string' ? route.query.medicalRecordId : ''
  const departmentId = typeof route.query.departmentId === 'string' ? route.query.departmentId : ''
  const clinicalDiagnosis = typeof route.query.clinicalDiagnosis === 'string' ? route.query.clinicalDiagnosis : ''

  if (tab === 'check' || tab === 'inspection' || tab === 'prescription') {
    activeTab.value = tab
  }

  if (patientId) {
    checkForm.patientId = patientId
    inspectionForm.patientId = patientId
    prescriptionForm.patientId = patientId
  }

  if (registrationId) {
    checkForm.registrationId = registrationId
    inspectionForm.registrationId = registrationId
    prescriptionForm.registrationId = registrationId
  }

  if (medicalRecordId) {
    checkForm.medicalRecordId = medicalRecordId
    inspectionForm.medicalRecordId = medicalRecordId
    prescriptionForm.medicalRecordId = medicalRecordId
  }

  if (departmentId) {
    checkForm.departmentId = departmentId
    inspectionForm.departmentId = departmentId
    prescriptionForm.departmentId = departmentId
  }

  if (clinicalDiagnosis) {
    checkForm.clinicalDiagnosis = clinicalDiagnosis
  }
}

function handleCheckItemChange(code) {
  const item = CHECK_ITEM_OPTIONS.find((option) => option.code === code)
  if (!item) {
    return
  }

  checkForm.checkItemCode = item.code
  checkForm.checkItemName = item.name
  if (!checkForm.targetDepartmentId) {
    checkForm.targetDepartmentId = item.targetDepartmentId
  }
  if (!checkForm.purpose) {
    checkForm.purpose = item.purpose
  }
}

function handleInspectionItemChange(code) {
  const item = INSPECTION_ITEM_OPTIONS.find((option) => option.code === code)
  if (!item) {
    return
  }

  inspectionForm.inspectionItemCode = item.code
  inspectionForm.inspectionItemName = item.name
  if (!inspectionForm.targetDepartmentId) {
    inspectionForm.targetDepartmentId = item.targetDepartmentId
  }
  if (!inspectionForm.sampleType) {
    inspectionForm.sampleType = item.sampleType
  }
}

function goBackToConsultation() {
  router.push({
    path: '/workspace/doctor/records/consultation',
    query: {
      source: 'queue',
      queueId: typeof route.query.queueId === 'string' ? route.query.queueId : '',
      patientId: typeof route.query.patientId === 'string' ? route.query.patientId : '',
      registrationId: typeof route.query.registrationId === 'string' ? route.query.registrationId : '',
      departmentId: typeof route.query.departmentId === 'string' ? route.query.departmentId : ''
    }
  })
}

async function finishVisitFromPrescription() {
  const medicalRecordId = typeof route.query.medicalRecordId === 'string' ? Number(route.query.medicalRecordId) : NaN
  const queueId = typeof route.query.queueId === 'string' ? Number(route.query.queueId) : NaN

  if (!medicalRecordId || !queueId || !doctorId.value) {
    ElMessage.warning('当前缺少病历或候诊上下文，暂时无法直接结束接诊')
    return
  }

  finishingVisit.value = true

  try {
    const confirmResponse = await confirmOutpatientRecord(medicalRecordId)
    unwrapResult(confirmResponse, '确认病历失败')

    const finishResponse = await finishQueuePatient(queueId, doctorId.value)
    unwrapResult(finishResponse, '完成就诊失败')

    ElMessage.success('处方已开立，当前接诊已结束')
    router.replace('/workspace/doctor/queue')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '结束接诊失败'))
  } finally {
    finishingVisit.value = false
  }
}

async function loadDrugs() {
  if (isPreview.value) {
    return
  }

  loadingDrugs.value = true

  try {
    const response = await getDrugPage({ pageNo: 1, pageSize: 100 })
    const pageData = unwrapResult(response, '加载药品目录失败') || {}
    drugs.value = pageData.records || []
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载药品目录失败'))
  } finally {
    loadingDrugs.value = false
  }
}

async function loadCheckRequests() {
  if (isPreview.value || !doctorId.value) {
    return
  }

  loadingCheck.value = true

  try {
    const response = await getCheckRequestsPage({ pageNo: 1, pageSize: 20, doctorId: doctorId.value })
    const pageData = unwrapResult(response, '加载检查申请失败') || {}
    checkList.value = pageData.records || []
    checkTotal.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载检查申请失败'))
  } finally {
    loadingCheck.value = false
  }
}

async function loadInspectionRequests() {
  if (isPreview.value || !doctorId.value) {
    return
  }

  loadingInspection.value = true

  try {
    const response = await getInspectionRequestsPage({ pageNo: 1, pageSize: 20, doctorId: doctorId.value })
    const pageData = unwrapResult(response, '加载检验申请失败') || {}
    inspectionList.value = pageData.records || []
    inspectionTotal.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载检验申请失败'))
  } finally {
    loadingInspection.value = false
  }
}

async function loadPrescriptions() {
  if (isPreview.value || !doctorId.value) {
    return
  }

  loadingPrescription.value = true

  try {
    const response = await getPrescriptionsPage({ pageNo: 1, pageSize: 20, doctorId: doctorId.value })
    const pageData = unwrapResult(response, '加载处方失败') || {}
    prescriptionList.value = pageData.records || []
    prescriptionTotal.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载处方失败'))
  } finally {
    loadingPrescription.value = false
  }
}

async function submitCheckRequest() {
  if (!hasRequiredContext(checkForm)) {
    ElMessage.warning('请先从病历页选择当前病人后，再创建检查申请')
    return
  }

  submitting.value = true

  try {
    const response = await createCheckRequest({
      ...checkForm,
      patientId: toOptionalNumber(checkForm.patientId),
      registrationId: toOptionalNumber(checkForm.registrationId),
      medicalRecordId: toOptionalNumber(checkForm.medicalRecordId),
      departmentId: toOptionalNumber(checkForm.departmentId),
      targetDepartmentId: toOptionalNumber(checkForm.targetDepartmentId)
    })
    ElMessage.success(`检查申请创建成功，ID：${unwrapResult(response, '创建检查申请失败')}`)
    await loadCheckRequests()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '创建检查申请失败'))
  } finally {
    submitting.value = false
  }
}

async function submitInspectionRequest() {
  if (!hasRequiredContext(inspectionForm)) {
    ElMessage.warning('请先从病历页选择当前病人后，再创建检验申请')
    return
  }

  submitting.value = true

  try {
    const response = await createInspectionRequest({
      ...inspectionForm,
      patientId: toOptionalNumber(inspectionForm.patientId),
      registrationId: toOptionalNumber(inspectionForm.registrationId),
      medicalRecordId: toOptionalNumber(inspectionForm.medicalRecordId),
      departmentId: toOptionalNumber(inspectionForm.departmentId),
      targetDepartmentId: toOptionalNumber(inspectionForm.targetDepartmentId)
    })
    ElMessage.success(`检验申请创建成功，ID：${unwrapResult(response, '创建检验申请失败')}`)
    await loadInspectionRequests()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '创建检验申请失败'))
  } finally {
    submitting.value = false
  }
}

async function submitPrescription() {
  if (!hasRequiredContext(prescriptionForm)) {
    ElMessage.warning('请先从病历页带入患者、挂号、病历和科室信息，再创建处方')
    return
  }

  const normalizedItems = prescriptionForm.items.map((item) => ({
    drugId: Number(item.drugId),
    dosage: toOptionalString(item.dosage),
    frequency: toOptionalString(item.frequency),
    days: Number(item.days),
    quantity: calculatePrescriptionQuantity(item),
    usageMethod: toOptionalString(item.usageMethod)
  }))

  const invalidItemIndex = normalizedItems.findIndex((item) => {
    return !item.drugId || !item.dosage || !item.frequency || !item.days || !item.quantity || !item.usageMethod
  })

  if (invalidItemIndex >= 0) {
    ElMessage.warning(`请完整填写第 ${invalidItemIndex + 1} 个药品项，并使用可识别的频次格式，例如“每日3次”或“bid”`)
    return
  }

  submitting.value = true

  try {
    const response = await createPrescription({
      patientId: Number(prescriptionForm.patientId),
      registrationId: Number(prescriptionForm.registrationId),
      medicalRecordId: Number(prescriptionForm.medicalRecordId),
      doctorId: Number(doctorId.value),
      departmentId: Number(prescriptionForm.departmentId),
      prescriptionType: prescriptionForm.prescriptionType,
      remark: toOptionalString(prescriptionForm.remark),
      items: normalizedItems
    })
    ElMessage.success(`处方创建成功，ID：${unwrapResult(response, '创建处方失败')}`)
    prescriptionForm.prescriptionType = 'WESTERN'
    prescriptionForm.remark = ''
    prescriptionForm.items = [
      {
        drugId: '',
        dosage: '',
        frequency: '',
        days: 1,
        usageMethod: ''
      }
    ]
    await loadPrescriptions()
  } catch (error) {
    ElMessage.error(getPrescriptionSubmitErrorMessage(error))
  } finally {
    submitting.value = false
  }
}

async function submitCheckResult() {
  submitting.value = true

  try {
    const response = await createCheckResult({
      checkRequestId: toOptionalNumber(checkResultForm.checkRequestId),
      resultText: checkResultForm.resultText,
      resultSummary: checkResultForm.resultSummary,
      conclusion: checkResultForm.conclusion,
      reportFileId: toOptionalNumber(checkResultForm.reportFileId)
    })
    const resultId = unwrapResult(response, '录入检查结果失败')
    checkResultLookupId.value = String(resultId)
    ElMessage.success(`检查结果录入成功，结果 ID：${resultId}`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '录入检查结果失败'))
  } finally {
    submitting.value = false
  }
}

async function submitInspectionResult() {
  submitting.value = true

  try {
    const response = await createInspectionResult({
      inspectionRequestId: toOptionalNumber(inspectionResultForm.inspectionRequestId),
      resultSummary: inspectionResultForm.resultSummary,
      conclusion: inspectionResultForm.conclusion,
      items: inspectionResultForm.items.map((item) => ({ ...item }))
    })
    const resultId = unwrapResult(response, '录入检验结果失败')
    inspectionResultLookupId.value = String(resultId)
    ElMessage.success(`检验结果录入成功，结果 ID：${resultId}`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '录入检验结果失败'))
  } finally {
    submitting.value = false
  }
}

async function loadCheckDetail(id) {
  detailLoading.value = true

  try {
    const response = await getCheckRequestDetail(id)
    selectedCheckDetail.value = unwrapResult(response, '加载检查详情失败') || null
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载检查详情失败'))
  } finally {
    detailLoading.value = false
  }
}

async function loadInspectionDetail(id) {
  detailLoading.value = true

  try {
    const response = await getInspectionRequestDetail(id)
    selectedInspectionDetail.value = unwrapResult(response, '加载检验详情失败') || null
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载检验详情失败'))
  } finally {
    detailLoading.value = false
  }
}

async function loadPrescriptionDetail(id) {
  detailLoading.value = true

  try {
    const response = await getPrescriptionDetail(id)
    selectedPrescriptionDetail.value = unwrapResult(response, '加载处方详情失败') || null
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载处方详情失败'))
  } finally {
    detailLoading.value = false
  }
}

async function doCancelCheck(id) {
  submitting.value = true

  try {
    const response = await cancelCheckRequest(id)
    unwrapResult(response, '取消检查申请失败')
    ElMessage.success('检查申请已取消')
    await loadCheckRequests()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '取消检查申请失败'))
  } finally {
    submitting.value = false
  }
}

async function doCancelInspection(id) {
  submitting.value = true

  try {
    const response = await cancelInspectionRequest(id)
    unwrapResult(response, '取消检验申请失败')
    ElMessage.success('检验申请已取消')
    await loadInspectionRequests()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '取消检验申请失败'))
  } finally {
    submitting.value = false
  }
}

async function lookupCheckResult() {
  if (!checkResultLookupId.value) {
    return
  }

  detailLoading.value = true

  try {
    const response = await getCheckResultDetail(Number(checkResultLookupId.value))
    checkResultDetail.value = unwrapResult(response, '查询检查结果失败') || null
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '查询检查结果失败'))
  } finally {
    detailLoading.value = false
  }
}

async function doConfirmCheckResult() {
  if (!checkResultLookupId.value) {
    ElMessage.warning('请先输入检查结果 ID')
    return
  }

  submitting.value = true

  try {
    const response = await confirmCheckResult(Number(checkResultLookupId.value))
    unwrapResult(response, '确认检查结果失败')
    ElMessage.success('检查结果已确认')
    await lookupCheckResult()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '确认检查结果失败'))
  } finally {
    submitting.value = false
  }
}

async function lookupInspectionResult() {
  if (!inspectionResultLookupId.value) {
    return
  }

  detailLoading.value = true

  try {
    const response = await getInspectionResultDetail(Number(inspectionResultLookupId.value))
    inspectionResultDetail.value = unwrapResult(response, '查询检验结果失败') || null
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '查询检验结果失败'))
  } finally {
    detailLoading.value = false
  }
}

async function doConfirmInspectionResult() {
  if (!inspectionResultLookupId.value) {
    ElMessage.warning('请先输入检验结果 ID')
    return
  }

  submitting.value = true

  try {
    const response = await confirmInspectionResult(Number(inspectionResultLookupId.value))
    unwrapResult(response, '确认检验结果失败')
    ElMessage.success('检验结果已确认')
    await lookupInspectionResult()
    await loadInspectionRequests()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '确认检验结果失败'))
  } finally {
    submitting.value = false
  }
}

function addPrescriptionItem() {
  prescriptionForm.items.push({
    drugId: '',
    dosage: '',
    frequency: '',
    days: 1,
    usageMethod: ''
  })
}

function removePrescriptionItem(index) {
  if (prescriptionForm.items.length === 1) {
    return
  }
  prescriptionForm.items.splice(index, 1)
}

function findDrugOption(drugId) {
  if (!drugId) {
    return null
  }

  return drugs.value.find((drug) => String(drug.id) === String(drugId)) || null
}

function addInspectionResultItem() {
  inspectionResultForm.items.push({
    itemCode: '',
    itemName: '',
    resultValue: '',
    unit: '',
    referenceRange: '',
    abnormalFlag: ''
  })
}

function removeInspectionResultItem(index) {
  if (inspectionResultForm.items.length === 1) {
    return
  }
  inspectionResultForm.items.splice(index, 1)
}

function resolveOrderSection() {
  const queryTab = typeof route.query.tab === 'string' ? route.query.tab : ''
  if (queryTab === 'check' || queryTab === 'inspection' || queryTab === 'prescription') {
    return queryTab
  }

  const section = route.meta?.orderSection
  if (section === 'inspection' || section === 'prescription') {
    return section
  }

  return 'check'
}

onMounted(async () => {
  applyRecordContextFromQuery()
  activeTab.value = resolveOrderSection()
  await Promise.all([loadDrugs(), loadCheckRequests(), loadInspectionRequests(), loadPrescriptions()])
})

watch(
  () => route.query,
  () => {
    applyRecordContextFromQuery()
  }
)

watch(
  () => route.meta?.orderSection,
  () => {
    activeTab.value = resolveOrderSection()
  }
)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Clinical Orders</div>
      <h2 class="section-title">检查、检验与处方</h2>
      <p class="section-desc">当前页直接对接后端已实现的检查申请、检验申请、处方、检查结果与检验结果接口；发药已独立到药房工作区。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实医生业务接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!doctorId"
        title="当前登录信息里没有医生业务 ID，暂时无法执行医生业务操作"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-if="!isPreview && doctorId && route.query.source === 'record'"
        title="已从病历页带入患者、挂号、病历和科室上下文，检查和检验会自动使用这些数据"
        type="success"
        :closable="false"
        show-icon
        class="notice"
      />

      <div v-if="canReturnToConsultation" class="page-toolbar">
        <el-button round @click="goBackToConsultation">返回当前接诊</el-button>
        <span class="toolbar-tip">开单完成后可回到接诊页继续做 CT 分析、处方和结束就诊。</span>
      </div>

      <el-tabs v-if="!isPreview && doctorId" v-model="activeTab" class="tabs-block">
        <el-tab-pane label="检查申请" name="check">
          <div class="section-grid">
            <article class="sub-card">
              <h3>创建检查申请</h3>
              <p class="form-tip">病人、挂号、病历和申请科室信息会根据当前接诊对象自动带入，这里只需要选择检查项目。</p>
              <div class="form-grid">
                <el-select
                  v-model="checkForm.checkItemCode"
                  placeholder="选择检查项目"
                  filterable
                  @change="handleCheckItemChange"
                >
                  <el-option
                    v-for="item in CHECK_ITEM_OPTIONS"
                    :key="item.code"
                    :label="`${item.name} / ${item.code}`"
                    :value="item.code"
                  />
                </el-select>
                <el-input v-model="checkForm.checkItemName" placeholder="项目名称" readonly />
                <el-select v-model="checkForm.targetDepartmentId" placeholder="选择执行科室">
                  <el-option
                    v-for="dept in DEPARTMENT_OPTIONS"
                    :key="dept.value"
                    :label="dept.label"
                    :value="dept.value"
                  />
                </el-select>
                <el-input v-model="checkForm.clinicalDiagnosis" placeholder="临床诊断" />
                <el-input v-model="checkForm.purpose" placeholder="检查目的" />
                <el-switch v-model="checkForm.urgentFlag" active-text="加急" />
              </div>
              <el-button type="primary" round :loading="submitting" @click="submitCheckRequest">提交检查申请</el-button>
            </article>

            <article class="sub-card">
              <h3>检查申请列表</h3>
              <el-table :data="checkList" v-loading="loadingCheck" class="table-block" empty-text="暂无检查申请">
                <el-table-column prop="id" label="ID" min-width="90" />
                <el-table-column prop="requestNo" label="申请单号" min-width="160" />
                <el-table-column prop="patientId" label="患者" min-width="100" />
                <el-table-column prop="checkItemName" label="项目名称" min-width="160" />
                <el-table-column prop="requestedAt" label="申请时间" min-width="180" />
                <el-table-column prop="status" label="状态" min-width="120" />
                <el-table-column label="操作" min-width="160">
                  <template #default="{ row }">
                    <div class="row-actions">
                      <el-button link type="primary" @click="loadCheckDetail(row.id)">详情</el-button>
                      <el-button link @click="doCancelCheck(row.id)">取消</el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              <div class="list-footer">共 {{ checkTotal }} 条检查申请</div>
            </article>
          </div>

          <el-descriptions v-if="selectedCheckDetail" :column="2" border class="detail-board">
            <el-descriptions-item label="申请单号">{{ selectedCheckDetail.requestNo || '--' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selectedCheckDetail.status || '--' }}</el-descriptions-item>
            <el-descriptions-item label="患者 ID">{{ selectedCheckDetail.patientId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="挂号 ID">{{ selectedCheckDetail.registrationId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="病历 ID">{{ selectedCheckDetail.medicalRecordId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="申请时间">{{ selectedCheckDetail.requestedAt || '--' }}</el-descriptions-item>
            <el-descriptions-item label="项目">{{ selectedCheckDetail.checkItemName || '--' }}</el-descriptions-item>
            <el-descriptions-item label="项目编码">{{ selectedCheckDetail.checkItemCode || '--' }}</el-descriptions-item>
            <el-descriptions-item label="诊断">{{ selectedCheckDetail.clinicalDiagnosis || '--' }}</el-descriptions-item>
            <el-descriptions-item label="用途">{{ selectedCheckDetail.purpose || '--' }}</el-descriptions-item>
            <el-descriptions-item label="申请科室">{{ selectedCheckDetail.departmentId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="执行科室">{{ selectedCheckDetail.targetDepartmentId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="是否加急">{{ selectedCheckDetail.urgentFlag ? '是' : '否' }}</el-descriptions-item>
            <el-descriptions-item label="结果摘要">{{ selectedCheckDetail.resultSummary || '--' }}</el-descriptions-item>
          </el-descriptions>

          <div class="section-grid">
            <article class="sub-card">
              <h3>录入检查结果</h3>
              <div class="form-grid">
                <el-input v-model="checkResultForm.checkRequestId" placeholder="checkRequestId" />
                <el-input v-model="checkResultForm.reportFileId" placeholder="reportFileId，可为空" />
                <el-input v-model="checkResultForm.resultSummary" placeholder="resultSummary" />
                <el-input v-model="checkResultForm.conclusion" placeholder="conclusion" />
                <el-input
                  v-model="checkResultForm.resultText"
                  type="textarea"
                  :rows="4"
                  placeholder="resultText"
                />
              </div>
              <el-button type="primary" round :loading="submitting" @click="submitCheckResult">提交检查结果</el-button>
            </article>

            <article class="sub-card">
              <h3>查询 / 确认检查结果</h3>
              <div class="lookup-row">
                <el-input v-model="checkResultLookupId" placeholder="输入检查结果 ID" />
                <el-button round @click="lookupCheckResult">查询</el-button>
                <el-button type="primary" round :loading="submitting" @click="doConfirmCheckResult">确认结果</el-button>
              </div>

              <el-descriptions v-if="checkResultDetail" :column="1" border class="mini-detail">
                <el-descriptions-item label="结果 ID">{{ checkResultDetail.id || '--' }}</el-descriptions-item>
                <el-descriptions-item label="报告单号">{{ checkResultDetail.reportNo || '--' }}</el-descriptions-item>
                <el-descriptions-item label="检查申请 ID">{{ checkResultDetail.checkRequestId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="状态">{{ checkResultDetail.status || '--' }}</el-descriptions-item>
                <el-descriptions-item label="报告医生">{{ checkResultDetail.reportDoctorId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="出报告时间">{{ checkResultDetail.reportedAt || '--' }}</el-descriptions-item>
                <el-descriptions-item label="报告文件">{{ checkResultDetail.reportFileId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="结果摘要">{{ checkResultDetail.resultSummary || '--' }}</el-descriptions-item>
                <el-descriptions-item label="结论">{{ checkResultDetail.conclusion || '--' }}</el-descriptions-item>
                <el-descriptions-item label="结果正文">{{ checkResultDetail.resultText || '--' }}</el-descriptions-item>
              </el-descriptions>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="检验申请" name="inspection">
          <div class="section-grid">
            <article class="sub-card">
              <h3>创建检验申请</h3>
              <p class="form-tip">病人、挂号、病历和申请科室信息会根据当前接诊对象自动带入，这里只需要选择检验项目。</p>
              <div class="form-grid">
                <el-select
                  v-model="inspectionForm.inspectionItemCode"
                  placeholder="选择检验项目"
                  filterable
                  @change="handleInspectionItemChange"
                >
                  <el-option
                    v-for="item in INSPECTION_ITEM_OPTIONS"
                    :key="item.code"
                    :label="`${item.name} / ${item.code}`"
                    :value="item.code"
                  />
                </el-select>
                <el-input v-model="inspectionForm.inspectionItemName" placeholder="项目名称" readonly />
                <el-select v-model="inspectionForm.targetDepartmentId" placeholder="选择执行科室">
                  <el-option
                    v-for="dept in DEPARTMENT_OPTIONS"
                    :key="dept.value"
                    :label="dept.label"
                    :value="dept.value"
                  />
                </el-select>
                <el-input v-model="inspectionForm.sampleType" placeholder="样本类型" readonly />
                <el-switch v-model="inspectionForm.urgentFlag" active-text="加急" />
              </div>
              <el-button type="primary" round :loading="submitting" @click="submitInspectionRequest">提交检验申请</el-button>
            </article>

            <article class="sub-card">
              <h3>检验申请列表</h3>
              <el-table :data="inspectionList" v-loading="loadingInspection" class="table-block" empty-text="暂无检验申请">
                <el-table-column prop="id" label="ID" min-width="90" />
                <el-table-column prop="requestNo" label="申请单号" min-width="160" />
                <el-table-column prop="patientId" label="患者" min-width="100" />
                <el-table-column prop="inspectionItemName" label="项目名称" min-width="180" />
                <el-table-column prop="sampleType" label="样本类型" min-width="140" />
                <el-table-column prop="requestedAt" label="申请时间" min-width="180" />
                <el-table-column prop="status" label="状态" min-width="120" />
                <el-table-column label="操作" min-width="160">
                  <template #default="{ row }">
                    <div class="row-actions">
                      <el-button link type="primary" @click="loadInspectionDetail(row.id)">详情</el-button>
                      <el-button link @click="doCancelInspection(row.id)">取消</el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              <div class="list-footer">共 {{ inspectionTotal }} 条检验申请</div>
            </article>
          </div>

          <el-descriptions v-if="selectedInspectionDetail" :column="2" border class="detail-board">
            <el-descriptions-item label="申请单号">{{ selectedInspectionDetail.requestNo || '--' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selectedInspectionDetail.status || '--' }}</el-descriptions-item>
            <el-descriptions-item label="患者 ID">{{ selectedInspectionDetail.patientId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="挂号 ID">{{ selectedInspectionDetail.registrationId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="病历 ID">{{ selectedInspectionDetail.medicalRecordId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="申请时间">{{ selectedInspectionDetail.requestedAt || '--' }}</el-descriptions-item>
            <el-descriptions-item label="项目">{{ selectedInspectionDetail.inspectionItemName || '--' }}</el-descriptions-item>
            <el-descriptions-item label="项目编码">{{ selectedInspectionDetail.inspectionItemCode || '--' }}</el-descriptions-item>
            <el-descriptions-item label="样本类型">{{ selectedInspectionDetail.sampleType || '--' }}</el-descriptions-item>
            <el-descriptions-item label="申请科室">{{ selectedInspectionDetail.departmentId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="执行科室">{{ selectedInspectionDetail.targetDepartmentId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="结果摘要">{{ selectedInspectionDetail.resultSummary || '--' }}</el-descriptions-item>
            <el-descriptions-item label="是否加急">{{ selectedInspectionDetail.urgentFlag ? '是' : '否' }}</el-descriptions-item>
          </el-descriptions>

          <div class="section-grid">
            <article class="sub-card">
              <div class="sub-head">
                <h3>录入检验结果</h3>
                <el-button text type="primary" @click="addInspectionResultItem">新增明细项</el-button>
              </div>
              <div class="form-grid">
                <el-input v-model="inspectionResultForm.inspectionRequestId" placeholder="inspectionRequestId" />
                <el-input v-model="inspectionResultForm.resultSummary" placeholder="resultSummary" />
                <el-input v-model="inspectionResultForm.conclusion" placeholder="conclusion" />
              </div>
              <div
                v-for="(item, index) in inspectionResultForm.items"
                :key="`inspection-item-${index}`"
                class="dynamic-card"
              >
                <div class="dynamic-head">
                  <strong>明细项 {{ index + 1 }}</strong>
                  <el-button text @click="removeInspectionResultItem(index)">删除</el-button>
                </div>
                <div class="form-grid">
                  <el-input v-model="item.itemCode" placeholder="itemCode" />
                  <el-input v-model="item.itemName" placeholder="itemName" />
                  <el-input v-model="item.resultValue" placeholder="resultValue" />
                  <el-input v-model="item.unit" placeholder="unit" />
                  <el-input v-model="item.referenceRange" placeholder="referenceRange" />
                  <el-input v-model="item.abnormalFlag" placeholder="abnormalFlag" />
                </div>
              </div>
              <el-button type="primary" round :loading="submitting" @click="submitInspectionResult">提交检验结果</el-button>
            </article>

            <article class="sub-card">
              <h3>查询 / 确认检验结果</h3>
              <div class="lookup-row">
                <el-input v-model="inspectionResultLookupId" placeholder="输入检验结果 ID" />
                <el-button round @click="lookupInspectionResult">查询</el-button>
                <el-button type="primary" round :loading="submitting" @click="doConfirmInspectionResult">确认结果</el-button>
              </div>

              <el-descriptions v-if="inspectionResultDetail" :column="1" border class="mini-detail">
                <el-descriptions-item label="结果 ID">{{ inspectionResultDetail.id || '--' }}</el-descriptions-item>
                <el-descriptions-item label="报告单号">{{ inspectionResultDetail.reportNo || '--' }}</el-descriptions-item>
                <el-descriptions-item label="检验申请 ID">{{ inspectionResultDetail.inspectionRequestId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="状态">{{ inspectionResultDetail.status || '--' }}</el-descriptions-item>
                <el-descriptions-item label="报告医生">{{ inspectionResultDetail.reportDoctorId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="出报告时间">{{ inspectionResultDetail.reportedAt || '--' }}</el-descriptions-item>
                <el-descriptions-item label="结果摘要">{{ inspectionResultDetail.resultSummary || '--' }}</el-descriptions-item>
                <el-descriptions-item label="结论">{{ inspectionResultDetail.conclusion || '--' }}</el-descriptions-item>
              </el-descriptions>

              <el-table
                v-if="inspectionResultDetail?.items?.length"
                :data="inspectionResultDetail.items"
                class="table-block"
              >
                <el-table-column prop="itemName" label="项目" min-width="140" />
                <el-table-column prop="resultValue" label="结果值" min-width="120" />
                <el-table-column prop="unit" label="单位" min-width="100" />
                <el-table-column prop="referenceRange" label="参考范围" min-width="140" />
                <el-table-column prop="abnormalFlag" label="异常标记" min-width="120" />
              </el-table>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="处方开立" name="prescription">
          <div v-if="route.query.source === 'record' && canFinishVisitFromPrescription" class="prescription-toolbar">
            <el-button
              type="success"
              round
              :loading="finishingVisit"
              @click="finishVisitFromPrescription"
            >
              处方完成并结束接诊
            </el-button>
          </div>

          <div class="section-grid">
            <article class="sub-card">
              <div class="sub-head">
                <h3>手动开处方</h3>
                <el-button text type="primary" @click="addPrescriptionItem">新增药品项</el-button>
              </div>
              <p class="form-tip">病历页会自动带入患者、挂号、病历和科室信息。这里选择药品并填写剂量、频次、天数、用法；数量会按“频次 x 天数”自动计算。</p>
              <div class="form-grid">
                <el-select v-model="prescriptionForm.prescriptionType" placeholder="处方类型">
                  <el-option label="西药处方" value="WESTERN" />
                  <el-option label="中药处方" value="CHINESE" />
                </el-select>
              </div>
              <el-input
                v-model="prescriptionForm.remark"
                type="textarea"
                :rows="3"
                placeholder="处方备注，例如：饭后服用、观察不适反应"
              />

              <div
                v-for="(item, index) in prescriptionForm.items"
                :key="`prescription-item-${index}`"
                class="dynamic-card"
              >
                <div class="dynamic-head">
                  <strong>药品项 {{ index + 1 }}</strong>
                  <el-button text @click="removePrescriptionItem(index)">删除</el-button>
                </div>
                <div class="form-grid labeled-grid">
                  <div class="field-block">
                    <label>药品</label>
                    <el-select v-model="item.drugId" placeholder="选择药品" filterable :loading="loadingDrugs">
                      <el-option
                        v-for="drug in drugs"
                        :key="drug.id"
                        :label="`${drug.drugName} / ${drug.specification || '规格待补充'} / 库存 ${drug.stockQuantity ?? '--'}`"
                        :value="drug.id"
                      />
                    </el-select>
                  </div>
                  <div class="field-block">
                    <label>剂量</label>
                    <el-input v-model="item.dosage" placeholder="例如 0.5g" />
                  </div>
                  <div class="field-block">
                    <label>频次</label>
                    <el-input v-model="item.frequency" placeholder="例如 每日3次、bid、tid、qid" />
                  </div>
                  <div class="field-block">
                    <label>天数</label>
                    <el-input-number v-model="item.days" :min="1" />
                  </div>
                  <div class="field-block">
                    <label>数量（自动计算）</label>
                    <el-input :model-value="calculatePrescriptionQuantity(item) ?? '请先填写可识别的频次'" readonly />
                  </div>
                  <div class="field-block">
                    <label>用法</label>
                    <el-input v-model="item.usageMethod" placeholder="例如 口服" />
                  </div>
                </div>
                <div v-if="findDrugOption(item.drugId)" class="drug-meta">
                  <span>药品名称：{{ findDrugOption(item.drugId)?.drugName || '--' }}</span>
                  <span>规格：{{ findDrugOption(item.drugId)?.specification || '--' }}</span>
                  <span>单价：{{ findDrugOption(item.drugId)?.salePrice ?? '--' }}</span>
                  <span>当前库存：{{ findDrugOption(item.drugId)?.stockQuantity ?? '--' }}</span>
                </div>
              </div>

              <el-button type="primary" round :loading="submitting" @click="submitPrescription">提交处方</el-button>
            </article>

            <article class="sub-card">
              <h3>处方列表</h3>
              <el-table :data="prescriptionList" v-loading="loadingPrescription" class="table-block" empty-text="暂无处方">
                <el-table-column prop="id" label="ID" min-width="90" />
                <el-table-column prop="prescriptionNo" label="处方号" min-width="160" />
                <el-table-column prop="status" label="状态" min-width="120" />
                <el-table-column prop="totalAmount" label="总金额" min-width="120" />
                <el-table-column prop="requestedAt" label="开立时间" min-width="180" />
                <el-table-column label="操作" min-width="120">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="loadPrescriptionDetail(row.id)">详情</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="list-footer">共 {{ prescriptionTotal }} 条处方记录</div>
            </article>
          </div>

          <el-descriptions v-if="selectedPrescriptionDetail" :column="2" border class="detail-board">
            <el-descriptions-item label="处方号">{{ selectedPrescriptionDetail.prescriptionNo || '--' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selectedPrescriptionDetail.status || '--' }}</el-descriptions-item>
            <el-descriptions-item label="总金额">{{ selectedPrescriptionDetail.totalAmount || '--' }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ selectedPrescriptionDetail.remark || '--' }}</el-descriptions-item>
          </el-descriptions>

          <el-table
            v-if="selectedPrescriptionDetail?.items?.length"
            :data="selectedPrescriptionDetail.items"
            class="table-block"
          >
            <el-table-column prop="drugName" label="药品" min-width="160" />
            <el-table-column prop="specification" label="规格" min-width="160" />
            <el-table-column prop="dosage" label="剂量" min-width="100" />
            <el-table-column prop="frequency" label="频次" min-width="100" />
            <el-table-column prop="days" label="天数" min-width="90" />
            <el-table-column prop="quantity" label="数量" min-width="90" />
            <el-table-column prop="amount" label="金额" min-width="100" />
          </el-table>

        </el-tab-pane>
      </el-tabs>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.notice,
.page-toolbar,
.tabs-block,
.detail-board {
  margin-top: 20px;
}

.page-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.toolbar-tip {
  color: var(--text-secondary);
}

.prescription-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.form-tip {
  margin: 0 0 16px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.context-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.context-bar span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(111, 200, 184, 0.14);
  color: #2d7d73;
  font-size: 12px;
}

.sub-card {
  padding: 20px;
  border-radius: 6px;
  background: rgba(247, 251, 252, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.46);
}

.tabs-block :deep(.el-tabs__header) {
  display: none;
}

.sub-card h3 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 800;
}

.sub-head,
.dynamic-head,
.lookup-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.labeled-grid {
  align-items: start;
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

.dynamic-card {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
}

.drug-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.table-block,
.list-footer,
.mini-detail {
  margin-top: 16px;
}

.list-footer {
  color: var(--text-secondary);
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 1100px) {
  .section-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .sub-head,
  .dynamic-head,
  .lookup-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
