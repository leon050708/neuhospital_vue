<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const loginFormRef = ref()
const registerFormRef = ref()
const activePanel = ref('login')

const previewLinks = [
  {
    label: '患者端',
    path: '/preview/patient',
    desc: '直接看患者视图效果'
  },
  {
    label: '医生端',
    path: '/preview/doctor',
    desc: '直接看医生工作站'
  },
  {
    label: '管理端',
    path: '/preview/management',
    desc: '直接看管理后台样式'
  }
]

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  realName: '',
  phone: '',
  idCard: '',
  gender: 'MALE'
})

const loginRules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const registerRules = {
  username: [
    { required: true, message: '请输入注册账号', trigger: 'blur' },
    { min: 4, message: '账号至少 4 位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
          return
        }

        callback()
      },
      trigger: 'blur'
    }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
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
  const valid = await loginFormRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  loading.value = true

  try {
    const payload = await authStore.login(loginForm)
    ElMessage.success('登录成功')
    router.push(route.query.redirect || resolveHomeByUserType(payload.userType))
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '登录失败，请检查账号密码')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const valid = await registerFormRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  loading.value = true

  try {
    await authStore.register({
      username: registerForm.username,
      password: registerForm.password,
      realName: registerForm.realName,
      phone: registerForm.phone,
      idCard: registerForm.idCard,
      gender: registerForm.gender
    })

    loginForm.username = registerForm.username
    loginForm.password = registerForm.password

    registerForm.confirmPassword = ''
    registerForm.realName = ''
    registerForm.phone = ''
    registerForm.idCard = ''
    registerForm.gender = 'MALE'

    ElMessage.success('注册成功，请直接登录')
    activePanel.value = 'login'
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败，请检查填写内容')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page page-shell">
    <aside class="preview-menu glass-card">
      <div class="preview-menu-head">
        <div class="hud-label">Temp Portal</div>
        <p>还没有用户时，先从这里进入三端界面。</p>
      </div>

      <button
        v-for="item in previewLinks"
        :key="item.path"
        class="preview-entry"
        @click="router.push(item.path)"
      >
        <strong>{{ item.label }}</strong>
        <span>{{ item.desc }}</span>
      </button>
    </aside>

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
        <div class="hud-label">{{ activePanel === 'login' ? 'Portal Sign In' : 'Patient Register' }}</div>
        <h2>{{ activePanel === 'login' ? '登录系统' : '患者注册' }}</h2>
        <p>
          {{
            activePanel === 'login'
              ? '输入后端账号密码后，系统会根据 `userType` 自动进入对应业务端。'
              : '按最新 API.md，患者可以自主注册账号，注册成功后再进入登录。'
          }}
        </p>
      </div>

      <div class="panel-switch">
        <button
          class="switch-button"
          :class="{ 'is-active': activePanel === 'login' }"
          @click="activePanel = 'login'"
        >
          登录
        </button>
        <button
          class="switch-button"
          :class="{ 'is-active': activePanel === 'register' }"
          @click="activePanel = 'register'"
        >
          注册
        </button>
      </div>

      <el-form
        v-if="activePanel === 'login'"
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-position="top"
      >
        <el-form-item label="账号" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="例如 doctor001 / admin001"
            size="large"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
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

      <el-form
        v-else
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-position="top"
      >
        <div class="register-grid">
          <el-form-item label="注册账号" prop="username">
            <el-input v-model="registerForm.username" placeholder="请输入注册账号" size="large" />
          </el-form-item>
          <el-form-item label="真实姓名" prop="realName">
            <el-input v-model="registerForm.realName" placeholder="请输入真实姓名" size="large" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="registerForm.password"
              placeholder="请输入密码"
              size="large"
              show-password
            />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              placeholder="请再次输入密码"
              size="large"
              show-password
            />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="registerForm.phone" placeholder="请输入手机号" size="large" />
          </el-form-item>
          <el-form-item label="身份证号" prop="idCard">
            <el-input v-model="registerForm.idCard" placeholder="请输入身份证号" size="large" />
          </el-form-item>
        </div>

        <el-form-item label="性别" prop="gender">
          <el-segmented
            v-model="registerForm.gender"
            :options="[
              { label: '男', value: 'MALE' },
              { label: '女', value: 'FEMALE' }
            ]"
          />
        </el-form-item>

        <el-button
          class="login-button"
          type="primary"
          size="large"
          :loading="loading"
          @click="handleRegister"
        >
          创建患者账号
        </el-button>
      </el-form>

      <div class="login-tips">
        <span>已对接接口：</span>
        <code>/api/auth/register</code>
        <code>/api/auth/login</code>
        <code>/api/auth/refresh</code>
        <code>/api/auth/logout</code>
        <code>/api/auth/me</code>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  grid-template-columns: 240px minmax(0, 1.05fr) minmax(360px, 440px);
  gap: 28px;
  align-items: center;
  padding: 40px;
  overflow: hidden;
}

.preview-menu {
  position: relative;
  z-index: 1;
  align-self: start;
  padding: 18px;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(246, 250, 251, 0.86) 0%, rgba(233, 240, 243, 0.8) 100%);
}

.preview-menu-head p {
  margin: 10px 0 16px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.75;
}

.preview-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-bottom: 10px;
  padding: 14px;
  border: 1px solid rgba(121, 189, 224, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.42);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: 0.2s ease;
}

.preview-entry:hover {
  transform: translateX(3px);
  border-color: rgba(121, 189, 224, 0.34);
  background: rgba(252, 254, 255, 0.82);
}

.preview-entry:last-child {
  margin-bottom: 0;
}

.preview-entry strong {
  font-size: 15px;
  font-weight: 800;
}

.preview-entry span {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.7;
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

.panel-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 22px;
}

.switch-button {
  padding: 12px 14px;
  border: 1px solid rgba(121, 189, 224, 0.16);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.48);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.switch-button.is-active {
  border-color: rgba(121, 189, 224, 0.34);
  background: linear-gradient(135deg, rgba(121, 189, 224, 0.22) 0%, rgba(111, 200, 184, 0.18) 100%);
  color: var(--text-primary);
}

.register-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
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

  .register-grid {
    grid-template-columns: 1fr;
  }
}
</style>
