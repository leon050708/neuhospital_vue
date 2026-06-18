<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const ctEntryPath = computed(() => {
  return route.meta?.preview ? '/preview/doctor/ct-analysis' : '/workspace/doctor/ct-analysis'
})

const doctorLinks = computed(() => {
  const prefix = route.meta?.preview ? '/preview/doctor' : '/workspace/doctor'

  return [
    {
      title: '接诊队列',
      desc: '待诊患者列表、叫号、跳过、接诊完成和当日候诊状态流转。',
      path: `${prefix}/queue`,
      action: '查看候诊队列'
    },
    {
      title: '病历与处置',
      desc: '病历录入、诊断结果、检查申请、检验申请、处方开立与复诊建议。',
      path: `${prefix}/records`,
      action: '进入病历诊断'
    },
    {
      title: '检查与处方',
      desc: '检查申请单、检验申请单和处方开立可在详细页内继续扩展。',
      path: `${prefix}/orders`,
      action: '查看检查处方'
    }
  ]
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card feature-hero">
      <div>
        <div class="status-chip">Doctor Workspace</div>
        <h2 class="section-title">医生工作站</h2>
        <p class="section-desc">
          医生端当前重点是候诊处理、病历诊断、处方检查申请和 CT 影像智能分析，
          首页先把这些核心模块集中出来方便继续往下接接口。
        </p>
      </div>
      <div class="hero-badge">DOCTOR</div>
    </article>

    <div class="card-grid">
      <article v-for="item in doctorLinks" :key="item.title" class="glass-card task-card">
        <h3>{{ item.title }}</h3>
        <p>{{ item.desc }}</p>
        <el-button text type="primary" @click="router.push(item.path)">
          {{ item.action }}
        </el-button>
      </article>
    </div>

    <article class="glass-card ct-entry-card">
      <div>
        <div class="hud-label">Imaging Module</div>
        <h3>CT 智能分析工作区</h3>
        <p>
          现在已经按目录上传链路接入 MinIO 文件接口。医生可直接上传 CT 病例目录，
          前端会先生成目录型 `file_record`，再用返回的 `fileId` 发起分析任务。
        </p>
      </div>
      <el-button type="primary" round @click="router.push(ctEntryPath)">
        进入 CT 分析
      </el-button>
    </article>
  </section>
</template>

<style scoped>
.feature-hero,
.task-card,
.ct-entry-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.feature-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.hero-badge {
  display: grid;
  width: 132px;
  place-items: center;
  border-radius: 4px;
  background: linear-gradient(135deg, #7db6dc 0%, #87d0e5 100%);
  color: #fff;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.task-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.task-card p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.task-card :deep(.el-button) {
  margin-top: 16px;
  padding-left: 0;
  font-weight: 700;
}

.ct-entry-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.ct-entry-card h3 {
  margin: 14px 0 0;
  font-size: 24px;
  font-weight: 900;
}

.ct-entry-card p {
  max-width: 760px;
  margin: 12px 0 0;
  color: var(--text-secondary);
  line-height: 1.8;
}

@media (max-width: 980px) {
  .feature-hero,
  .card-grid {
    grid-template-columns: 1fr;
  }

  .feature-hero,
  .ct-entry-card {
    flex-direction: column;
  }

  .hero-badge {
    width: 100%;
    height: 88px;
  }
}
</style>
