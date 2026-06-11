<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const formRef = ref()

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

function resolveHomeByUserType(userType) {
  if (userType === 'PATIENT') {
    return '/workspace/patient'
  }

  if (userType === 'DOCTOR') {
    return '/workspace/doctor'
  }

  if (userType === 'MANAGEMENT') {
    return '/workspace/management'
  }

  return '/workspace/home'
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  loading.value = true

  try {
    const payload = await authStore.login(form)
    ElMessage.success('登录成功')
    router.push(route.query.redirect || resolveHomeByUserType(payload.userType))
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '登录失败，请检查账号密码')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page page-shell">
    <div class="login-grid"></div>
    <div class="login-orbit login-orbit-left"></div>
    <div class="login-orbit login-orbit-right"></div>

    <section class="hero-panel">
      <div class="hero-copy">
        <div class="hud-label">Arknetic Medical Interface</div>
        <h1>智慧云脑诊疗平台前端骨架</h1>
        <p>
          当前已接入统一登录入口、三端路由骨架、权限守卫、token 刷新预留、SSE 工具和业务布局。
          视觉上以淡灰底、天蓝冷光和青绿色状态色为主，便于继续扩展出更完整的医院平台界面。
        </p>
      </div>

      <div class="hero-metrics">
        <article class="metric-card glass-card">
          <span>01 / Unified Auth</span>
          <strong>JWT + Refresh</strong>
        </article>
        <article class="metric-card glass-card">
          <span>02 / Portal Modes</span>
          <strong>Patient / Doctor / Management</strong>
        </article>
        <article class="metric-card glass-card">
          <span>03 / Stream Layer</span>
          <strong>SSE Ready</strong>
        </article>
      </div>
    </section>

    <section class="login-panel glass-card">
      <div class="panel-corner panel-corner-left"></div>
      <div class="panel-corner panel-corner-right"></div>
      <div class="login-head">
        <div class="hud-label">Portal Sign In</div>
        <h2>登录系统</h2>
        <p>输入后端账号密码后，系统会根据 `userType` 自动进入对应业务端。</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="例如 doctor001 / admin001" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button
          class="login-button"
          type="primary"
          size="large"
          :loading="loading"
          @click="handleLogin"
        >
          进入平台
        </el-button>
      </el-form>

      <div class="login-tips">
        <span>已对接接口：</span>
        <code>/api/auth/login</code>
        <code>/api/auth/refresh</code>
        <code>/api/auth/logout</code>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 440px);
  gap: 28px;
  align-items: center;
  padding: 40px;
  overflow: hidden;
}

.login-grid,
.login-orbit {
  position: absolute;
  pointer-events: none;
}

.login-grid {
  inset: 34px;
  border: 1px solid rgba(118, 140, 152, 0.12);
  background:
    linear-gradient(90deg, transparent 0, transparent calc(100% - 1px), rgba(125, 151, 164, 0.14) calc(100% - 1px)),
    linear-gradient(0deg, transparent 0, transparent calc(100% - 1px), rgba(125, 151, 164, 0.14) calc(100% - 1px));
  background-size: 72px 72px;
  opacity: 0.65;
}

.login-orbit {
  border-radius: 50%;
  filter: blur(6px);
}

.login-orbit-left {
  top: -120px;
  left: -60px;
  width: 320px;
  height: 320px;
  border: 1px solid rgba(121, 189, 224, 0.35);
}

.login-orbit-right {
  right: 120px;
  bottom: -150px;
  width: 420px;
  height: 420px;
  border: 1px solid rgba(111, 200, 184, 0.22);
}

.hero-panel {
  position: relative;
  z-index: 1;
  padding: 54px 10px 54px 20px;
}

.hero-copy h1 {
  max-width: 10ch;
  margin: 18px 0 18px;
  font-size: clamp(38px, 5vw, 66px);
  line-height: 0.98;
  letter-spacing: -0.06em;
  font-weight: 900;
}

.hero-copy p {
  max-width: 680px;
  color: var(--text-secondary);
  line-height: 1.9;
  font-size: 16px;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 28px;
}

.metric-card {
  position: relative;
  padding: 20px;
  border-radius: 6px;
}

.metric-card span {
  display: block;
  color: var(--text-muted);
  font-family: 'Barlow', sans-serif;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.metric-card strong {
  display: block;
  margin-top: 14px;
  font-size: 19px;
  font-weight: 800;
}

.login-panel {
  position: relative;
  z-index: 1;
  padding: 30px;
  border-radius: 6px;
  background:
    linear-gradient(180deg, rgba(251, 253, 254, 0.94) 0%, rgba(241, 246, 248, 0.88) 100%);
}

.panel-corner {
  position: absolute;
  width: 46px;
  height: 46px;
  border-color: rgba(114, 182, 208, 0.48);
  border-style: solid;
  content: '';
}

.panel-corner-left {
  top: 16px;
  left: 16px;
  border-width: 1px 0 0 1px;
}

.panel-corner-right {
  right: 16px;
  bottom: 16px;
  border-width: 0 1px 1px 0;
}

.login-head h2 {
  margin: 16px 0 8px;
  font-size: 30px;
  font-weight: 900;
}

.login-head p {
  margin: 0 0 24px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.login-button {
  width: 100%;
  margin-top: 12px;
}

.login-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

.login-tips code {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(118, 189, 224, 0.12);
  color: #477893;
}

@media (max-width: 980px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .hero-panel {
    padding: 10px 0 0;
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .login-grid {
    inset: 20px;
  }
}
</style>
