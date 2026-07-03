<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'

import { getDepartments } from '@/api/departments'
import { getDoctorPage } from '@/api/doctors'
import { closeSchedule, createSchedule, getSchedulePage, updateSchedule } from '@/api/schedules'

const route = useRoute()
const isPreview = computed(() => Boolean(route.meta?.preview))
const departments = ref([])
const doctors = ref([])
const schedules = ref([])
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const editingScheduleId = ref(null)
const selectedSchedules = ref([])
const batchDialogVisible = ref(false)
const batchSubmitting = ref(false)
const batchCreateDialogVisible = ref(false)
const batchCreateSubmitting = ref(false)

const timeSlotOptions = [
  { label: '上午', value: 'AM' },
  { label: '下午', value: 'PM' },
  { label: '夜间', value: 'NIGHT' }
]

const sourceTypeOptions = [
  { label: '普通号源', value: 'NORMAL' },
  { label: '专家号源', value: 'EXPERT' },
  { label: '复诊号源', value: 'FOLLOW_UP' }
]

const statusOptions = [
  { label: '启用', value: 'ENABLED' },
  { label: '停用', value: 'DISABLED' },
  { label: '关闭', value: 'CLOSED' }
]

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  departmentId: '',
  doctorId: '',
  scheduleDate: '',
  timeSlot: ''
})

const form = reactive({
  departmentId: '',
  doctorId: '',
  scheduleDate: '',
  timeSlot: 'AM',
  sourceCount: 20,
  feeAmount: 0,
  sourceType: 'NORMAL',
  status: 'ENABLED'
})

const batchForm = reactive({
  sourceCount: null,
  feeAmount: null,
  sourceType: '',
  status: ''
})

const batchCreateForm = reactive({
  departmentId: '',
  doctorId: '',
  dateRange: [],
  timeSlots: ['AM'],
  sourceCount: 20,
  feeAmount: 0,
  sourceType: 'NORMAL'
})

const rules = {
  departmentId: [{ required: true, message: '请选择科室', trigger: 'change' }],
  doctorId: [{ required: true, message: '请选择医生', trigger: 'change' }],
  scheduleDate: [{ required: true, message: '请选择排班日期', trigger: 'change' }],
  timeSlot: [{ required: true, message: '请选择出诊时段', trigger: 'change' }],
  sourceCount: [{ required: true, message: '请输入总号源', trigger: 'blur' }],
  feeAmount: [{ required: true, message: '请输入挂号费用', trigger: 'blur' }],
  sourceType: [{ required: true, message: '请选择号源类型', trigger: 'change' }]
}

const scheduleFormRef = ref()
const scheduleTableRef = ref()

function unwrapResult(response, fallbackMessage) {
  if (response?.code === 200) {
    return response.data
  }
  throw new Error(response?.message || fallbackMessage)
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }
  return Number(value).toFixed(2)
}

function statusTagType(status) {
  switch (status) {
    case 'ENABLED':
      return 'success'
    case 'DISABLED':
      return 'warning'
    case 'CLOSED':
      return 'info'
    default:
      return ''
  }
}

function statusLabel(status) {
  return statusOptions.find((item) => item.value === status)?.label || status || '--'
}

function timeSlotLabel(value) {
  return timeSlotOptions.find((item) => item.value === value)?.label || value || '--'
}

function sourceTypeLabel(value) {
  return sourceTypeOptions.find((item) => item.value === value)?.label || value || '--'
}

function resetForm() {
  form.departmentId = ''
  form.doctorId = ''
  form.scheduleDate = ''
  form.timeSlot = 'AM'
  form.sourceCount = 20
  form.feeAmount = 0
  form.sourceType = 'NORMAL'
  form.status = 'ENABLED'
  editingScheduleId.value = null
}

function resetBatchForm() {
  batchForm.sourceCount = null
  batchForm.feeAmount = null
  batchForm.sourceType = ''
  batchForm.status = ''
}

function resetBatchCreateForm() {
  batchCreateForm.departmentId = ''
  batchCreateForm.doctorId = ''
  batchCreateForm.dateRange = []
  batchCreateForm.timeSlots = ['AM']
  batchCreateForm.sourceCount = 20
  batchCreateForm.feeAmount = 0
  batchCreateForm.sourceType = 'NORMAL'
}

function handlePageChange(page) {
  query.pageNo = page
  loadSchedules()
}

function handlePageSizeChange(size) {
  query.pageSize = size
  query.pageNo = 1
  loadSchedules()
}

function handleSelectionChange(rows) {
  selectedSchedules.value = rows
}

async function loadDepartments() {
  if (isPreview.value) {
    return
  }

  try {
    const response = await getDepartments()
    departments.value = unwrapResult(response, '加载科室失败') || []
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载科室失败')
  }
}

async function loadDoctors(departmentId = query.departmentId || form.departmentId) {
  if (isPreview.value) {
    return
  }

  try {
    const response = await getDoctorPage({
      pageNo: 1,
      pageSize: 200,
      departmentId: departmentId || undefined
    })
    const pageData = unwrapResult(response, '加载医生失败') || {}
    doctors.value = pageData.records || []
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载医生失败')
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

    const pageData = unwrapResult(response, '加载排班失败') || {}
    schedules.value = pageData.records || []
    total.value = pageData.total || 0
    selectedSchedules.value = selectedSchedules.value.filter((selectedRow) =>
      schedules.value.some((row) => row.id === selectedRow.id)
    )
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载排班失败')
  } finally {
    loading.value = false
  }
}

async function handleDepartmentChange() {
  query.doctorId = ''
  query.pageNo = 1
  await loadDoctors(query.departmentId)
  await loadSchedules()
}

async function handleFormDepartmentChange() {
  form.doctorId = ''
  await loadDoctors(form.departmentId)
}

async function handleBatchCreateDepartmentChange() {
  batchCreateForm.doctorId = ''
  await loadDoctors(batchCreateForm.departmentId)
}

function openCreateDialog() {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
  nextTick(() => {
    scheduleFormRef.value?.clearValidate()
  })
}

function openBatchCreateDialog() {
  resetBatchCreateForm()
  batchCreateDialogVisible.value = true
}

function openBatchDialog() {
  if (!selectedSchedules.value.length) {
    ElMessage.warning('请先勾选要批量修改的排班')
    return
  }

  resetBatchForm()
  batchDialogVisible.value = true
}

async function openEditDialog(row) {
  dialogMode.value = 'edit'
  editingScheduleId.value = row.id
  form.departmentId = row.departmentId
  form.doctorId = ''
  form.scheduleDate = row.scheduleDate
  form.timeSlot = row.timeSlot
  form.sourceCount = row.sourceCount
  form.feeAmount = Number(row.feeAmount || 0)
  form.sourceType = row.sourceType || 'NORMAL'
  form.status = row.status || 'ENABLED'
  await loadDoctors(row.departmentId)
  form.doctorId = row.doctorId
  dialogVisible.value = true
  nextTick(() => {
    scheduleFormRef.value?.clearValidate()
  })
}

async function submitForm() {
  if (!scheduleFormRef.value) {
    return
  }

  const valid = await scheduleFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
  const payload = {
    doctorId: Number(form.doctorId),
    departmentId: Number(form.departmentId),
    scheduleDate: form.scheduleDate,
    timeSlot: form.timeSlot,
    sourceCount: Number(form.sourceCount),
    feeAmount: Number(form.feeAmount),
    sourceType: form.sourceType
  }

  try {
    if (dialogMode.value === 'create') {
      await createSchedule(payload)
      ElMessage.success('排班创建成功')
    } else {
      await updateSchedule(editingScheduleId.value, {
        sourceCount: Number(form.sourceCount),
        feeAmount: Number(form.feeAmount),
        sourceType: form.sourceType,
        status: form.status
      })
      ElMessage.success('排班更新成功')
    }

    dialogVisible.value = false
    await loadSchedules()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '提交排班失败')
  } finally {
    submitting.value = false
  }
}

async function submitBatchForm() {
  if (!selectedSchedules.value.length) {
    ElMessage.warning('请先勾选要批量修改的排班')
    return
  }

  const payload = {}

  if (batchForm.sourceCount !== null) {
    payload.sourceCount = Number(batchForm.sourceCount)
  }
  if (batchForm.feeAmount !== null) {
    payload.feeAmount = Number(batchForm.feeAmount)
  }
  if (batchForm.sourceType) {
    payload.sourceType = batchForm.sourceType
  }
  if (batchForm.status) {
    payload.status = batchForm.status
  }

  if (!Object.keys(payload).length) {
    ElMessage.warning('请至少填写一个批量修改项')
    return
  }

  batchSubmitting.value = true

  try {
    const results = await Promise.allSettled(
      selectedSchedules.value.map((row) => updateSchedule(row.id, payload))
    )
    const successCount = results.filter((item) => item.status === 'fulfilled').length
    const failedCount = results.length - successCount

    if (successCount) {
      ElMessage.success(
        failedCount
          ? `批量修改完成，成功 ${successCount} 条，失败 ${failedCount} 条`
          : `批量修改成功，共更新 ${successCount} 条排班`
      )
    } else {
      throw new Error('批量修改失败')
    }

    batchDialogVisible.value = false
    selectedSchedules.value = []
    await loadSchedules()
    scheduleTableRef.value?.clearSelection()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '批量修改失败')
  } finally {
    batchSubmitting.value = false
  }
}

function buildDateList(startDateText, endDateText) {
  const result = []
  const cursor = new Date(`${startDateText}T00:00:00`)
  const end = new Date(`${endDateText}T00:00:00`)

  while (cursor <= end) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, '0')
    const day = String(cursor.getDate()).padStart(2, '0')
    result.push(`${year}-${month}-${day}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

async function submitBatchCreateForm() {
  if (!batchCreateForm.departmentId) {
    ElMessage.warning('请选择科室')
    return
  }
  if (!batchCreateForm.doctorId) {
    ElMessage.warning('请选择医生')
    return
  }
  if (!batchCreateForm.dateRange?.length || !batchCreateForm.dateRange[0] || !batchCreateForm.dateRange[1]) {
    ElMessage.warning('请选择排班日期范围')
    return
  }
  if (!batchCreateForm.timeSlots.length) {
    ElMessage.warning('请至少选择一个出诊时段')
    return
  }

  const [startDate, endDate] = batchCreateForm.dateRange
  const dateList = buildDateList(startDate, endDate)
  const payloadList = dateList.flatMap((scheduleDate) => {
    return batchCreateForm.timeSlots.map((timeSlot) => ({
      doctorId: Number(batchCreateForm.doctorId),
      departmentId: Number(batchCreateForm.departmentId),
      scheduleDate,
      timeSlot,
      sourceCount: Number(batchCreateForm.sourceCount),
      feeAmount: Number(batchCreateForm.feeAmount),
      sourceType: batchCreateForm.sourceType
    }))
  })

  batchCreateSubmitting.value = true

  try {
    const results = await Promise.allSettled(
      payloadList.map((payload) => createSchedule(payload))
    )
    const successCount = results.filter((item) => item.status === 'fulfilled').length
    const failedCount = results.length - successCount

    if (successCount) {
      ElMessage.success(
        failedCount
          ? `批量新增完成，成功 ${successCount} 条，失败 ${failedCount} 条`
          : `批量新增成功，共创建 ${successCount} 条排班`
      )
    } else {
      throw new Error('批量新增失败')
    }

    batchCreateDialogVisible.value = false
    await loadSchedules()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '批量新增失败')
  } finally {
    batchCreateSubmitting.value = false
  }
}

async function handleCloseSchedule(row) {
  try {
    await ElMessageBox.confirm(
      `确认关闭排班 #${row.id} 吗？关闭后该时段将不可继续挂号。`,
      '关闭排班',
      {
        type: 'warning',
        confirmButtonText: '确认关闭',
        cancelButtonText: '取消'
      }
    )
    await closeSchedule(row.id)
    ElMessage.success('排班已关闭')
    await loadSchedules()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(error.response?.data?.message || error.message || '关闭排班失败')
  }
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
      <div class="page-header">
        <div>
          <div class="status-chip">Schedules</div>
          <h2 class="section-title">排班号源管理</h2>
          <p class="section-desc">支持按科室、医生、日期筛选，并直接新增、修改、批量调整、关闭排班。</p>
        </div>
        <div v-if="!isPreview" class="header-actions">
          <el-button round :disabled="!selectedSchedules.length" @click="openBatchDialog">
            批量修改
          </el-button>
          <el-button round @click="openBatchCreateDialog">批量新增</el-button>
          <el-button type="primary" round @click="openCreateDialog">新增排班</el-button>
        </div>
      </div>

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
              :label="`${item.name}${item.title ? ` / ${item.title}` : ''}`"
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
            <el-option
              v-for="item in timeSlotOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>

        <el-table
          ref="scheduleTableRef"
          :data="schedules"
          row-key="id"
          v-loading="loading"
          class="table-block"
          empty-text="没有查询到排班数据"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="48" reserve-selection />
          <el-table-column prop="id" label="排班 ID" min-width="96" />
          <el-table-column prop="departmentName" label="科室" min-width="140" />
          <el-table-column prop="doctorName" label="医生" min-width="120" />
          <el-table-column prop="scheduleDate" label="日期" min-width="130" />
          <el-table-column label="时段" min-width="100">
            <template #default="{ row }">
              {{ timeSlotLabel(row.timeSlot) }}
            </template>
          </el-table-column>
          <el-table-column prop="sourceCount" label="总号源" min-width="100" />
          <el-table-column prop="availableCount" label="余号" min-width="100" />
          <el-table-column label="费用" min-width="110">
            <template #default="{ row }">
              {{ formatCurrency(row.feeAmount) }}
            </template>
          </el-table-column>
          <el-table-column label="号源类型" min-width="120">
            <template #default="{ row }">
              {{ sourceTypeLabel(row.sourceType) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="110">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" effect="light">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="220" fixed="right">
            <template #default="{ row }">
              <div class="action-row">
                <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
                <el-button
                  link
                  type="danger"
                  :disabled="row.status === 'CLOSED'"
                  @click="handleCloseSchedule(row)"
                >
                  关闭
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="list-footer">
          <span>当前共 {{ total }} 条排班记录，已选 {{ selectedSchedules.length }} 条</span>
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :total="total"
            :current-page="query.pageNo"
            :page-size="query.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
          />
        </div>
      </template>
    </article>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增排班' : '编辑排班'"
      width="640px"
      destroy-on-close
    >
      <el-form ref="scheduleFormRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="所属科室" prop="departmentId">
          <el-select v-model="form.departmentId" placeholder="选择科室" @change="handleFormDepartmentChange">
            <el-option
              v-for="item in departments"
              :key="item.id"
              :label="item.deptName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="出诊医生" prop="doctorId">
          <el-select v-model="form.doctorId" placeholder="选择医生" :disabled="!form.departmentId || dialogMode === 'edit'">
            <el-option
              v-for="item in doctors"
              :key="item.id"
              :label="`${item.name}${item.title ? ` / ${item.title}` : ''}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="排班日期" prop="scheduleDate">
          <el-date-picker
            v-model="form.scheduleDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>

        <el-form-item label="出诊时段" prop="timeSlot">
          <el-radio-group v-model="form.timeSlot" :disabled="dialogMode === 'edit'">
            <el-radio-button
              v-for="item in timeSlotOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="总号源" prop="sourceCount">
          <el-input-number v-model="form.sourceCount" :min="1" :max="500" />
        </el-form-item>

        <el-form-item label="挂号费用" prop="feeAmount">
          <el-input-number v-model="form.feeAmount" :min="0" :precision="2" :step="1" />
        </el-form-item>

        <el-form-item label="号源类型" prop="sourceType">
          <el-select v-model="form.sourceType" placeholder="选择号源类型">
            <el-option
              v-for="item in sourceTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="dialogMode === 'edit'" label="排班状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio-button
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button round @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" round :loading="submitting" @click="submitForm">
          {{ dialogMode === 'create' ? '创建排班' : '保存修改' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="batchDialogVisible"
      title="批量修改排班"
      width="560px"
      destroy-on-close
    >
      <el-alert
        title="留空的字段不会被修改，只会更新你填写的内容。"
        type="info"
        :closable="false"
        show-icon
      />

      <el-form :model="batchForm" label-width="96px" class="batch-form">
        <el-form-item label="总号源">
          <el-input-number v-model="batchForm.sourceCount" :min="1" :max="500" placeholder="留空则不修改" />
        </el-form-item>

        <el-form-item label="挂号费用">
          <el-input-number v-model="batchForm.feeAmount" :min="0" :precision="2" :step="1" placeholder="留空则不修改" />
        </el-form-item>

        <el-form-item label="号源类型">
          <el-select v-model="batchForm.sourceType" clearable placeholder="留空则不修改">
            <el-option
              v-for="item in sourceTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="排班状态">
          <el-select v-model="batchForm.status" clearable placeholder="留空则不修改">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button round @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" round :loading="batchSubmitting" @click="submitBatchForm">
          确认批量修改
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="batchCreateDialogVisible"
      title="批量新增排班"
      width="640px"
      destroy-on-close
    >
      <el-alert
        title="会按所选日期范围和时段组合批量创建排班。"
        type="info"
        :closable="false"
        show-icon
      />

      <el-form :model="batchCreateForm" label-width="96px" class="batch-form">
        <el-form-item label="所属科室">
          <el-select v-model="batchCreateForm.departmentId" placeholder="选择科室" @change="handleBatchCreateDepartmentChange">
            <el-option
              v-for="item in departments"
              :key="item.id"
              :label="item.deptName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="出诊医生">
          <el-select v-model="batchCreateForm.doctorId" placeholder="选择医生" :disabled="!batchCreateForm.departmentId">
            <el-option
              v-for="item in doctors"
              :key="item.id"
              :label="`${item.name}${item.title ? ` / ${item.title}` : ''}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="日期范围">
          <el-date-picker
            v-model="batchCreateForm.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            range-separator="至"
          />
        </el-form-item>

        <el-form-item label="出诊时段">
          <el-checkbox-group v-model="batchCreateForm.timeSlots">
            <el-checkbox
              v-for="item in timeSlotOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="总号源">
          <el-input-number v-model="batchCreateForm.sourceCount" :min="1" :max="500" />
        </el-form-item>

        <el-form-item label="挂号费用">
          <el-input-number v-model="batchCreateForm.feeAmount" :min="0" :precision="2" :step="1" />
        </el-form-item>

        <el-form-item label="号源类型">
          <el-select v-model="batchCreateForm.sourceType" placeholder="选择号源类型">
            <el-option
              v-for="item in sourceTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button round @click="batchCreateDialogVisible = false">取消</el-button>
        <el-button type="primary" round :loading="batchCreateSubmitting" @click="submitBatchCreateForm">
          确认批量新增
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary);
}

.action-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.batch-form {
  margin-top: 18px;
}

@media (max-width: 980px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .list-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
