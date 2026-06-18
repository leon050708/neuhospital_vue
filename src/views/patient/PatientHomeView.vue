<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const patientLinks = computed(() => {
  const prefix = route.meta?.preview ? '/preview/patient' : '/workspace/patient'

  return [
    {
      title: '账户与资料',
      desc: '患者注册、登录后个人信息展示、实名认证资料和就诊基本档案。',
      path: `${prefix}/profile`,
      action: '查看患者档案'
    },
    {
      title: '挂号与订单',
      desc: '科室查询、医生列表、排班选择、快速挂号、我的挂号、取消与签到。',
      path: `${prefix}/registration`,
      action: '进入挂号排班'
    },
    {
      title: '支付与问诊',
      desc: '待支付清单、支付结果查看，以及 AI 问诊入口和历史对话记录。',
      path: `${prefix}/orders`,
      action: '查看订单中心'
    }
  ]
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card feature-hero">
      <div>
        <div class="status-chip">Patient Portal</div>
        <h2 class="section-title">患者服务中心</h2>
        <p class="section-desc">
          患者端现在按注册、挂号、订单支付、个人资料和 AI 问诊这几条链路组织，
          风格继续沿用当前淡灰、天蓝、青绿色的整体界面体系。
        </p>
      </div>
      <div class="hero-badge">PATIENT</div>
    </article>

    <div class="card-grid">
      <article v-for="item in patientLinks" :key="item.title" class="glass-card task-card">
        <h3>{{ item.title }}</h3>
        <p>{{ item.desc }}</p>
        <el-button text type="primary" @click="router.push(item.path)">
          {{ item.action }}
        </el-button>
      </article>
      <article class="glass-card task-card consult-card">
        <h3>AI 问诊</h3>
        <p>症状引导、对话记录、推荐科室与风险提醒，适合后续接会话与流式问答接口。</p>
        <el-button text type="primary" @click="router.push(`${route.meta?.preview ? '/preview/patient' : '/workspace/patient'}/consult`)">
          进入 AI 问诊
        </el-button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.feature-hero,
.task-card {
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
  background: linear-gradient(135deg, #78c6b7 0%, #8bd7ca 100%);
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

.consult-card {
  grid-column: 1 / -1;
}

@media (max-width: 980px) {
  .feature-hero,
  .card-grid {
    grid-template-columns: 1fr;
  }

  .feature-hero {
    flex-direction: column;
  }

  .hero-badge {
    width: 100%;
    height: 88px;
  }
}
</style>
