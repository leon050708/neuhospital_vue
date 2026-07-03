<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const fallbackPath = computed(() => {
  if (authStore.userType === 'PATIENT') {
    return '/workspace/patient/profile'
  }

  if (authStore.userType === 'DOCTOR') {
    return '/workspace/doctor/queue'
  }

  if (authStore.userType === 'MANAGEMENT' || authStore.userType === 'ADMIN') {
    return '/workspace/management/departments'
  }

  return '/login'
})
</script>

<template>
  <section class="state-page glass-card">
    <div class="state-code">404</div>
    <h1>页面不存在</h1>
    <p>这个地址暂时没有对应页面，可以先回到当前身份的业务入口继续使用。</p>
    <div class="actions">
      <el-button round type="primary" @click="router.push(fallbackPath)">返回业务页</el-button>
    </div>
  </section>
</template>

<style scoped>
.state-page {
  max-width: 720px;
  margin: 80px auto;
  padding: 42px;
  border-radius: 32px;
  text-align: center;
}

.state-code {
  color: #1d4ed8;
  font-size: 72px;
  font-weight: 800;
  letter-spacing: -0.05em;
}

h1 {
  margin: 12px 0;
  font-size: 28px;
}

p {
  color: var(--text-secondary);
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}
</style>
