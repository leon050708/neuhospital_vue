<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import {
  cancelRegistration,
  checkInRegistration,
  getMyRegistrations,
  getRegistrationDetail
} from '@/api/registrations'
import { createPaymentOrder, getPendingPayments, payPaymentOrder } from '@/api/payment'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const patientId = computed(() => authStore.profile?.bizId)

const activeTab = ref('registrations')
const registrationLoading = ref(false)
const paymentLoading = ref(false)
const actionLoading = ref(false)
const detailLoading = ref(false)

const registrations = ref([])
const registrationTotal = ref(0)
const pendingItems = ref([])
const selectedRegistration = ref(null)

const registrationQuery = reactive({
  pageNo: 1,
  pageSize: 10
})

function getPatientDisplayName(row) {
  return row?.patientName || row?.realName || authStore.profile?.realName || authStore.profile?.username || '--'
}

function getDoctorDisplayName(row) {
  return row?.doctorName || row?.doctorRealName || '--'
}

function getRegistrationDisplayTime(row) {
  return row?.registeredAt || row?.visitTime || row?.visitDate || row?.createdAt || '--'
}

const registrationMap = computed(() => {
  return new Map(registrations.value.map((item) => [String(item.id), item]))
})

function getPaymentRegistration(row) {
  return registrationMap.value.get(String(row?.bizId)) || null
}

function getPaymentRegistrationNo(row) {
  const registration = getPaymentRegistration(row)
  return row?.registrationNo || registration?.registrationNo || '--'
}

function getPaymentPatientName(row) {
  const registration = getPaymentRegistration(row)
  return getPatientDisplayName(registration || row)
}

function getPaymentDoctorName(row) {
  const registration = getPaymentRegistration(row)
  return getDoctorDisplayName(registration || row)
}

function getPaymentDisplayTime(row) {
  const registration = getPaymentRegistration(row)
  return getRegistrationDisplayTime(registration || row)
}

function isToday(value) {
  if (!value) {
    return false
  }

  const today = new Date().toISOString().slice(0, 10)
  return String(value).slice(0, 10) === today
}

function canCancelRegistration(row) {
  return ['UNPAID', 'PAID', 'PENDING'].includes(row?.status)
}

function canCheckInRegistration(row) {
  return row?.status === 'PAID' && isToday(row?.visitDate)
}

async function loadRegistrations() {
  if (isPreview.value || !patientId.value) {
    return
  }

  registrationLoading.value = true

  try {
    const response = await getMyRegistrations(
      {
        pageNo: registrationQuery.pageNo,
        pageSize: registrationQuery.pageSize
      }
    )
    const pageData = unwrapResult(response, '加载我的挂号失败') || {}
    registrations.value = (pageData.records || []).filter((item) => item.status !== 'CANCELLED')
    registrationTotal.value = registrations.value.length
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载我的挂号失败')
  } finally {
    registrationLoading.value = false
  }
}

async function loadPendingPayments() {
  if (isPreview.value || !patientId.value) {
    return
  }

  paymentLoading.value = true

  try {
    const response = await getPendingPayments()
    pendingItems.value = unwrapResult(response, '加载待支付项目失败') || []
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载待支付项目失败')
  } finally {
    paymentLoading.value = false
  }
}

async function viewRegistrationDetail(id) {
  detailLoading.value = true

  try {
    const response = await getRegistrationDetail(id)
    selectedRegistration.value = unwrapResult(response, '加载挂号详情失败') || null
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载挂号详情失败')
  } finally {
    detailLoading.value = false
  }
}

async function handleCancel(id) {
  actionLoading.value = true

  try {
    const response = await cancelRegistration(id)
    if (response.code && response.code !== 200) {
      throw new Error(response.message || '退号失败')
    }
    ElMessage.success(response.message || '退号成功')
    await Promise.all([loadRegistrations(), loadPendingPayments()])
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '退号失败')
  } finally {
    actionLoading.value = false
  }
}

async function handleCheckIn(id) {
  actionLoading.value = true

  try {
    const response = await checkInRegistration(id)
    if (response.code && response.code !== 200) {
      throw new Error(response.message || '签到失败')
    }
    ElMessage.success(response.message || '签到成功')
    await loadRegistrations()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '签到失败')
  } finally {
    actionLoading.value = false
  }
}

async function handlePay(row) {
  actionLoading.value = true

  try {
    const createResponse = await createPaymentOrder({
      items: [
        {
          itemType: row.itemType,
          bizId: row.bizId
        }
      ]
    })
    const orderId = unwrapResult(createResponse, '创建支付订单失败')

    const payResponse = await payPaymentOrder(orderId)
    if (payResponse.code && payResponse.code !== 200) {
      throw new Error(payResponse.message || '模拟支付失败')
    }

    ElMessage.success(payResponse.message || '模拟支付成功')
    await Promise.all([loadPendingPayments(), loadRegistrations()])
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '模拟支付失败')
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadRegistrations(), loadPendingPayments()])
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Registration & Payment</div>
      <h2 class="section-title">我的挂号与支付中心</h2>
      <p class="section-desc">这里直接对应后端已实现的“我的挂号、挂号详情、退号、签到、待支付、创建支付单、模拟支付”流程。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实挂号与支付接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!patientId"
        title="当前登录信息里没有 patient bizId，暂时无法查询挂号和支付"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-tabs v-else v-model="activeTab" class="tabs-block">
        <el-tab-pane label="我的挂号" name="registrations">
          <el-table
            :data="registrations"
            v-loading="registrationLoading"
            class="table-block"
            empty-text="当前没有挂号记录"
          >
            <el-table-column prop="registrationNo" label="挂号单号" min-width="180" />
            <el-table-column label="患者名字" min-width="140">
              <template #default="{ row }">
                {{ getPatientDisplayName(row) }}
              </template>
            </el-table-column>
            <el-table-column label="医生名字" min-width="140">
              <template #default="{ row }">
                {{ getDoctorDisplayName(row) }}
              </template>
            </el-table-column>
            <el-table-column label="时间" min-width="180">
              <template #default="{ row }">
                {{ getRegistrationDisplayTime(row) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" min-width="120" />
            <el-table-column label="操作" min-width="220" fixed="right">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button link type="primary" @click="viewRegistrationDetail(row.id)">详情</el-button>
                  <el-button
                    v-if="canCancelRegistration(row)"
                    link
                    :loading="actionLoading"
                    @click="handleCancel(row.id)"
                  >
                    退号
                  </el-button>
                  <el-button
                    v-if="canCheckInRegistration(row)"
                    link
                    :loading="actionLoading"
                    @click="handleCheckIn(row.id)"
                  >
                    签到
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="list-footer">当前共 {{ registrationTotal }} 条挂号记录</div>

          <el-skeleton v-if="detailLoading" :rows="5" animated class="detail-block" />

          <el-descriptions
            v-else-if="selectedRegistration"
            :column="2"
            border
            class="detail-block"
          >
            <el-descriptions-item label="挂号单号">{{ selectedRegistration.registrationNo || '--' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selectedRegistration.status || '--' }}</el-descriptions-item>
            <el-descriptions-item label="患者姓名">{{ getPatientDisplayName(selectedRegistration) }}</el-descriptions-item>
            <el-descriptions-item label="医生姓名">{{ getDoctorDisplayName(selectedRegistration) }}</el-descriptions-item>
            <el-descriptions-item label="科室 ID">{{ selectedRegistration.departmentId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="排班 ID">{{ selectedRegistration.scheduleId || '--' }}</el-descriptions-item>
            <el-descriptions-item label="挂号时间">{{ selectedRegistration.registeredAt || '--' }}</el-descriptions-item>
            <el-descriptions-item label="费用">{{ selectedRegistration.feeAmount || '--' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="待支付项目" name="payments">
          <el-table
            :data="pendingItems"
            v-loading="paymentLoading"
            class="table-block"
            empty-text="当前没有待支付项目"
          >
            <el-table-column label="挂号单号" min-width="180">
              <template #default="{ row }">
                {{ getPaymentRegistrationNo(row) }}
              </template>
            </el-table-column>
            <el-table-column label="患者名字" min-width="140">
              <template #default="{ row }">
                {{ getPaymentPatientName(row) }}
              </template>
            </el-table-column>
            <el-table-column label="医生名字" min-width="140">
              <template #default="{ row }">
                {{ getPaymentDoctorName(row) }}
              </template>
            </el-table-column>
            <el-table-column label="时间" min-width="180">
              <template #default="{ row }">
                {{ getPaymentDisplayTime(row) }}
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" min-width="120" />
            <el-table-column label="操作" min-width="180" fixed="right">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button
                    link
                    type="primary"
                    :loading="actionLoading"
                    @click="handlePay(row)"
                  >
                    一键模拟支付
                  </el-button>
                </div>
              </template>
            </el-table-column>
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
.tabs-block,
.detail-block,
.list-footer {
  margin-top: 20px;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.list-footer {
  color: var(--text-secondary);
}
</style>
