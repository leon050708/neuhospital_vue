<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getDepartments } from '@/api/departments'
import { getDoctors } from '@/api/doctors'
import { getMyRegistrations, quickRegistration } from '@/api/registrations'
import { getSchedulePage } from '@/api/schedules'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const patientId = computed(() => authStore.profile?.bizId)

const loadingDepartments = ref(false)
const loadingDoctors = ref(false)
const loadingSchedules = ref(false)
const loadingRegistrations = ref(false)
const submittingId = ref('')

const departments = ref([])
const doctors = ref([])
const schedules = ref([])
const myRegistrations = ref([])
const optimisticRegisteredMap = ref({})
const optimisticAvailableCaps = ref({})

const query = reactive({
  departmentId: '',
  scheduleDate: ''
})

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildNextSevenDates() {
  const result = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let index = 0; index < 7; index += 1) {
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + index)
    result.push(formatDateKey(nextDate))
  }

  return result
}

const doctorMap = computed(() => {
  return new Map(doctors.value.map((item) => [String(item.id), item]))
})

const dateOptions = computed(() => {
  return buildNextSevenDates()
})

const registeredScheduleIds = computed(() => {
  const ids = new Set(
    myRegistrations.value
      .filter((item) => item && item.status !== 'CANCELLED' && item.scheduleId)
      .map((item) => String(item.scheduleId))
  )

  Object.keys(optimisticRegisteredMap.value).forEach((scheduleId) => {
    ids.add(scheduleId)
  })

  return ids
})

const filteredSchedules = computed(() => {
  const targetDate = query.scheduleDate
  const visibleSchedules = schedules.value.filter((item) => item.status === 'ENABLED')
  if (!targetDate) {
    return visibleSchedules
  }

  return visibleSchedules.filter((item) => item.scheduleDate === targetDate)
})

function pickCount(...values) {
  const target = values.find((value) => value !== null && value !== undefined && value !== '')
  if (target === undefined) {
    return null
  }

  const count = Number(target)
  return Number.isNaN(count) ? null : count
}

function normalizeSchedule(item) {
  const availableCount = pickCount(
    item.availableCount,
    item.available_count,
    item.remainCount,
    item.remainNum,
    item.leftCount,
    item.leftNum
  )
  const sourceCount = pickCount(
    item.sourceCount,
    item.source_count,
    item.totalCount,
    item.totalNum
  )

  if (import.meta.env.DEV && availableCount === null) {
    console.warn('[PatientRegistrationView] schedule missing available count field:', item)
  }

  return {
    ...item,
    availableCount,
    sourceCount
  }
}

function getDoctorExtra(row) {
  const doctor = doctorMap.value.get(String(row.doctorId))
  return {
    title: doctor?.title || '',
    specialty: doctor?.specialty || '',
    introduction: doctor?.introduction || ''
  }
}

function formatWeekLabel(dateText) {
  if (!dateText) return ''

  const date = new Date(`${dateText}T00:00:00`)
  const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekMap[date.getDay()]
}

function formatDateLabel(dateText) {
  if (!dateText) return ''
  return String(dateText).slice(5)
}

function formatTimeSlot(slot) {
  if (slot === 'AM' || slot === 'MORNING') return '上午'
  if (slot === 'PM' || slot === 'AFTERNOON') return '下午'
  if (slot === 'NIGHT') return '夜间'
  return slot || '--'
}

function hasAvailableCount(row) {
  return row.availableCount !== null && row.availableCount !== undefined
}

function getScheduleKey(rowOrId) {
  return String(typeof rowOrId === 'object' ? rowOrId?.id : rowOrId)
}

function getDisplayedAvailableCount(row) {
  if (!hasAvailableCount(row)) {
    return row?.availableCount
  }

  const serverCount = Number(row.availableCount)
  const optimisticCap = optimisticAvailableCaps.value[getScheduleKey(row)]
  if (optimisticCap === undefined) {
    return serverCount
  }

  return Math.max(0, Math.min(serverCount, optimisticCap))
}

function isScheduleEnabled(row) {
  return row?.status === 'ENABLED'
}

function isRegisteredSchedule(row) {
  return registeredScheduleIds.value.has(String(row?.id))
}

function registrationButtonType(row) {
  return isRegisteredSchedule(row) ? 'info' : 'primary'
}

function registrationButtonText(row) {
  if (isRegisteredSchedule(row)) return '已挂号'
  if (isScheduleEnabled(row) && hasAvailableCount(row) && getDisplayedAvailableCount(row) > 0) return '快速挂号'
  return '当前不可挂'
}

function registrationButtonDisabled(row) {
  return !patientId.value
    || isRegisteredSchedule(row)
    || !isScheduleEnabled(row)
    || !hasAvailableCount(row)
    || getDisplayedAvailableCount(row) <= 0
}

function scheduleStatusText(row) {
  if (row.status === 'CLOSED') return '停诊'
  if (row.status === 'DISABLED') return '暂停预约'
  if (!hasAvailableCount(row)) return '待确认'
  if (getDisplayedAvailableCount(row) <= 0) return '满号'
  return '有号'
}

function scheduleStatusClass(row) {
  if (row.status === 'CLOSED' || row.status === 'DISABLED') return 'is-closed'
  if (!hasAvailableCount(row)) return 'is-closed'
  if (getDisplayedAvailableCount(row) <= 0) return 'is-full'
  return 'is-open'
}

function markOptimisticRegistration(row, { decreaseAvailable = true } = {}) {
  const scheduleId = getScheduleKey(row)
  optimisticRegisteredMap.value = {
    ...optimisticRegisteredMap.value,
    [scheduleId]: true
  }

  if (decreaseAvailable && hasAvailableCount(row)) {
    optimisticAvailableCaps.value = {
      ...optimisticAvailableCaps.value,
      [scheduleId]: Math.max(getDisplayedAvailableCount(row) - 1, 0)
    }
  }
}

function reconcileOptimisticRegistrations(records = []) {
  const activeScheduleIds = new Set(
    records
      .filter((item) => item && item.status !== 'CANCELLED' && item.scheduleId)
      .map((item) => String(item.scheduleId))
  )

  if (Object.keys(optimisticRegisteredMap.value).length) {
    optimisticRegisteredMap.value = Object.fromEntries(
      Object.entries(optimisticRegisteredMap.value).filter(([scheduleId]) => !activeScheduleIds.has(scheduleId))
    )
  }
}

function reconcileOptimisticAvailableCaps(rows = []) {
  if (!Object.keys(optimisticAvailableCaps.value).length) {
    return
  }

  const nextCaps = { ...optimisticAvailableCaps.value }

  rows.forEach((row) => {
    const scheduleId = getScheduleKey(row)
    const optimisticCap = nextCaps[scheduleId]
    if (optimisticCap === undefined || !hasAvailableCount(row)) {
      return
    }

    if (Number(row.availableCount) <= optimisticCap) {
      delete nextCaps[scheduleId]
    }
  })

  optimisticAvailableCaps.value = nextCaps
}

async function loadDepartments() {
  if (isPreview.value) {
    return
  }

  loadingDepartments.value = true

  try {
    const response = await getDepartments()
    const data = unwrapResult(response, '加载科室失败') || []
    departments.value = data

    if (!query.departmentId && data.length) {
      query.departmentId = String(data[0].id)
    }
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载科室失败')
  } finally {
    loadingDepartments.value = false
  }
}

async function loadDoctors() {
  if (isPreview.value || !query.departmentId) {
    doctors.value = []
    return
  }

  loadingDoctors.value = true

  try {
    const response = await getDoctors({ departmentId: Number(query.departmentId) })
    doctors.value = unwrapResult(response, '加载医生失败') || []
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载医生失败')
  } finally {
    loadingDoctors.value = false
  }
}

async function loadMyRegistrations() {
  if (isPreview.value || !patientId.value) {
    myRegistrations.value = []
    return
  }

  loadingRegistrations.value = true

  try {
    const response = await getMyRegistrations({
      pageNo: 1,
      pageSize: 1000
    })
    const pageData = unwrapResult(response, '加载我的挂号失败') || {}
    myRegistrations.value = pageData.records || []
    reconcileOptimisticRegistrations(myRegistrations.value)
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载我的挂号失败')
  } finally {
    loadingRegistrations.value = false
  }
}

async function loadSchedules() {
  if (isPreview.value || !query.departmentId) {
    schedules.value = []
    return
  }

  loadingSchedules.value = true

  try {
    const response = await getSchedulePage({
      pageNo: 1,
      pageSize: 100,
      departmentId: Number(query.departmentId),
      bookableOnly: true
    })

    const pageData = unwrapResult(response, '加载排班失败') || {}
    schedules.value = (pageData.records || []).map(normalizeSchedule)
    reconcileOptimisticAvailableCaps(schedules.value)

    if (!query.scheduleDate || !dateOptions.value.includes(query.scheduleDate)) {
      query.scheduleDate = dateOptions.value[0] || ''
    }
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载排班失败')
  } finally {
    loadingSchedules.value = false
  }
}

async function handleDepartmentSelect(departmentId) {
  query.departmentId = String(departmentId)
  query.scheduleDate = ''
  await Promise.all([loadDoctors(), loadSchedules(), loadMyRegistrations()])
}

async function handleQuickRegistration(row) {
  if (!patientId.value) {
    ElMessage.warning('当前登录信息里没有 patientId，无法发起抢号')
    return
  }

  if (!isScheduleEnabled(row)) {
    ElMessage.warning('当前排班暂不可预约')
    return
  }

  submittingId.value = String(row.id)

  try {
    const response = await quickRegistration({
      scheduleId: row.id
    })

    if (response.success) {
      markOptimisticRegistration(row, { decreaseAvailable: true })
      ElMessage.success(response.message || '抢号受理成功')
      await Promise.all([loadSchedules(), loadMyRegistrations()])
      return
    }

    ElMessage.warning(response.message || '当前排班暂不可预约')
  } catch (error) {
    const message = error.response?.data?.message || '发起挂号失败'
    if (message.includes('已挂号') || message.includes('处理中') || message.includes('重复提交')) {
      markOptimisticRegistration(row, { decreaseAvailable: false })
      await Promise.all([loadSchedules(), loadMyRegistrations()])
      ElMessage.warning(message)
    } else {
      ElMessage.error(message)
    }
  } finally {
    submittingId.value = ''
  }
}

onMounted(async () => {
  await loadDepartments()
  await Promise.all([loadDoctors(), loadSchedules(), loadMyRegistrations()])
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Registration</div>
      <h2 class="section-title">挂号排班</h2>
      <p class="section-desc">下面只展示从今天开始 1 周内仍可预约的医生排班。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实挂号接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!patientId"
        title="当前登录信息里没有 patient bizId，暂时无法发起挂号"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <div class="department-strip" v-loading="loadingDepartments">
          <button
            v-for="item in departments"
            :key="item.id"
            class="department-chip"
            :class="{ 'is-active': String(item.id) === query.departmentId }"
            @click="handleDepartmentSelect(item.id)"
          >
            {{ item.deptName }}
          </button>
        </div>

        <div class="date-strip" v-loading="loadingSchedules">
          <button
            v-for="item in dateOptions"
            :key="item"
            class="date-card"
            :class="{ 'is-active': item === query.scheduleDate }"
            @click="query.scheduleDate = item"
          >
            <strong>{{ formatWeekLabel(item) }}</strong>
            <span>{{ formatDateLabel(item) }}</span>
          </button>
        </div>

        <el-empty
          v-if="!loadingSchedules && !filteredSchedules.length"
          description="当前科室在未来 1 周内没有可挂号的排班"
          class="empty-block"
        />

        <div v-else class="doctor-list">
          <article
            v-for="row in filteredSchedules"
            :key="row.id"
            class="doctor-card"
          >
            <div class="doctor-avatar">
              <span>{{ row.doctorName?.slice(0, 1) || '医' }}</span>
            </div>

            <div class="doctor-main">
              <div class="doctor-head">
                <div>
                  <h3>{{ row.doctorName || '未命名医生' }}</h3>
                  <p class="doctor-subline">
                    {{ getDoctorExtra(row).title || row.departmentName || '当前排班医生' }}
                  </p>
                </div>

                <div class="status-group">
                  <span class="slot-pill">{{ formatTimeSlot(row.timeSlot) }}</span>
                  <span class="status-pill" :class="scheduleStatusClass(row)">
                    {{ scheduleStatusText(row) }}
                  </span>
                </div>
              </div>

              <div class="price-line">¥ {{ row.feeAmount ?? '--' }}</div>

              <p v-if="getDoctorExtra(row).specialty" class="doctor-desc">
                擅长：{{ getDoctorExtra(row).specialty }}
              </p>
              <p v-else-if="getDoctorExtra(row).introduction" class="doctor-desc">
                简介：{{ getDoctorExtra(row).introduction }}
              </p>
              <p v-else class="doctor-desc">
                科室：{{ row.departmentName || '--' }}
              </p>

              <p class="doctor-desc">
                余号：{{ getDisplayedAvailableCount(row) ?? '--' }}
              </p>

              <div class="card-actions">
                <span class="meta-text">排班 ID：{{ row.id }}</span>
                <el-button
                  :type="registrationButtonType(row)"
                  round
                  :disabled="loadingRegistrations || registrationButtonDisabled(row)"
                  :loading="submittingId === String(row.id)"
                  @click="handleQuickRegistration(row)"
                >
                  {{ registrationButtonText(row) }}
                </el-button>
              </div>
            </div>
          </article>
        </div>
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
.department-strip,
.date-strip,
.doctor-list,
.empty-block {
  margin-top: 20px;
}

.department-strip,
.date-strip {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.department-chip,
.date-card {
  border: 1px solid rgba(121, 189, 224, 0.16);
  border-radius: 6px;
  background: rgba(250, 252, 253, 0.82);
  color: var(--text-primary);
  cursor: pointer;
  transition: 0.2s ease;
}

.department-chip {
  flex: 0 0 auto;
  min-width: 112px;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 700;
}

.department-chip.is-active,
.date-card.is-active {
  background: linear-gradient(135deg, rgba(121, 189, 224, 0.94), rgba(111, 200, 184, 0.88));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 12px 24px rgba(108, 158, 185, 0.18);
}

.date-card {
  flex: 0 0 108px;
  display: grid;
  gap: 8px;
  min-height: 92px;
  padding: 14px 12px;
  text-align: left;
}

.date-card strong {
  font-size: 18px;
  font-weight: 800;
}

.date-card span {
  font-size: 15px;
}

.doctor-list {
  display: grid;
  gap: 16px;
}

.doctor-card {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 18px;
  padding: 22px;
  border-radius: 6px;
  background: rgba(252, 254, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow-card);
}

.doctor-avatar {
  display: grid;
  height: 96px;
  place-items: center;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(121, 189, 224, 0.2), rgba(111, 200, 184, 0.18));
  color: var(--text-primary);
  font-size: 30px;
  font-weight: 900;
}

.doctor-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.doctor-head h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.doctor-subline {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 16px;
}

.status-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.slot-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
}

.slot-pill {
  border: 1px solid rgba(232, 163, 73, 0.3);
  background: rgba(255, 244, 225, 0.8);
  color: #c17d12;
}

.status-pill.is-open {
  background: rgba(111, 200, 184, 0.14);
  color: #2d7d73;
}

.status-pill.is-full,
.status-pill.is-closed {
  background: rgba(245, 127, 23, 0.14);
  color: #d26b00;
}

.price-line {
  margin-top: 14px;
  color: #dd8d24;
  font-size: 18px;
  font-weight: 800;
}

.doctor-desc {
  margin: 14px 0 0;
  color: var(--text-secondary);
  line-height: 1.75;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-top: 18px;
}

.meta-text {
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 980px) {
  .doctor-card {
    grid-template-columns: 1fr;
  }

  .doctor-avatar {
    width: 84px;
    height: 84px;
  }

  .doctor-head,
  .card-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
