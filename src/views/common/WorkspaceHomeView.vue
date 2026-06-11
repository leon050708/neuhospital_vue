<script setup>
import { computed } from 'vue'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const quickLinks = computed(() => {
  const items = [
    {
      title: '认证中心',
      desc: '统一登录、刷新 token、退出登录已接好。',
      highlight: '/api/auth/*'
    }
  ]

  if (authStore.userType === 'PATIENT') {
    items.push({
      title: '患者入口',
      desc: '后续可接挂号、问诊、缴费、报告查看。',
      highlight: '/workspace/patient'
    })
  }

  if (authStore.userType === 'DOCTOR') {
    items.push({
      title: '医生入口',
      desc: '后续可接待诊队列、病历、AI 摘要、影像结果。',
      highlight: '/workspace/doctor'
    })
  }

  if (authStore.userType === 'MANAGEMENT') {
    items.push({
      title: '管理入口',
      desc: '后续可接角色、菜单、字典、日志和系统治理。',
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
        <h2 class="section-title">前端项目基础层已经成型</h2>
        <p class="section-desc">
          现在这个项目已经具备统一登录、三端路由分发、布局骨架、接口请求层和流式问诊预留能力，
          可以继续往具体业务模块平滑扩展。
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
