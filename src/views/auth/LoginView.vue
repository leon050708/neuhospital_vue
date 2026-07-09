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

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  password: '',
  confirmPassword: '',
  realName: '',
  phone: '',
  idCard: '',
  gender: 'MALE'
})

const loginRules = {
  username: [
    { required: true, message: '请输入登录账号或手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const registerRules = {
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

const roleCards = [
  {
    label: '患者端',
    title: '档案、病例、挂号、支付、AI 问诊',
    desc: '当前已接患者档案、病例查看、排班挂号、我的挂号、待支付项目和 AI 问诊会话。'
  },
  {
    label: '医生端',
    title: '候诊、病历、检查、CT 分析',
    desc: '当前已接候诊队列、病历查询、检查/检验申请、处方开立和 CT 智能分析。'
  },
  {
    label: '药房端',
    title: '药品、库存、发药',
    desc: '当前已接药品信息维护、库存调整、待发药处方和发药记录查询。'
  },
  {
    label: '管理端',
    title: '科室、排班、患者、资产查询',
    desc: '当前已接科室、医生、排班、患者、文件记录和知识库上传。'
  }
]

function resolveHomeByUserType(userType) {
  if (userType === 'PATIENT') {
    return '/workspace/patient/profile'
  }

  if (userType === 'DOCTOR') {
    return '/workspace/doctor/queue'
  }

  if (userType === 'PHARMACIST' || userType === 'PHARMACY') {
    return '/workspace/pharmacy/drugs'
  }

  if (userType === 'MANAGEMENT' || userType === 'ADMIN') {
    return '/workspace/management/departments'
  }

  return '/login'
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
      password: registerForm.password,
      realName: registerForm.realName,
      phone: registerForm.phone,
      idCard: registerForm.idCard,
      gender: registerForm.gender
    })

    loginForm.username = registerForm.phone
    loginForm.password = registerForm.password

    registerForm.confirmPassword = ''
    registerForm.realName = ''
    registerForm.phone = ''
    registerForm.idCard = ''
    registerForm.gender = 'MALE'

    ElMessage.success('注册成功，请直接登录')
    activePanel.value = 'login'
  } catch (error) {
    const status = error.response?.status
    const message = error.response?.data?.message

    if (status === 403) {
      ElMessage.error(message || '注册请求被后端拒绝，请检查后端是否允许匿名访问 /api/auth/register')
      return
    }

    ElMessage.error(message || '注册失败，请检查填写内容')
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
        <div class="hud-label">Smart Medical Portal</div>
        <h1>智慧云脑诊疗平台</h1>
        <p>
          平台按患者端、医生端、药房端、管理端四类身份组织。
          患者支持注册，医生、药房人员和管理员使用已有账号登录，登录后会根据 `userType` 自动进入对应工作区。
        </p>
      </div>

      <div class="hero-metrics role-grid">
        <article v-for="item in roleCards" :key="item.label" class="metric-card glass-card role-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.desc }}</p>
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
              ? '患者使用手机号登录，医生、药房人员和管理员使用系统分配账号登录。'
              : '当前仅开放患者注册，注册完成后手机号将直接作为登录账号。'
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
            placeholder="患者填手机号，医生/管理员填账号"
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
          <el-form-item label="真实姓名" prop="realName">
            <el-input v-model="registerForm.realName" placeholder="请输入真实姓名" size="large" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="registerForm.phone" placeholder="注册后将作为登录账号" size="large" />
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
        <span>登录说明</span>
        <code>患者可注册</code>
        <code>手机号即账号</code>
        <code>医生/管理员使用内部账号</code>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 440px);
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

.role-grid {
  align-items: stretch;
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

.role-card p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  line-height: 1.75;
  font-size: 13px;
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
