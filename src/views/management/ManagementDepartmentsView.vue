<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'

import {
  createDepartment,
  getDepartmentDetail,
  getDepartments,
  updateDepartment
} from '@/api/departments'
import {
  createDoctor,
  getDoctorDetail,
  getDoctorPage,
  updateDoctor
} from '@/api/doctors'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const isPreview = computed(() => Boolean(route.meta?.preview))
const currentSection = computed(() => route.meta?.section === 'doctors' ? 'doctors' : 'departments')

const DEPARTMENT_TYPE_OPTIONS = [
  { label: '临床科室', value: 'CLINICAL' },
  { label: '医技科室', value: 'MEDICAL_TECHNOLOGY' },
  { label: '职能科室', value: 'FUNCTIONAL' },
  { label: '其他', value: 'OTHER' }
]

const STATUS_OPTIONS = [
  { label: '启用', value: 'ENABLED' },
  { label: '停用', value: 'DISABLED' }
]

const GENDER_OPTIONS = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
  { label: '未知', value: '未知' }
]

const TITLE_OPTIONS = [
  '主任医师',
  '副主任医师',
  '主治医师',
  '住院医师'
]

const departmentLoading = ref(false)
const doctorLoading = ref(false)
const departmentSubmitting = ref(false)
const doctorSubmitting = ref(false)
const doctorDetailLoading = ref(false)

const departments = ref([])
const doctors = ref([])
const totalDoctors = ref(0)
const doctorDetail = ref(null)

const departmentDialogVisible = ref(false)
const doctorDialogVisible = ref(false)
const doctorDetailVisible = ref(false)
const departmentDialogMode = ref('create')
const doctorDialogMode = ref('create')
const editingDepartmentId = ref(null)
const editingDoctorId = ref(null)
const departmentFormRef = ref()
const doctorFormRef = ref()

const doctorQuery = reactive({
  pageNo: 1,
  pageSize: 10,
  departmentId: '',
  keyword: ''
})

const departmentForm = reactive({
  deptCode: '',
  deptName: '',
  deptType: 'CLINICAL',
  description: '',
  status: 'ENABLED'
})

const doctorForm = reactive({
  name: '',
  gender: '男',
  title: '主治医师',
  departmentId: '',
  introduction: '',
  specialty: '',
  phone: '',
  status: 'ENABLED'
})

const departmentRules = {
  deptCode: [
    { required: true, message: '请输入科室编码', trigger: 'blur' },
    { pattern: /^[A-Z0-9_-]+$/, message: '仅支持大写字母、数字、下划线和中划线', trigger: 'blur' }
  ],
  deptName: [{ required: true, message: '请输入科室名称', trigger: 'blur' }],
  deptType: [{ required: true, message: '请选择科室类型', trigger: 'change' }]
}

const doctorRules = {
  name: [{ required: true, message: '请输入医生姓名', trigger: 'blur' }],
  title: [{ required: true, message: '请输入医生职称', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择所属科室', trigger: 'change' }],
  phone: [
    {
      pattern: /^1\d{10}$/,
      message: '请输入正确的 11 位手机号',
      trigger: 'blur'
    }
  ]
}

function statusLabel(value) {
  return STATUS_OPTIONS.find((item) => item.value === value)?.label || value || '--'
}

function statusTagType(value) {
  if (value === 'ENABLED') return 'success'
  if (value === 'DISABLED') return 'warning'
  return 'info'
}

function departmentTypeLabel(value) {
  return DEPARTMENT_TYPE_OPTIONS.find((item) => item.value === value)?.label || value || '--'
}

function resetDepartmentForm() {
  departmentForm.deptCode = ''
  departmentForm.deptName = ''
  departmentForm.deptType = 'CLINICAL'
  departmentForm.description = ''
  departmentForm.status = 'ENABLED'
  editingDepartmentId.value = null
}

function resetDoctorForm() {
  doctorForm.name = ''
  doctorForm.gender = '男'
  doctorForm.title = '主治医师'
  doctorForm.departmentId = ''
  doctorForm.introduction = ''
  doctorForm.specialty = ''
  doctorForm.phone = ''
  doctorForm.status = 'ENABLED'
  editingDoctorId.value = null
}

async function loadDepartments() {
  if (isPreview.value) {
    return
  }

  departmentLoading.value = true

  try {
    const response = await getDepartments()
    departments.value = unwrapResult(response, '加载科室失败') || []
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载科室失败')
  } finally {
    departmentLoading.value = false
  }
}

async function loadDoctors() {
  if (isPreview.value) {
    return
  }

  doctorLoading.value = true

  try {
    const response = await getDoctorPage({
      pageNo: doctorQuery.pageNo,
      pageSize: doctorQuery.pageSize,
      departmentId: doctorQuery.departmentId ? Number(doctorQuery.departmentId) : undefined,
      keyword: doctorQuery.keyword.trim() || undefined
    })

    const pageData = unwrapResult(response, '加载医生分页失败') || {}
    doctors.value = pageData.records || []
    totalDoctors.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载医生分页失败')
  } finally {
    doctorLoading.value = false
  }
}

function handleDoctorQueryChange() {
  doctorQuery.pageNo = 1
  loadDoctors()
}

function handleDoctorPageChange(page) {
  doctorQuery.pageNo = page
  loadDoctors()
}

function handleDoctorSizeChange(size) {
  doctorQuery.pageSize = size
  doctorQuery.pageNo = 1
  loadDoctors()
}

function openCreateDepartmentDialog() {
  departmentDialogMode.value = 'create'
  resetDepartmentForm()
  departmentDialogVisible.value = true
  nextTick(() => departmentFormRef.value?.clearValidate())
}

async function openEditDepartmentDialog(row) {
  departmentDialogMode.value = 'edit'
  editingDepartmentId.value = row.id

  try {
    const response = await getDepartmentDetail(row.id)
    const detail = unwrapResult(response, '加载科室详情失败') || row
    departmentForm.deptCode = detail.deptCode || ''
    departmentForm.deptName = detail.deptName || ''
    departmentForm.deptType = detail.deptType || 'CLINICAL'
    departmentForm.description = detail.description || ''
    departmentForm.status = detail.status || 'ENABLED'
    departmentDialogVisible.value = true
    nextTick(() => departmentFormRef.value?.clearValidate())
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载科室详情失败')
  }
}

async function submitDepartmentForm() {
  if (!departmentFormRef.value) {
    return
  }

  const valid = await departmentFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  departmentSubmitting.value = true

  try {
    if (departmentDialogMode.value === 'create') {
      await createDepartment({
        deptCode: departmentForm.deptCode.trim(),
        deptName: departmentForm.deptName.trim(),
        deptType: departmentForm.deptType,
        description: departmentForm.description.trim() || undefined
      })
      ElMessage.success('科室创建成功')
    } else {
      await updateDepartment(editingDepartmentId.value, {
        deptName: departmentForm.deptName.trim(),
        deptType: departmentForm.deptType,
        description: departmentForm.description.trim() || undefined,
        status: departmentForm.status
      })
      ElMessage.success('科室更新成功')
    }

    departmentDialogVisible.value = false
    await loadDepartments()
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '提交科室失败')
  } finally {
    departmentSubmitting.value = false
  }
}

async function toggleDepartmentStatus(row, nextStatus) {
  const actionLabel = nextStatus === 'ENABLED' ? '启用' : '停用'

  try {
    await ElMessageBox.confirm(
      `确认${actionLabel}科室“${row.deptName}”吗？`,
      `${actionLabel}科室`,
      {
        type: 'warning',
        confirmButtonText: `确认${actionLabel}`,
        cancelButtonText: '取消'
      }
    )

    await updateDepartment(row.id, {
      deptName: row.deptName,
      deptType: row.deptType,
      description: row.description || undefined,
      status: nextStatus
    })

    ElMessage.success(`科室已${actionLabel}`)
    await loadDepartments()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }

    ElMessage.error(error.message || error.response?.data?.message || `${actionLabel}科室失败`)
  }
}

function openCreateDoctorDialog() {
  doctorDialogMode.value = 'create'
  resetDoctorForm()
  doctorDialogVisible.value = true
  nextTick(() => doctorFormRef.value?.clearValidate())
}

async function openEditDoctorDialog(row) {
  doctorDialogMode.value = 'edit'
  editingDoctorId.value = row.id

  try {
    const response = await getDoctorDetail(row.id)
    const detail = unwrapResult(response, '加载医生详情失败') || row
    doctorForm.name = detail.name || ''
    doctorForm.gender = detail.gender || '男'
    doctorForm.title = detail.title || '主治医师'
    doctorForm.departmentId = detail.departmentId ? String(detail.departmentId) : ''
    doctorForm.introduction = detail.introduction || ''
    doctorForm.specialty = detail.specialty || ''
    doctorForm.phone = detail.phone || ''
    doctorForm.status = detail.status || 'ENABLED'
    doctorDialogVisible.value = true
    nextTick(() => doctorFormRef.value?.clearValidate())
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载医生详情失败')
  }
}

async function submitDoctorForm() {
  if (!doctorFormRef.value) {
    return
  }

  const valid = await doctorFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  doctorSubmitting.value = true

  try {
    if (doctorDialogMode.value === 'create') {
      await createDoctor({
        name: doctorForm.name.trim(),
        gender: doctorForm.gender,
        title: doctorForm.title.trim(),
        departmentId: Number(doctorForm.departmentId),
        introduction: doctorForm.introduction.trim() || undefined,
        specialty: doctorForm.specialty.trim() || undefined,
        phone: doctorForm.phone.trim() || undefined
      })
      ElMessage.success('医生创建成功，默认密码为 123456')
    } else {
      await updateDoctor(editingDoctorId.value, {
        name: doctorForm.name.trim(),
        gender: doctorForm.gender,
        title: doctorForm.title.trim(),
        departmentId: Number(doctorForm.departmentId),
        introduction: doctorForm.introduction.trim() || undefined,
        specialty: doctorForm.specialty.trim() || undefined,
        phone: doctorForm.phone.trim() || undefined,
        status: doctorForm.status
      })
      ElMessage.success('医生更新成功')
    }

    doctorDialogVisible.value = false
    await loadDoctors()
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '提交医生失败')
  } finally {
    doctorSubmitting.value = false
  }
}

async function showDoctorDetail(row) {
  doctorDetailVisible.value = true
  doctorDetailLoading.value = true

  try {
    const response = await getDoctorDetail(row.id)
    doctorDetail.value = unwrapResult(response, '加载医生详情失败') || null
  } catch (error) {
    doctorDetailVisible.value = false
    ElMessage.error(error.message || error.response?.data?.message || '加载医生详情失败')
  } finally {
    doctorDetailLoading.value = false
  }
}

async function toggleDoctorStatus(row, nextStatus) {
  const actionLabel = nextStatus === 'ENABLED' ? '启用' : '停用'

  try {
    await ElMessageBox.confirm(
      `确认${actionLabel}医生“${row.name}”吗？`,
      `${actionLabel}医生`,
      {
        type: 'warning',
        confirmButtonText: `确认${actionLabel}`,
        cancelButtonText: '取消'
      }
    )

    await updateDoctor(row.id, {
      name: row.name,
      gender: row.gender,
      title: row.title,
      departmentId: row.departmentId,
      introduction: row.introduction || undefined,
      specialty: row.specialty || undefined,
      phone: row.phone || undefined,
      status: nextStatus
    })

    ElMessage.success(`医生已${actionLabel}`)
    await loadDoctors()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }

    ElMessage.error(error.message || error.response?.data?.message || `${actionLabel}医生失败`)
  }
}

onMounted(async () => {
  await loadDepartments()
  await loadDoctors()
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Departments & Doctors</div>
      <h2 class="section-title">科室医生管理</h2>
      <p class="section-desc">科室页支持新增、编辑、启停；医生页支持分页筛选、详情查看、新增编辑和启停，直接对应当前后端管理接口能力。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实科室与医生接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <div v-else class="split-grid">
        <div v-if="currentSection === 'departments'">
          <div class="toolbar">
            <div class="toolbar-header">
              <h3 class="sub-title">科室管理</h3>
              <el-button type="primary" round @click="openCreateDepartmentDialog">新增科室</el-button>
            </div>
          </div>

          <el-table
            :data="departments"
            v-loading="departmentLoading"
            class="table-block"
            empty-text="没有查询到科室数据"
          >
            <el-table-column prop="deptCode" label="科室编码" min-width="140" />
            <el-table-column prop="deptName" label="科室名称" min-width="160" />
            <el-table-column label="类型" min-width="140">
              <template #default="{ row }">
                {{ departmentTypeLabel(row.deptType) }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" min-width="110">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="220" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openEditDepartmentDialog(row)">编辑</el-button>
                <el-button
                  v-if="row.status !== 'DISABLED'"
                  link
                  type="warning"
                  @click="toggleDepartmentStatus(row, 'DISABLED')"
                >
                  停用
                </el-button>
                <el-button
                  v-else
                  link
                  type="success"
                  @click="toggleDepartmentStatus(row, 'ENABLED')"
                >
                  启用
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-else>
          <div class="toolbar">
            <div class="toolbar-header">
              <h3 class="sub-title">医生管理</h3>
              <el-button type="primary" round @click="openCreateDoctorDialog">新增医生</el-button>
            </div>

            <div class="toolbar-inputs">
              <el-select v-model="doctorQuery.departmentId" placeholder="筛选科室" clearable @change="handleDoctorQueryChange">
                <el-option
                  v-for="item in departments"
                  :key="item.id"
                  :label="item.deptName || item.departmentName"
                  :value="String(item.id)"
                />
              </el-select>
              <el-input v-model="doctorQuery.keyword" placeholder="搜索姓名或工号" clearable @keyup.enter="handleDoctorQueryChange" />
              <el-button round @click="handleDoctorQueryChange">查询</el-button>
            </div>
          </div>

          <el-table
            :data="doctors"
            v-loading="doctorLoading"
            class="table-block"
            empty-text="没有查询到医生数据"
          >
            <el-table-column prop="doctorNo" label="医生工号" min-width="150" />
            <el-table-column prop="name" label="姓名" min-width="110" />
            <el-table-column prop="gender" label="性别" min-width="90" />
            <el-table-column prop="title" label="职称" min-width="120" />
            <el-table-column prop="departmentName" label="所属科室" min-width="140" />
            <el-table-column prop="specialty" label="擅长方向" min-width="200" show-overflow-tooltip />
            <el-table-column prop="phone" label="联系电话" min-width="140" />
            <el-table-column label="状态" min-width="110">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="260" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="showDoctorDetail(row)">详情</el-button>
                <el-button link type="primary" @click="openEditDoctorDialog(row)">编辑</el-button>
                <el-button
                  v-if="row.status !== 'DISABLED'"
                  link
                  type="warning"
                  @click="toggleDoctorStatus(row, 'DISABLED')"
                >
                  停用
                </el-button>
                <el-button
                  v-else
                  link
                  type="success"
                  @click="toggleDoctorStatus(row, 'ENABLED')"
                >
                  启用
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-row">
            <div class="list-footer">当前共 {{ totalDoctors }} 条医生记录</div>
            <el-pagination
              background
              layout="total, sizes, prev, pager, next"
              :current-page="doctorQuery.pageNo"
              :page-size="doctorQuery.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="totalDoctors"
              @current-change="handleDoctorPageChange"
              @size-change="handleDoctorSizeChange"
            />
          </div>
        </div>
      </div>

      <el-dialog
        v-model="departmentDialogVisible"
        :title="departmentDialogMode === 'create' ? '新增科室' : '编辑科室'"
        width="560px"
      >
        <el-form ref="departmentFormRef" :model="departmentForm" :rules="departmentRules" label-width="96px">
          <el-form-item label="科室编码" prop="deptCode">
            <el-input v-model="departmentForm.deptCode" :disabled="departmentDialogMode === 'edit'" placeholder="如 CARDIO" />
          </el-form-item>
          <el-form-item label="科室名称" prop="deptName">
            <el-input v-model="departmentForm.deptName" />
          </el-form-item>
          <el-form-item label="科室类型" prop="deptType">
            <el-select v-model="departmentForm.deptType" placeholder="选择科室类型">
              <el-option v-for="item in DEPARTMENT_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="科室描述">
            <el-input v-model="departmentForm.description" type="textarea" :rows="4" placeholder="可选：填写科室职责说明" />
          </el-form-item>
          <el-form-item v-if="departmentDialogMode === 'edit'" label="状态">
            <el-select v-model="departmentForm.status">
              <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="departmentDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="departmentSubmitting" @click="submitDepartmentForm">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="doctorDialogVisible"
        :title="doctorDialogMode === 'create' ? '新增医生' : '编辑医生'"
        width="680px"
      >
        <el-form ref="doctorFormRef" :model="doctorForm" :rules="doctorRules" label-width="96px">
          <div class="form-grid">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="doctorForm.name" />
            </el-form-item>
            <el-form-item label="性别">
              <el-select v-model="doctorForm.gender">
                <el-option v-for="item in GENDER_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="职称" prop="title">
              <el-select v-model="doctorForm.title" allow-create filterable default-first-option>
                <el-option v-for="item in TITLE_OPTIONS" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="所属科室" prop="departmentId">
              <el-select v-model="doctorForm.departmentId" placeholder="选择科室" filterable>
                <el-option
                  v-for="item in departments"
                  :key="item.id"
                  :label="item.deptName || item.departmentName"
                  :value="String(item.id)"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="doctorForm.phone" placeholder="11 位手机号" />
            </el-form-item>
            <el-form-item v-if="doctorDialogMode === 'edit'" label="状态">
              <el-select v-model="doctorForm.status">
                <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="医生简介">
            <el-input v-model="doctorForm.introduction" type="textarea" :rows="4" placeholder="可选：填写医生简介" />
          </el-form-item>
          <el-form-item label="擅长方向">
            <el-input v-model="doctorForm.specialty" type="textarea" :rows="3" placeholder="如 冠心病、高血压" />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="doctorDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="doctorSubmitting" @click="submitDoctorForm">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="doctorDetailVisible" title="医生详情" width="720px">
        <el-skeleton v-if="doctorDetailLoading" :rows="6" animated />
        <el-descriptions v-else-if="doctorDetail" :column="2" border>
          <el-descriptions-item label="医生工号">{{ doctorDetail.doctorNo || '--' }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ doctorDetail.name || '--' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ doctorDetail.gender || '--' }}</el-descriptions-item>
          <el-descriptions-item label="职称">{{ doctorDetail.title || '--' }}</el-descriptions-item>
          <el-descriptions-item label="所属科室">{{ doctorDetail.departmentName || doctorDetail.departmentId || '--' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ doctorDetail.phone || '--' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(doctorDetail.status)">{{ statusLabel(doctorDetail.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="主键 ID">{{ doctorDetail.id || '--' }}</el-descriptions-item>
          <el-descriptions-item label="简介" :span="2">{{ doctorDetail.introduction || '--' }}</el-descriptions-item>
          <el-descriptions-item label="擅长方向" :span="2">{{ doctorDetail.specialty || '--' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.split-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 20px;
}

.notice {
  margin-top: 20px;
}

.toolbar {
  display: grid;
  gap: 14px;
}

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sub-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.toolbar-inputs {
  display: flex;
  gap: 12px;
}

.table-block {
  margin-top: 14px;
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.list-footer {
  color: var(--text-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

@media (max-width: 1100px) {
  .toolbar-header,
  .toolbar-inputs,
  .pagination-row {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
