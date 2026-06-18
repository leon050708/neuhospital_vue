<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getOutpatientRecordDetail, getOutpatientRecordPage } from '@/api/outpatientRecords'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const doctorId = computed(() => authStore.profile?.bizId)

const loading = ref(false)
const detailLoading = ref(false)
const records = ref([])
const total = ref(0)
const selectedRecord = ref(null)

const query = reactive({
  pageNo: 1,
  pageSize: 10
})

async function loadRecords() {
  if (isPreview.value || !doctorId.value) {
    return
  }

  loading.value = true

  try {
    const response = await getOutpatientRecordPage({
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      doctorId: doctorId.value
    })

    const pageData = response.data || {}
    records.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载病历列表失败')
  } finally {
    loading.value = false
  }
}

async function loadRecordDetail(recordId) {
  detailLoading.value = true

  try {
    const response = await getOutpatientRecordDetail(recordId)
    selectedRecord.value = response.data || null
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载病历详情失败')
  } finally {
    detailLoading.value = false
  }
}

onMounted(loadRecords)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Medical Record</div>
      <h2 class="section-title">病历诊断</h2>
      <p class="section-desc">当前页面只读取真实门诊病历分页与详情接口。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实病历接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!doctorId"
        title="当前登录信息里没有 doctor bizId，暂时无法查询医生病历"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <el-table
          :data="records"
          v-loading="loading"
          class="table-block"
          empty-text="当前医生没有查询到病历记录"
        >
          <el-table-column prop="id" label="病历 ID" min-width="110" />
          <el-table-column prop="recordNo" label="病历编号" min-width="180" />
          <el-table-column prop="patientId" label="患者 ID" min-width="110" />
          <el-table-column prop="registrationId" label="挂号 ID" min-width="120" />
          <el-table-column prop="preliminaryDiagnosis" label="初步诊断" min-width="220" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" min-width="100" />
          <el-table-column label="操作" min-width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="loadRecordDetail(row.id)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="list-footer">当前共 {{ total }} 条病历记录</div>

        <el-skeleton v-if="detailLoading" :rows="5" animated class="detail-block" />

        <el-descriptions
          v-else-if="selectedRecord"
          :column="2"
          border
          class="detail-block"
        >
          <el-descriptions-item label="病历编号">{{ selectedRecord.recordNo || '--' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ selectedRecord.status || '--' }}</el-descriptions-item>
          <el-descriptions-item label="主诉">{{ selectedRecord.chiefComplaint || '--' }}</el-descriptions-item>
          <el-descriptions-item label="现病史">{{ selectedRecord.presentIllness || '--' }}</el-descriptions-item>
          <el-descriptions-item label="既往史">{{ selectedRecord.pastHistory || '--' }}</el-descriptions-item>
          <el-descriptions-item label="过敏史">{{ selectedRecord.allergyHistory || '--' }}</el-descriptions-item>
          <el-descriptions-item label="体格检查">{{ selectedRecord.physicalExam || '--' }}</el-descriptions-item>
          <el-descriptions-item label="初步诊断">{{ selectedRecord.preliminaryDiagnosis || '--' }}</el-descriptions-item>
          <el-descriptions-item label="最终诊断">{{ selectedRecord.finalDiagnosis || '--' }}</el-descriptions-item>
          <el-descriptions-item label="医嘱建议">{{ selectedRecord.advice || '--' }}</el-descriptions-item>
        </el-descriptions>
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
.list-footer,
.detail-block {
  margin-top: 20px;
}

.list-footer {
  color: var(--text-secondary);
}
</style>
