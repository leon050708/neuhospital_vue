<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getPatientDetail } from '@/api/patients'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const patient = ref(null)

const isPreview = computed(() => Boolean(route.meta?.preview))
const patientId = computed(() => authStore.profile?.bizId || authStore.profile?.patientId || authStore.profile?.id)

async function loadPatientDetail() {
  if (isPreview.value) {
    return
  }

  if (!patientId.value && authStore.isAuthenticated) {
    try {
      await authStore.ensureProfile()
    } catch (error) {
      ElMessage.error(error.message || '加载当前登录信息失败')
      return
    }
  }

  if (!patientId.value) {
    return
  }

  loading.value = true

  try {
    const response = await getPatientDetail(patientId.value)
    patient.value = unwrapResult(response, '加载患者档案失败') || null
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '加载患者档案失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadPatientDetail)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Patient Profile</div>
      <h2 class="section-title">患者档案</h2>
      <p class="section-desc">当前页面只读取真实患者档案接口，不展示任何预置示例数据。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实患者档案接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!patientId"
        title="当前登录信息里没有可用的患者标识，暂时无法查询患者档案"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-skeleton v-else-if="loading" :rows="6" animated />

      <el-empty
        v-else-if="!patient"
        description="未查询到患者档案"
      />

      <el-descriptions
        v-else
        :column="2"
        border
        class="detail-board"
      >
        <el-descriptions-item label="患者 ID">{{ patient.id || '--' }}</el-descriptions-item>
        <el-descriptions-item label="患者编号">{{ patient.patientNo || '--' }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ patient.name || '--' }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ patient.gender || '--' }}</el-descriptions-item>
        <el-descriptions-item label="出生日期">{{ patient.birthDate || '--' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ patient.phone || '--' }}</el-descriptions-item>
        <el-descriptions-item label="身份证号">{{ patient.idCard || '--' }}</el-descriptions-item>
        <el-descriptions-item label="血型">{{ patient.bloodType || '--' }}</el-descriptions-item>
        <el-descriptions-item label="过敏史">{{ patient.allergySummary || '--' }}</el-descriptions-item>
        <el-descriptions-item label="既往史">{{ patient.historySummary || '--' }}</el-descriptions-item>
        <el-descriptions-item label="紧急联系人">{{ patient.emergencyContact || '--' }}</el-descriptions-item>
        <el-descriptions-item label="联系人电话">{{ patient.emergencyPhone || '--' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ patient.status || '--' }}</el-descriptions-item>
      </el-descriptions>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.notice,
.detail-board {
  margin-top: 20px;
}
</style>
