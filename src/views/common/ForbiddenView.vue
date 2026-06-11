<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="state-page glass-card">
    <div class="state-code">403</div>
    <h1>当前账号没有访问这个页面的权限</h1>
    <p>可以返回工作台，或者重新登录后切换到正确的用户端。</p>
    <div class="actions">
      <el-button round @click="router.push('/workspace/home')">返回工作台</el-button>
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
