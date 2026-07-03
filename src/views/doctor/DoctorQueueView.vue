<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import { callQueuePatient, getDoctorQueue, skipQueuePatient } from '@/api/queue'
import { getRegistrationDetail } from '@/api/registrations'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const doctorId = computed(() => authStore.profile?.bizId)

const loading = ref(false)
const actionLoading = ref(false)
const queueList = ref([])
const ACTIVE_QUEUE_STATUSES = ['WAITING', 'CALLED', 'SKIPPED']

function getPatientDisplayName(row) {
  return row?.patientName || row?.realName || row?.patientRealName || `患者#${row?.patientId || '--'}`
}

function getDoctorDisplayName(row) {
  return row?.doctorName || row?.doctorRealName || `医生#${row?.doctorId || '--'}`
}

function getDepartmentDisplayName(row) {
  return row?.departmentName || `科室#${row?.departmentId || '--'}`
}

function getRegistrationDisplay(row) {
  return row?.registrationNo || `挂号#${row?.registrationId || '--'}`
}

function getVisitTimeDisplay(row) {
  const date = row?.visitDate || row?.registeredAt || ''
  const slot = row?.timeSlot || ''

  if (date && slot) {
    return `${date} ${slot}`
  }

  return row?.visitTime || date || '--'
}

async function enrichQueueRows(queueData) {
  const rows = queueData.filter((item) => ACTIVE_QUEUE_STATUSES.includes(item?.queueStatus))
  const enrichedRows = await Promise.all(
    rows.map(async (item) => {
      if (!item?.registrationId) {
        return item
      }

      try {
        const response = await getRegistrationDetail(item.registrationId)
        const registration = unwrapResult(response, '加载挂号详情失败') || {}
        return {
          ...registration,
          ...item,
          patientName: item.patientName || registration.patientName || registration.realName || registration.patientRealName,
          doctorName: item.doctorName || registration.doctorName || registration.doctorRealName,
          departmentName: item.departmentName || registration.departmentName,
          registrationNo: item.registrationNo || registration.registrationNo,
          visitDate: item.visitDate || registration.visitDate,
          timeSlot: item.timeSlot || registration.timeSlot,
          registeredAt: item.registeredAt || registration.registeredAt
        }
      } catch {
        return item
      }
    })
  )

  return enrichedRows
}

async function loadQueue() {
  if (isPreview.value || !doctorId.value) {
    return
  }

  loading.value = true

  try {
    const response = await getDoctorQueue(doctorId.value)
    const queueData = unwrapResult(response, '加载候诊队列失败') || []
    queueList.value = await enrichQueueRows(queueData)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载候诊队列失败')
  } finally {
    loading.value = false
  }
}

async function runQueueAction(action, id, successText) {
  actionLoading.value = true

  try {
    const response = await action(id, doctorId.value)
    if (response.code && response.code !== 200) {
      throw new Error(response.message || '操作失败')
    }
    ElMessage.success(successText)
    await loadQueue()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

function canEnterConsultation(row) {
  return ACTIVE_QUEUE_STATUSES.includes(row?.queueStatus)
}

function enterConsultation(row) {
  if (!canEnterConsultation(row)) {
    ElMessage.warning('当前状态暂时不能进入接诊')
    return
  }

  const path = route.meta?.preview ? '/preview/doctor/records' : '/workspace/doctor/records'

  router.push({
    path,
    query: {
      source: 'queue',
      queueId: row.id || '',
      queueNo: row.queueNo || '',
      registrationId: row.registrationId || '',
      registrationNo: row.registrationNo || '',
      patientId: row.patientId || '',
      departmentId: row.departmentId || ''
    }
  })
}

async function handleCallAndEnter(row) {
  if (row.queueStatus !== 'CALLED') {
    await runQueueAction(callQueuePatient, row.id, '叫号成功')
  }

  enterConsultation(row)
}

onMounted(loadQueue)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Doctor Queue</div>
      <h2 class="section-title">候诊队列</h2>
      <p class="section-desc">先在这里叫号，再进入病历诊断页接诊，最后由病历页完成就诊。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实候诊接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!doctorId"
        title="当前登录信息里没有 doctor bizId，暂时无法查询候诊队列"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <div class="toolbar">
          <el-button round @click="loadQueue">刷新队列</el-button>
        </div>

        <el-table
          :data="queueList"
          v-loading="loading"
          class="table-block"
          empty-text="当前没有候诊患者"
        >
          <el-table-column label="患者" min-width="180">
            <template #default="{ row }">
              <div class="cell-stack">
                <span>{{ getPatientDisplayName(row) }}</span>
                <span class="sub-text">{{ getRegistrationDisplay(row) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="接诊医生" min-width="150">
            <template #default="{ row }">
              {{ getDoctorDisplayName(row) }}
            </template>
          </el-table-column>
          <el-table-column label="科室" min-width="170">
            <template #default="{ row }">
              <div class="cell-stack">
                <span>{{ getDepartmentDisplayName(row) }}</span>
                <span class="sub-text">排队号：{{ row.queueNo || '--' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="queueStatus" label="队列状态" min-width="120" />
          <el-table-column label="就诊时间" min-width="180">
            <template #default="{ row }">
              {{ getVisitTimeDisplay(row) }}
            </template>
          </el-table-column>
          <el-table-column prop="calledAt" label="叫号时间" min-width="180" />
          <el-table-column label="操作" min-width="240" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button link type="primary" :loading="actionLoading" @click="handleCallAndEnter(row)">
                  {{ row.queueStatus === 'CALLED' ? '进入接诊' : '叫号接诊' }}
                </el-button>
                <el-button link :loading="actionLoading" @click="runQueueAction(skipQueuePatient, row.id, '过号成功')">
                  过号
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
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
.toolbar,
.table-block {
  margin-top: 20px;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-text {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
