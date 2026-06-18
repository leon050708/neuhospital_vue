<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const ctEntryPath = computed(() => {
  return route.meta?.preview ? '/preview/doctor/ct-analysis' : '/workspace/doctor/ct-analysis'
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card feature-hero">
      <div>
        <div class="status-chip">Doctor Workspace</div>
        <h2 class="section-title">医生端骨架</h2>
        <p class="section-desc">
          这里适合继续接待诊列表、病历编辑、AI 病历摘要、影像分析结果和辅助诊断建议。
        </p>
      </div>
      <div class="hero-badge">DOCTOR</div>
    </article>

    <div class="card-grid">
      <article class="glass-card task-card">
        <h3>优先接入</h3>
        <p>待诊队列、门诊病历、AI 摘要、影像上传与结果查看。</p>
      </article>
      <article class="glass-card task-card">
        <h3>接口范围</h3>
        <p>后续可衔接 `outpatient`、`inspection`、`image`、`ai` 等业务模块。</p>
      </article>
      <article class="glass-card task-card">
        <h3>权限控制</h3>
        <p>当前页面仅允许 `userType = DOCTOR` 访问，后续可细分角色权限。</p>
      </article>
    </div>

    <article class="glass-card ct-entry-card">
      <div>
        <div class="hud-label">Imaging Module</div>
        <h3>CT 智能分析工作区</h3>
        <p>
          已接入医生端 CT 分析页面入口，可输入已上传的 `ctImageFileId` 发起分析任务，
          并轮询查看模型输出、风险等级与医生确认状态。
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
