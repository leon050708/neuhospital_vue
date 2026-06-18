<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getDepartments } from '@/api/departments'
import { getDoctorPage } from '@/api/doctors'

const route = useRoute()
const isPreview = computed(() => Boolean(route.meta?.preview))
const loadingDepartments = ref(false)
const loadingDoctors = ref(false)
const departments = ref([])
const doctors = ref([])
const totalDoctors = ref(0)

const doctorQuery = reactive({
  pageNo: 1,
  pageSize: 10,
  departmentId: '',
  keyword: ''
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
  if (isPreview.value) {
    return
  }

  loadingDoctors.value = true

  try {
    const response = await getDoctorPage({
      pageNo: doctorQuery.pageNo,
      pageSize: doctorQuery.pageSize,
      departmentId: doctorQuery.departmentId || undefined,
      keyword: doctorQuery.keyword || undefined
    })

    const pageData = response.data || {}
    doctors.value = pageData.records || []
    totalDoctors.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载医生分页失败')
  } finally {
    loadingDoctors.value = false
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
      <p class="section-desc">当前页只使用真实科室列表和医生分页接口。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实科室与医生接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <div v-else class="split-grid">
        <div>
          <h3 class="sub-title">科室列表</h3>
          <el-table
            :data="departments"
            v-loading="loadingDepartments"
            class="table-block"
            empty-text="没有查询到科室数据"
          >
            <el-table-column prop="id" label="ID" width="90" />
            <el-table-column prop="deptCode" label="科室编码" min-width="140" />
            <el-table-column prop="deptName" label="科室名称" min-width="160" />
            <el-table-column prop="deptType" label="类型" min-width="120" />
            <el-table-column prop="status" label="状态" min-width="100" />
          </el-table>
        </div>

        <div>
          <div class="toolbar">
            <h3 class="sub-title">医生分页</h3>
            <div class="toolbar-inputs">
              <el-select v-model="doctorQuery.departmentId" placeholder="筛选科室" clearable @change="loadDoctors">
                <el-option
                  v-for="item in departments"
                  :key="item.id"
                  :label="item.deptName"
                  :value="item.id"
                />
              </el-select>
              <el-input v-model="doctorQuery.keyword" placeholder="搜索医生" clearable @keyup.enter="loadDoctors" />
              <el-button round @click="loadDoctors">查询</el-button>
            </div>
          </div>

          <el-table
            :data="doctors"
            v-loading="loadingDoctors"
            class="table-block"
            empty-text="没有查询到医生数据"
          >
            <el-table-column prop="doctorNo" label="医生编号" min-width="150" />
            <el-table-column prop="name" label="姓名" min-width="120" />
            <el-table-column prop="title" label="职称" min-width="140" />
            <el-table-column prop="departmentName" label="所属科室" min-width="140" />
            <el-table-column prop="phone" label="手机号" min-width="140" />
            <el-table-column prop="status" label="状态" min-width="100" />
          </el-table>

          <div class="list-footer">当前共 {{ totalDoctors }} 条医生记录</div>
        </div>
      </div>
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.notice {
  margin-top: 20px;
}

.sub-title {
  margin: 0 0 14px;
  font-size: 20px;
  font-weight: 800;
}

.toolbar {
  display: grid;
  gap: 14px;
}

.toolbar-inputs {
  display: flex;
  gap: 12px;
}

.table-block,
.list-footer {
  margin-top: 14px;
}

.list-footer {
  color: var(--text-secondary);
}

@media (max-width: 1100px) {
  .split-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-inputs {
    flex-direction: column;
  }
}
</style>
