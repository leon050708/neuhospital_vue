<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { adjustDrugStock, createDrug, getDrugPage, updateDrug } from '@/api/drugs'
import { dispensePrescription, getDispenseRecords, getPendingPrescriptions } from '@/api/pharmacy'
import { createPaymentOrder, payPaymentOrder } from '@/api/payment'
import { getPrescriptionsPage } from '@/api/prescriptions'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const currentSection = computed(() => route.meta?.section || 'drugs')
const pharmacistOperatorId = computed(() => authStore.profile?.bizId || authStore.profile?.userId || '')

const drugLoading = ref(false)
const pendingLoading = ref(false)
const recordLoading = ref(false)
const savingDrug = ref(false)
const stockSubmitting = ref(false)
const dispensing = ref(false)
const autoPaying = ref(false)
const dispenseQueryUnavailable = ref(false)
const dispenseQueryUnavailableReason = ref('')

const drugs = ref([])
const pendingPrescriptions = ref([])
const dispenseRecords = ref([])
const drugTotal = ref(0)
const pendingTotal = ref(0)
const recordTotal = ref(0)
const editingDrugId = ref(null)

const drugQuery = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  category: ''
})

const drugForm = reactive({
  drugCode: '',
  drugName: '',
  genericName: '',
  specification: '',
  unit: '',
  category: '',
  manufacturer: '',
  salePrice: null,
  warningQuantity: 10,
  contraindication: '',
  status: 'ENABLED'
})

const stockForm = reactive({
  drugId: '',
  adjustQuantity: null
})

const dispenseForm = reactive({
  prescriptionId: '',
  pharmacyUserId: ''
})

function getErrorMessage(error, fallback) {
  const backendMessage = error?.response?.data?.message || error?.message

  if (error?.response?.status === 403) {
    return backendMessage || '当前账号没有新增药品权限，请确认登录角色为 PHARMACY 或 ADMIN'
  }

  return backendMessage || fallback
}

function isMissingEndpointError(error) {
  const status = error?.response?.status
  const backendMessage = error?.response?.data?.message || error?.message || ''

  return status === 404 || backendMessage.includes('No static resource')
}

function markDispenseQueryUnavailable(error) {
  if (dispenseQueryUnavailable.value) {
    return
  }

  dispenseQueryUnavailable.value = true
  dispenseQueryUnavailableReason.value = error?.response?.data?.message
    || '当前后端还没有提供发药工作台所需的查询接口，页面先以未接入状态展示。'
}

function normalizePendingPrescription(row) {
  return {
    ...row,
    requestedAt: row?.issuedAt || row?.requestedAt || row?.createTime || row?.createdAt || row?.gmtCreate || ''
  }
}

function normalizeDispenseRecord(row) {
  return {
    ...row,
    actionType: row?.dispenseType || row?.actionType || '',
    createdAt: row?.operateTime || row?.createdAt || row?.gmtCreate || ''
  }
}

function isNewPrescriptionStatus(status) {
  return String(status || '').trim().toUpperCase() === 'NEW'
}

function resetDrugForm() {
  editingDrugId.value = null
  drugForm.drugCode = ''
  drugForm.drugName = ''
  drugForm.genericName = ''
  drugForm.specification = ''
  drugForm.unit = ''
  drugForm.category = ''
  drugForm.manufacturer = ''
  drugForm.salePrice = null
  drugForm.warningQuantity = 10
  drugForm.contraindication = ''
  drugForm.status = 'ENABLED'
}

function fillDrugForm(row) {
  editingDrugId.value = row.id
  drugForm.drugCode = row.drugCode || ''
  drugForm.drugName = row.drugName || ''
  drugForm.genericName = row.genericName || ''
  drugForm.specification = row.specification || ''
  drugForm.unit = row.unit || ''
  drugForm.category = row.category || ''
  drugForm.manufacturer = row.manufacturer || ''
  drugForm.salePrice = row.salePrice ?? null
  drugForm.warningQuantity = row.warningQuantity ?? 10
  drugForm.contraindication = row.contraindication || ''
  drugForm.status = row.status || 'ENABLED'
}

function toOptionalString(value) {
  return value ? String(value).trim() : ''
}

function buildDrugPayload() {
  return {
    drugCode: toOptionalString(drugForm.drugCode) || undefined,
    drugName: toOptionalString(drugForm.drugName),
    genericName: toOptionalString(drugForm.genericName) || undefined,
    specification: toOptionalString(drugForm.specification) || undefined,
    unit: toOptionalString(drugForm.unit) || undefined,
    category: toOptionalString(drugForm.category) || undefined,
    manufacturer: toOptionalString(drugForm.manufacturer) || undefined,
    salePrice: drugForm.salePrice ?? undefined,
    warningQuantity: drugForm.warningQuantity ?? undefined,
    contraindication: toOptionalString(drugForm.contraindication) || undefined,
    status: drugForm.status || 'ENABLED'
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
    const pageData = unwrapResult(response, '加载药品失败') || {}
    drugs.value = pageData.records || []
    drugTotal.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载药品失败'))
  } finally {
    drugLoading.value = false
  }
}

async function loadPendingPrescriptions() {
  if (isPreview.value) {
    return
  }

  pendingLoading.value = true

  try {
    const response = await getPendingPrescriptions({ pageNo: 1, pageSize: 20 })
    const pageData = unwrapResult(response, '加载待发药处方失败')
    dispenseQueryUnavailable.value = false
    dispenseQueryUnavailableReason.value = ''
    if (Array.isArray(pageData)) {
      pendingPrescriptions.value = pageData.map(normalizePendingPrescription)
      pendingTotal.value = pendingPrescriptions.value.length
    } else {
      pendingPrescriptions.value = (pageData?.records || []).map(normalizePendingPrescription)
      pendingTotal.value = pageData?.total || pendingPrescriptions.value.length
    }
  } catch (error) {
    if (isMissingEndpointError(error)) {
      pendingPrescriptions.value = []
      pendingTotal.value = 0
      markDispenseQueryUnavailable(error)
      return
    }

    ElMessage.error(getErrorMessage(error, '加载待发药处方失败'))
  } finally {
    pendingLoading.value = false
  }
}

async function loadAllPrescriptions() {
  const pageSize = 100
  let pageNo = 1
  let total = 0
  const records = []

  do {
    const response = await getPrescriptionsPage({ pageNo, pageSize })
    const pageData = unwrapResult(response, '加载处方失败') || {}
    const pageRecords = Array.isArray(pageData) ? pageData : (pageData.records || [])
    total = Array.isArray(pageData) ? pageRecords.length : (pageData.total || 0)
    records.push(...pageRecords)
    if (pageRecords.length < pageSize) {
      break
    }
    pageNo += 1
  } while (records.length < total || total === 0)

  return records
}

async function autoPayNewPrescriptions() {
  if (isPreview.value || autoPaying.value) {
    return
  }

  autoPaying.value = true

  try {
    const prescriptions = await loadAllPrescriptions()
    const targets = prescriptions.filter((row) => isNewPrescriptionStatus(row?.status) && row?.id && row?.patientId)

    if (!targets.length) {
      return
    }

    let successCount = 0
    let failureCount = 0

    for (const row of targets) {
      try {
        const createResponse = await createPaymentOrder({
          patientId: Number(row.patientId),
          items: [
            {
              itemType: 'PRESCRIPTION',
              bizId: Number(row.id)
            }
          ]
        })
        const orderId = unwrapResult(createResponse, '创建支付订单失败')
        const payResponse = await payPaymentOrder(orderId)

        if (payResponse?.code && payResponse.code !== 200) {
          throw new Error(payResponse.message || '模拟支付失败')
        }

        successCount += 1
      } catch (error) {
        failureCount += 1
      }
    }

    if (successCount > 0 && failureCount === 0) {
      ElMessage.success(`已自动补缴 ${successCount} 张处方，当前均可发药`)
      return
    }

    if (successCount > 0) {
      ElMessage.warning(`已自动补缴 ${successCount} 张处方，另有 ${failureCount} 张补缴失败`)
      return
    }

    if (failureCount > 0) {
      ElMessage.error(`自动补缴失败，共 ${failureCount} 张处方未转为可发药状态`)
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '自动补缴处方失败'))
  } finally {
    autoPaying.value = false
  }
}

async function refreshDispenseWorkspace() {
  await autoPayNewPrescriptions()
  await Promise.allSettled([loadPendingPrescriptions(), loadDispenseRecords()])
}

async function loadDispenseRecords() {
  if (isPreview.value) {
    return
  }

  recordLoading.value = true

  try {
    const response = await getDispenseRecords({ pageNo: 1, pageSize: 20 })
    const pageData = unwrapResult(response, '加载发药记录失败')
    dispenseQueryUnavailable.value = false
    dispenseQueryUnavailableReason.value = ''
    if (Array.isArray(pageData)) {
      dispenseRecords.value = pageData.map(normalizeDispenseRecord)
      recordTotal.value = dispenseRecords.value.length
    } else {
      dispenseRecords.value = (pageData?.records || []).map(normalizeDispenseRecord)
      recordTotal.value = pageData?.total || dispenseRecords.value.length
    }
  } catch (error) {
    if (isMissingEndpointError(error)) {
      dispenseRecords.value = []
      recordTotal.value = 0
      markDispenseQueryUnavailable(error)
      return
    }

    ElMessage.error(getErrorMessage(error, '加载发药记录失败'))
  } finally {
    recordLoading.value = false
  }
}

async function submitDrugForm() {
  if (!drugForm.drugName.trim()) {
    ElMessage.warning('请输入药品名称')
    return
  }

  savingDrug.value = true

  try {
    const payload = buildDrugPayload()
    const response = editingDrugId.value
      ? await updateDrug(editingDrugId.value, payload)
      : await createDrug(payload)

    unwrapResult(response, editingDrugId.value ? '更新药品失败' : '新增药品失败')
    ElMessage.success(editingDrugId.value ? '药品信息已更新' : '药品已新增')
    resetDrugForm()
    await loadDrugs()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, editingDrugId.value ? '更新药品失败' : '新增药品失败'))
  } finally {
    savingDrug.value = false
  }
}

async function submitStockAdjust() {
  if (!stockForm.drugId || stockForm.adjustQuantity === null || stockForm.adjustQuantity === undefined) {
    ElMessage.warning('请选择药品并填写库存变动数量')
    return
  }

  stockSubmitting.value = true

  try {
    const response = await adjustDrugStock(Number(stockForm.drugId), {
      adjustQuantity: Number(stockForm.adjustQuantity)
    })
    unwrapResult(response, '库存调整失败')
    ElMessage.success('库存调整成功')
    stockForm.drugId = ''
    stockForm.adjustQuantity = null
    await loadDrugs()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '库存调整失败'))
  } finally {
    stockSubmitting.value = false
  }
}

async function submitDispense(prescriptionId) {
  const targetPrescriptionId = Number(prescriptionId || dispenseForm.prescriptionId)
  const pharmacyUserId = Number(dispenseForm.pharmacyUserId || pharmacistOperatorId.value)

  if (!targetPrescriptionId || !pharmacyUserId) {
    ElMessage.warning('缺少处方 ID 或药房人员 ID，暂时无法发药')
    return
  }

  dispensing.value = true

  try {
    const response = await dispensePrescription({
      prescriptionId: targetPrescriptionId,
      pharmacyUserId
    })
    const recordId = unwrapResult(response, '发药失败')
    ElMessage.success(`发药成功，记录 ID：${recordId}`)
    dispenseForm.prescriptionId = ''
    await Promise.all([loadPendingPrescriptions(), loadDispenseRecords(), loadDrugs()])
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '发药失败'))
  } finally {
    dispensing.value = false
  }
}

async function loadCurrentSectionData(section) {
  if (isPreview.value) {
    return
  }

  if (section === 'dispense') {
    await refreshDispenseWorkspace()
    return
  }

  await loadDrugs()
}

onMounted(async () => {
  if (!isPreview.value) {
    dispenseForm.pharmacyUserId = pharmacistOperatorId.value ? String(pharmacistOperatorId.value) : ''
  }

  await loadCurrentSectionData(currentSection.value)
})

watch(currentSection, async (section, previousSection) => {
  if (section === previousSection) {
    return
  }

  await loadCurrentSectionData(section)
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Pharmacy Workspace</div>
      <h2 class="section-title">药房工作台</h2>
      <p class="section-desc">药品新增、信息维护、库存调整和发药操作统一放到药房工作区，管理员不再直接管理药品。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实药房接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!pharmacistOperatorId"
        title="当前登录信息里没有可用的药房人员 ID（bizId 或 userId），发药时请手动填写 pharmacyUserId"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-if="!isPreview && currentSection === 'dispense' && dispenseQueryUnavailable"
        :title="dispenseQueryUnavailableReason"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <div v-if="!isPreview && currentSection === 'drugs'" class="section-grid">
        <article class="sub-card">
          <div class="sub-head">
            <h3>{{ editingDrugId ? '编辑药品' : '新增药品' }}</h3>
            <el-button text @click="resetDrugForm">清空</el-button>
          </div>

          <div class="form-grid">
            <el-input v-model="drugForm.drugCode" placeholder="药品编码，可留空自动生成" />
            <el-input v-model="drugForm.drugName" placeholder="药品名称" />
            <el-input v-model="drugForm.genericName" placeholder="通用名" />
            <el-input v-model="drugForm.specification" placeholder="规格" />
            <el-input v-model="drugForm.unit" placeholder="单位" />
            <el-input v-model="drugForm.category" placeholder="分类" />
            <el-input v-model="drugForm.manufacturer" placeholder="生产厂家" />
            <div class="number-field">
              <span class="field-label">售价（元）</span>
              <el-input-number v-model="drugForm.salePrice" :min="0" :precision="2" :step="0.5" />
            </div>
            <div class="number-field">
              <span class="field-label">库存预警值</span>
              <el-input-number v-model="drugForm.warningQuantity" :min="0" />
            </div>
            <el-select v-model="drugForm.status" placeholder="状态">
              <el-option label="启用" value="ENABLED" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </div>

          <el-input
            v-model="drugForm.contraindication"
            type="textarea"
            :rows="3"
            placeholder="禁忌说明"
            class="textarea-block"
          />

          <el-button type="primary" round :loading="savingDrug" @click="submitDrugForm">
            {{ editingDrugId ? '保存修改' : '新增药品' }}
          </el-button>
        </article>

        <article class="sub-card">
          <h3>库存调整</h3>
          <p class="form-tip">正数表示入库，负数表示扣减库存。</p>
          <div class="form-grid">
            <el-select v-model="stockForm.drugId" placeholder="选择药品" filterable>
              <el-option
                v-for="item in drugs"
                :key="item.id"
                :label="`${item.drugName} / 当前库存 ${item.stockQuantity}`"
                :value="String(item.id)"
              />
            </el-select>
            <div class="number-field">
              <span class="field-label">库存变动数量</span>
              <el-input-number v-model="stockForm.adjustQuantity" :step="1" />
            </div>
          </div>
          <el-button type="warning" round :loading="stockSubmitting" @click="submitStockAdjust">提交库存调整</el-button>
        </article>

        <article class="sub-card wide-card">
          <div class="toolbar">
            <h3 class="sub-title">药品列表</h3>
            <div class="toolbar-inputs">
              <el-input v-model="drugQuery.keyword" placeholder="药品名" clearable @keyup.enter="loadDrugs" />
              <el-input v-model="drugQuery.category" placeholder="分类" clearable @keyup.enter="loadDrugs" />
              <el-button round @click="loadDrugs">查询</el-button>
            </div>
          </div>

          <el-table :data="drugs" v-loading="drugLoading" class="table-block" empty-text="暂无药品数据">
            <el-table-column prop="drugCode" label="编码" min-width="130" />
            <el-table-column prop="drugName" label="药品名称" min-width="180" />
            <el-table-column prop="category" label="分类" min-width="120" />
            <el-table-column prop="salePrice" label="售价" min-width="100" />
            <el-table-column prop="stockQuantity" label="库存" min-width="100" />
            <el-table-column prop="warningQuantity" label="预警值" min-width="100" />
            <el-table-column prop="status" label="状态" min-width="100" />
            <el-table-column label="操作" min-width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="fillDrugForm(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="list-footer">当前共 {{ drugTotal }} 条药品记录</div>
        </article>
      </div>

      <div v-else-if="!isPreview" class="section-grid">
        <article class="sub-card">
          <h3>手动发药</h3>
          <div class="form-grid">
            <el-input v-model="dispenseForm.prescriptionId" placeholder="处方 ID" />
            <el-input v-model="dispenseForm.pharmacyUserId" placeholder="pharmacyUserId" />
          </div>
          <el-button type="primary" round :loading="dispensing" @click="submitDispense()">执行发药</el-button>
        </article>

        <article class="sub-card">
          <div class="sub-head">
            <h3>待发药处方</h3>
            <el-button text :loading="autoPaying || pendingLoading || recordLoading" @click="refreshDispenseWorkspace">刷新</el-button>
          </div>
          <p v-if="dispenseQueryUnavailable" class="form-tip">当前列表接口未接入，暂不展示待发药处方数据。</p>
          <el-table :data="pendingPrescriptions" v-loading="pendingLoading" class="table-block" empty-text="暂无待发药处方">
            <el-table-column prop="id" label="ID" min-width="90" />
            <el-table-column prop="prescriptionNo" label="处方号" min-width="160" />
            <el-table-column prop="patientId" label="患者 ID" min-width="100" />
            <el-table-column prop="prescriptionType" label="处方类型" min-width="120" />
            <el-table-column prop="status" label="状态" min-width="120" />
            <el-table-column prop="requestedAt" label="开立时间" min-width="180" />
            <el-table-column label="操作" min-width="120">
              <template #default="{ row }">
                <el-button link type="primary" :loading="dispensing" @click="submitDispense(row.id)">发药</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="list-footer">当前共 {{ pendingTotal }} 条待发药处方</div>
        </article>

        <article class="sub-card wide-card">
          <h3>发药记录</h3>
          <p v-if="dispenseQueryUnavailable" class="form-tip">当前记录接口未接入，暂不展示发药记录数据。</p>
          <el-table :data="dispenseRecords" v-loading="recordLoading" class="table-block" empty-text="暂无发药记录">
            <el-table-column prop="id" label="记录 ID" min-width="100" />
            <el-table-column prop="prescriptionId" label="处方 ID" min-width="100" />
            <el-table-column prop="prescriptionNo" label="处方号" min-width="160" />
            <el-table-column prop="prescriptionType" label="处方类型" min-width="120" />
            <el-table-column prop="operatorId" label="操作人" min-width="100" />
            <el-table-column prop="actionType" label="动作" min-width="100" />
            <el-table-column prop="status" label="状态" min-width="100" />
            <el-table-column prop="createdAt" label="操作时间" min-width="180" />
          </el-table>
          <div class="list-footer">当前共 {{ recordTotal }} 条发药记录</div>
        </article>
      </div>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.notice,
.section-grid {
  margin-top: 20px;
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.wide-card {
  grid-column: 1 / -1;
}

.sub-card {
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.sub-head,
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.sub-head h3,
.sub-title {
  margin: 0;
}

.toolbar-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.number-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.form-tip,
.list-footer {
  color: var(--text-secondary);
}

.textarea-block,
.table-block,
.list-footer {
  margin-top: 16px;
}

@media (max-width: 960px) {
  .section-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
