<script setup>
import { computed } from 'vue'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const quickLinks = computed(() => {
  const items = [
    {
      title: '当前身份',
      desc: '登录后会先读取 `/api/auth/me`，再按患者、医生、管理端自动进入对应工作区。',
      highlight: authStore.userType || 'UNKNOWN'
    }
  ]

  if (authStore.userType === 'PATIENT') {
    items.push({
      title: '患者业务',
      desc: '优先接个人资料、科室医生查询、排班挂号、待支付订单和 AI 问诊。',
      highlight: '/workspace/patient'
    })
  }

  if (authStore.userType === 'DOCTOR') {
    items.push({
      title: '医生业务',
      desc: '优先接候诊队列、病历录入、诊断建议、检查申请、处方和 CT 分析。',
      highlight: '/workspace/doctor'
    })
  }

  if (authStore.userType === 'MANAGEMENT') {
    items.push({
      title: '管理业务',
      desc: '优先接科室、医生、排班、患者、药品库存和文件管理。',
      highlight: '/workspace/management'
    })
  }

  return items
})
</script>

<template>
  <section class="content-grid">
    <article class="overview-card glass-card">
      <div>
        <div class="status-chip">当前登录成功</div>
        <h2 class="section-title">三端工作区已接入当前认证体系</h2>
        <p class="section-desc">
          这里作为登录后的总入口，负责承接不同身份的核心工作流。你现在可以继续把各端首页、
          列表页、表单页和 CT 分析流程逐步补齐到真实业务闭环。
        </p>
      </div>
      <div class="identity-card">
        <span>当前用户</span>
        <strong>{{ authStore.profile?.username || '--' }}</strong>
        <small>{{ authStore.userType || '--' }} / {{ authStore.role || '--' }}</small>
      </div>
    </article>

    <div class="card-grid">
      <article v-for="item in quickLinks" :key="item.title" class="feature-card glass-card">
        <h3>{{ item.title }}</h3>
        <p>{{ item.desc }}</p>
        <code>{{ item.highlight }}</code>
      </article>
    </div>
  </section>
</template>

<style scoped>
.overview-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  border-radius: var(--radius-lg);
}

.identity-card {
  min-width: 220px;
  padding: 20px;
  border-radius: 6px;
  background: linear-gradient(145deg, rgba(118, 189, 224, 0.92) 0%, rgba(111, 200, 184, 0.82) 100%);
  color: #f7fcff;
}

.identity-card span,
.identity-card small {
  display: block;
}

.identity-card strong {
  display: block;
  margin: 12px 0 10px;
  font-size: 26px;
  font-weight: 800;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.feature-card {
  padding: 22px;
  border-radius: 6px;
}

.feature-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
}

.feature-card p {
  margin: 12px 0 16px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.feature-card code {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
}

@media (max-width: 980px) {
  .overview-card,
  .card-grid {
    grid-template-columns: 1fr;
  }

  .overview-card {
    flex-direction: column;
  }
}
</style>
