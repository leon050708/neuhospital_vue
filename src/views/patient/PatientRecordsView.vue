<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import {
  getOutpatientRecordDetail,
  getOutpatientRecordDiagnoses,
  getOutpatientRecordPage
} from '@/api/outpatientRecords'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const patientId = computed(() => authStore.profile?.bizId)

const loading = ref(false)
const detailLoading = ref(false)
const records = ref([])
const total = ref(0)
const selectedRecord = ref(null)
const diagnoses = ref([])
const activeRecordId = ref('')

const query = reactive({
  pageNo: 1,
  pageSize: 10
})

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function getStatusTagType(status) {
  return status === 'CONFIRMED' ? 'success' : 'warning'
}

function getStatusLabel(status) {
  const map = {
    DRAFT: '草稿',
    CONFIRMED: '已确认'
  }

  return map[status] || status || '--'
}

function getDiagnosisTypeLabel(type) {
  const map = {
    MAIN: '主诊断',
    SECONDARY: '次诊断'
  }

  return map[type] || type || '--'
}

async function loadRecords() {
  if (isPreview.value || !patientId.value) {
    return
  }

  loading.value = true

  try {
    const response = await getOutpatientRecordPage({
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      patientId: patientId.value
    })
    const pageData = unwrapResult(response, '加载病例列表失败') || {}
    records.value = pageData.records || []
    total.value = pageData.total || 0

    if (!records.value.length) {
      activeRecordId.value = ''
      selectedRecord.value = null
      diagnoses.value = []
      return
    }

    const matchedRecord = records.value.find((item) => String(item.id) === activeRecordId.value) || records.value[0]
    await loadRecordDetail(matchedRecord.id, { silent: true })
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载病例列表失败'))
  } finally {
    loading.value = false
  }
}

async function loadRecordDetail(recordId, { silent = false } = {}) {
  if (!recordId) {
    return
  }

  if (!silent) {
    detailLoading.value = true
  }

  try {
    const [detailResponse, diagnosesResponse] = await Promise.all([
      getOutpatientRecordDetail(recordId),
      getOutpatientRecordDiagnoses(recordId).catch(() => null)
    ])

    const detail = unwrapResult(detailResponse, '加载病例详情失败') || null
    const diagnosesData = diagnosesResponse ? (unwrapResult(diagnosesResponse, '加载诊断明细失败') || []) : []

    selectedRecord.value = detail
    diagnoses.value = Array.isArray(diagnosesData) && diagnosesData.length
      ? diagnosesData
      : (detail?.diagnoses || [])
    activeRecordId.value = detail?.id ? String(detail.id) : ''
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载病例详情失败'))
  } finally {
    if (!silent) {
      detailLoading.value = false
    }
  }
}

watch(() => query.pageNo, loadRecords)

onMounted(loadRecords)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Medical Records</div>
      <h2 class="section-title">我的病例</h2>
      <p class="section-desc">这里读取门诊病历分页、病历详情和诊断明细接口，供患者查看历次就诊记录。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实病历接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!patientId"
        title="当前登录信息里没有 patient bizId，暂时无法查询病例"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <div class="records-layout">
          <div class="records-table">
            <el-table
              :data="records"
              v-loading="loading"
              class="table-block"
              empty-text="当前没有病例记录"
              highlight-current-row
              @current-change="(row) => row && loadRecordDetail(row.id)"
            >
              <el-table-column prop="recordNo" label="病历编号" min-width="180" />
              <el-table-column prop="registrationId" label="挂号 ID" min-width="110" />
              <el-table-column prop="doctorId" label="医生 ID" min-width="110" />
              <el-table-column prop="createdAt" label="就诊时间" min-width="180" />
              <el-table-column label="状态" min-width="110">
                <template #default="{ row }">
                  <el-tag :type="getStatusTagType(row.status)" effect="light">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="100" fixed="right">
                <template #default="{ row }">
                  <el-button text type="primary" @click="loadRecordDetail(row.id)">
                    查看
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="list-footer">当前共 {{ total }} 条病例记录</div>

            <el-pagination
              v-if="total > query.pageSize"
              v-model:current-page="query.pageNo"
              :page-size="query.pageSize"
              :total="total"
              layout="prev, pager, next"
              class="table-pagination"
            />
          </div>

          <div class="record-detail glass-subcard" v-loading="detailLoading">
            <h3>病例详情</h3>

            <el-empty v-if="!selectedRecord" description="请选择一条病例查看详情" />

            <template v-else>
              <el-descriptions :column="2" border class="detail-board">
                <el-descriptions-item label="病历编号">{{ selectedRecord.recordNo || '--' }}</el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="getStatusTagType(selectedRecord.status)" effect="light">
                    {{ getStatusLabel(selectedRecord.status) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="患者 ID">{{ selectedRecord.patientId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="医生 ID">{{ selectedRecord.doctorId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="科室 ID">{{ selectedRecord.departmentId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="挂号 ID">{{ selectedRecord.registrationId || '--' }}</el-descriptions-item>
                <el-descriptions-item label="创建时间">{{ selectedRecord.createdAt || '--' }}</el-descriptions-item>
                <el-descriptions-item label="确认时间">{{ selectedRecord.confirmedAt || '--' }}</el-descriptions-item>
                <el-descriptions-item label="主诉">{{ selectedRecord.chiefComplaint || '--' }}</el-descriptions-item>
                <el-descriptions-item label="现病史">{{ selectedRecord.presentIllness || '--' }}</el-descriptions-item>
                <el-descriptions-item label="既往史">{{ selectedRecord.pastHistory || '--' }}</el-descriptions-item>
                <el-descriptions-item label="过敏史">{{ selectedRecord.allergyHistory || '--' }}</el-descriptions-item>
                <el-descriptions-item label="体格检查">{{ selectedRecord.physicalExam || '--' }}</el-descriptions-item>
                <el-descriptions-item label="初步诊断">{{ selectedRecord.preliminaryDiagnosis || '--' }}</el-descriptions-item>
                <el-descriptions-item label="最终诊断">{{ selectedRecord.finalDiagnosis || '--' }}</el-descriptions-item>
                <el-descriptions-item label="医嘱">{{ selectedRecord.advice || '--' }}</el-descriptions-item>
              </el-descriptions>

              <div class="diagnosis-block">
                <div class="subsection-title">诊断明细</div>
                <el-table :data="diagnoses" empty-text="当前没有诊断明细">
                  <el-table-column prop="diseaseCode" label="疾病编码" min-width="120" />
                  <el-table-column prop="diseaseName" label="疾病名称" min-width="150" />
                  <el-table-column label="诊断类型" min-width="120">
                    <template #default="{ row }">
                      {{ getDiagnosisTypeLabel(row.diagnosisType) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="疑似" min-width="90">
                    <template #default="{ row }">
                      {{ row.suspectedFlag ? '是' : '否' }}
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </template>
          </div>
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

.notice {
  margin-top: 20px;
}

.records-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 20px;
  margin-top: 20px;
}

.records-table,
.record-detail {
  min-width: 0;
}

.glass-subcard {
  padding: 20px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.record-detail h3,
.subsection-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 800;
}

.list-footer {
  margin-top: 14px;
  color: var(--text-muted);
}

.table-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}

.diagnosis-block {
  margin-top: 20px;
}

@media (max-width: 1180px) {
  .records-layout {
    grid-template-columns: 1fr;
  }
}
</style>
