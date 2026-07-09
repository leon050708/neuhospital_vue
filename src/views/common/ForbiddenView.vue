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

  if (authStore.userType === 'PHARMACIST' || authStore.userType === 'PHARMACY') {
    return '/workspace/pharmacy/drugs'
  }

  if (authStore.userType === 'MANAGEMENT' || authStore.userType === 'ADMIN') {
    return '/workspace/management/departments'
  }

  return '/login'
})
</script>

<template>
  <section class="state-page glass-card">
    <div class="state-code">403</div>
    <h1>当前账号没有访问这个页面的权限</h1>
    <p>可以返回当前身份可访问的业务页，或者重新登录后切换到正确的用户端。</p>
    <div class="actions">
      <el-button round @click="router.push(fallbackPath)">返回业务页</el-button>
      <el-button round type="primary" @click="router.push('/login')">返回登录</el-button>
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
  color: #b45309;
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
