<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getRegistrationsPage } from '@/api/registrations'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const isPreview = computed(() => Boolean(route.meta?.preview))

const loading = ref(false)
const registrations = ref([])
const total = ref(0)

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: ''
})

function getPatientName(row) {
  return row?.patientName || row?.realName || row?.name || '--'
}

function getDoctorName(row) {
  return row?.doctorName || row?.doctorRealName || '--'
}

function getVisitTime(row) {
  return row?.visitTime || row?.visitDate || row?.registeredAt || row?.createdAt || '--'
}

async function loadRegistrations() {
  if (isPreview.value) {
    return
  }

  loading.value = true

  try {
    const response = await getRegistrationsPage({
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined
    })

    const pageData = unwrapResult(response, '加载挂号记录失败') || {}
    registrations.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '加载挂号记录失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadRegistrations)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实挂号接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <div class="toolbar">
          <el-input
            v-model="query.keyword"
            placeholder="搜索病人或医生"
            clearable
            @keyup.enter="loadRegistrations"
          />
          <el-button round @click="loadRegistrations">查询</el-button>
        </div>

        <el-table
          :data="registrations"
          v-loading="loading"
          class="table-block"
          empty-text="没有查询到挂号记录"
        >
          <el-table-column label="病人名字" min-width="140">
            <template #default="{ row }">
              {{ getPatientName(row) }}
            </template>
          </el-table-column>
          <el-table-column label="医生" min-width="140">
            <template #default="{ row }">
              {{ getDoctorName(row) }}
            </template>
          </el-table-column>
          <el-table-column label="时间" min-width="180">
            <template #default="{ row }">
              {{ getVisitTime(row) }}
            </template>
          </el-table-column>
          <el-table-column prop="registrationNo" label="挂号单号" min-width="180" />
          <el-table-column prop="status" label="状态" min-width="120" />
        </el-table>

        <div class="list-footer">当前共 {{ total }} 条挂号记录</div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.toolbar {
  display: flex;
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
  .toolbar {
    flex-direction: column;
  }
}
</style>
