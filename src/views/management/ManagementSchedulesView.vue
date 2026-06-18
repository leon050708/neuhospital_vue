<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getDepartments } from '@/api/departments'
import { getDoctorPage } from '@/api/doctors'
import { getSchedulePage } from '@/api/schedules'

const route = useRoute()
const isPreview = computed(() => Boolean(route.meta?.preview))
const departments = ref([])
const doctors = ref([])
const schedules = ref([])
const total = ref(0)
const loading = ref(false)

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  departmentId: '',
  doctorId: '',
  scheduleDate: '',
  timeSlot: ''
})

async function loadDepartments() {
  if (isPreview.value) {
    return
  }

  try {
    const response = await getDepartments()
    departments.value = response.data || []
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载科室失败')
  }
}

async function loadDoctors() {
  if (isPreview.value) {
    return
  }

  try {
    const response = await getDoctorPage({
      pageNo: 1,
      pageSize: 100,
      departmentId: query.departmentId || undefined
    })
    doctors.value = response.data?.records || []
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载医生失败')
  }
}

async function loadSchedules() {
  if (isPreview.value) {
    return
  }

  loading.value = true

  try {
    const response = await getSchedulePage({
      pageNo: query.pageNo,
      pageSize: query.pageSize,
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
    loading.value = false
  }
}

async function handleDepartmentChange() {
  query.doctorId = ''
  await loadDoctors()
  await loadSchedules()
}

onMounted(async () => {
  await loadDepartments()
  await loadDoctors()
  await loadSchedules()
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Schedules</div>
      <h2 class="section-title">排班号源管理</h2>
      <p class="section-desc">当前页只使用真实排班分页、科室列表和医生分页接口。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实排班接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
      <div class="filter-grid">
        <el-select v-model="query.departmentId" placeholder="筛选科室" clearable @change="handleDepartmentChange">
          <el-option
            v-for="item in departments"
            :key="item.id"
            :label="item.deptName"
            :value="item.id"
          />
        </el-select>

        <el-select v-model="query.doctorId" placeholder="筛选医生" clearable @change="loadSchedules">
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
          placeholder="选择排班日期"
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
        v-loading="loading"
        class="table-block"
        empty-text="没有查询到排班数据"
      >
        <el-table-column prop="id" label="排班 ID" min-width="100" />
        <el-table-column prop="departmentName" label="科室" min-width="140" />
        <el-table-column prop="doctorName" label="医生" min-width="120" />
        <el-table-column prop="scheduleDate" label="日期" min-width="130" />
        <el-table-column prop="timeSlot" label="时段" min-width="100" />
        <el-table-column prop="sourceCount" label="总号源" min-width="100" />
        <el-table-column prop="availableCount" label="余号" min-width="100" />
        <el-table-column prop="feeAmount" label="费用" min-width="110" />
        <el-table-column prop="status" label="状态" min-width="100" />
      </el-table>

      <div class="list-footer">当前共 {{ total }} 条排班记录</div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.notice {
  margin-top: 20px;
}

.table-block,
.list-footer {
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
