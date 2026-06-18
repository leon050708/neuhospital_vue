<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getPatientPage } from '@/api/patients'

const route = useRoute()
const isPreview = computed(() => Boolean(route.meta?.preview))
const loading = ref(false)
const patients = ref([])
const total = ref(0)

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: ''
})

async function loadPatients() {
  if (isPreview.value) {
    return
  }

  loading.value = true

  try {
    const response = await getPatientPage({
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined
    })

    const pageData = response.data || {}
    patients.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载患者分页失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadPatients)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Patients</div>
      <h2 class="section-title">患者挂号管理</h2>
      <p class="section-desc">
        当前 API 里有真实患者分页接口，但还没有挂号列表和取消挂号接口，所以这里先展示患者台账。
      </p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实患者接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
      <div class="toolbar">
        <el-input v-model="query.keyword" placeholder="搜索患者姓名/手机号/证件信息" clearable @keyup.enter="loadPatients" />
        <el-button round @click="loadPatients">查询</el-button>
      </div>

      <el-table
        :data="patients"
        v-loading="loading"
        class="table-block"
        empty-text="没有查询到患者数据"
      >
        <el-table-column prop="patientNo" label="患者编号" min-width="170" />
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column prop="gender" label="性别" min-width="100" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="idCard" label="身份证号" min-width="200" show-overflow-tooltip />
        <el-table-column prop="bloodType" label="血型" min-width="100" />
        <el-table-column prop="status" label="状态" min-width="100" />
      </el-table>

      <div class="list-footer">当前共 {{ total }} 条患者记录</div>
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
