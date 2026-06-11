<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="state-page glass-card">
    <div class="state-code">404</div>
    <h1>页面不存在</h1>
    <p>这个地址还没有接入到当前项目骨架里，可以先回到工作台继续开发。</p>
    <div class="actions">
      <el-button round type="primary" @click="router.push('/workspace/home')">返回工作台</el-button>
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
