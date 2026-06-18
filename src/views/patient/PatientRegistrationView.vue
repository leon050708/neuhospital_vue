<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getDepartments } from '@/api/departments'
import { getDoctors } from '@/api/doctors'
import { quickRegistration } from '@/api/registrations'
import { getSchedulePage } from '@/api/schedules'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const patientId = computed(() => authStore.profile?.bizId)

const loadingDepartments = ref(false)
const loadingDoctors = ref(false)
const loadingSchedules = ref(false)
const submitting = ref(false)

const departments = ref([])
const doctors = ref([])
const schedules = ref([])
const total = ref(0)

const query = reactive({
  departmentId: '',
  doctorId: '',
  scheduleDate: '',
  timeSlot: ''
})

async function loadDepartments() {
  if (isPreview.value) {
    return
  }

  loadingDepartments.value = true

  try {
    const response = await getDepartments()
    departments.value = response.data || []
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载科室失败')
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
    const response = await getDoctors({ departmentId: query.departmentId })
    doctors.value = response.data || []
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载医生失败')
  } finally {
    loadingDoctors.value = false
  }
}

async function loadSchedules() {
  if (isPreview.value) {
    return
  }

  loadingSchedules.value = true

  try {
    const response = await getSchedulePage({
      pageNo: 1,
      pageSize: 20,
      departmentId: query.departmentId || undefined,
      doctorId: query.doctorId || undefined,
      scheduleDate: query.scheduleDate || undefined,
      timeSlot: query.timeSlot || undefined
    })

    const pageData = response.data || {}
    schedules.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载排班失败')
  } finally {
    loadingSchedules.value = false
  }
}

async function handleQuickRegistration(row) {
  if (!patientId.value) {
    ElMessage.warning('当前登录信息里没有 patientId，无法发起抢号')
    return
  }

  submitting.value = true

  try {
    const response = await quickRegistration({
      scheduleId: row.id,
      patientId: patientId.value
    })

    if (response.success) {
      ElMessage.success(response.message || '抢号受理成功')
      return
    }

    ElMessage.warning(response.message || '当前排班暂不可预约')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发起挂号失败')
  } finally {
    submitting.value = false
  }
}

watch(() => query.departmentId, async () => {
  query.doctorId = ''
  await loadDoctors()
  await loadSchedules()
})

watch(() => query.doctorId, loadSchedules)

onMounted(async () => {
  await loadDepartments()
  await loadSchedules()
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Registration</div>
      <h2 class="section-title">挂号排班</h2>
      <p class="section-desc">当前页只使用真实科室、医生、排班和快速抢号接口。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实挂号接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <div class="filter-grid">
          <el-select
            v-model="query.departmentId"
            placeholder="选择科室"
            clearable
            :loading="loadingDepartments"
          >
            <el-option
              v-for="item in departments"
              :key="item.id"
              :label="item.deptName"
              :value="item.id"
            />
          </el-select>

          <el-select
            v-model="query.doctorId"
            placeholder="选择医生"
            clearable
            :loading="loadingDoctors"
          >
            <el-option
              v-for="item in doctors"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>

          <el-date-picker
            v-model="query.scheduleDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            clearable
            @change="loadSchedules"
          />

          <el-select v-model="query.timeSlot" placeholder="时段" clearable @change="loadSchedules">
            <el-option label="上午" value="AM" />
            <el-option label="下午" value="PM" />
            <el-option label="夜间" value="NIGHT" />
          </el-select>
        </div>

        <el-table
          :data="schedules"
          v-loading="loadingSchedules"
          class="table-block"
          empty-text="当前条件下没有查询到排班"
        >
          <el-table-column prop="departmentName" label="科室" min-width="160" />
          <el-table-column prop="doctorName" label="医生" min-width="140" />
          <el-table-column prop="scheduleDate" label="日期" min-width="140" />
          <el-table-column prop="timeSlot" label="时段" min-width="100" />
          <el-table-column prop="availableCount" label="余号" min-width="100" />
          <el-table-column prop="feeAmount" label="挂号费" min-width="120" />
          <el-table-column prop="status" label="状态" min-width="120" />
          <el-table-column label="操作" min-width="140" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                :disabled="!patientId || row.status === 'CLOSED' || row.availableCount <= 0"
                :loading="submitting"
                @click="handleQuickRegistration(row)"
              >
                快速抢号
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="list-footer">当前共查询到 {{ total }} 条排班记录</div>
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
.table-block,
.list-footer {
  margin-top: 20px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.list-footer {
  color: var(--text-secondary);
}

@media (max-width: 980px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
