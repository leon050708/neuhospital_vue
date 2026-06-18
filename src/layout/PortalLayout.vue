<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const previewMode = computed(() => Boolean(route.meta?.preview))

const previewProfile = computed(() => {
  const previewUserType = route.meta?.previewUserType || 'PATIENT'
  const profileMap = {
    PATIENT: {
      username: 'preview_patient',
      userType: 'PATIENT',
      role: 'PATIENT'
    },
    DOCTOR: {
      username: 'preview_doctor',
      userType: 'DOCTOR',
      role: 'DOCTOR'
    },
    MANAGEMENT: {
      username: 'preview_admin',
      userType: 'MANAGEMENT',
      role: 'ADMIN'
    }
  }

  return profileMap[previewUserType] || profileMap.PATIENT
})

const currentProfile = computed(() => {
  return previewMode.value ? previewProfile.value : authStore.profile
})

const currentUserType = computed(() => currentProfile.value?.userType || '')
const currentRole = computed(() => currentProfile.value?.role || '')

const menuItems = computed(() => {
  if (previewMode.value) {
    if (currentUserType.value === 'PATIENT') {
      return [
        { label: '患者首页', path: '/preview/patient' },
        { label: '患者档案', path: '/preview/patient/profile' },
        { label: '挂号排班', path: '/preview/patient/registration' },
        { label: '订单支付', path: '/preview/patient/orders' },
        { label: 'AI 问诊', path: '/preview/patient/consult' }
      ]
    }

    if (currentUserType.value === 'DOCTOR') {
      return [
        { label: '医生首页', path: '/preview/doctor' },
        { label: '候诊队列', path: '/preview/doctor/queue' },
        { label: '病历诊断', path: '/preview/doctor/records' },
        { label: '检查处方', path: '/preview/doctor/orders' },
        { label: 'CT 分析', path: '/preview/doctor/ct-analysis' }
      ]
    }

    return [
      { label: '管理首页', path: '/preview/management' },
      { label: '科室医生', path: '/preview/management/departments' },
      { label: '排班号源', path: '/preview/management/schedules' },
      { label: '患者挂号', path: '/preview/management/patients' },
      { label: '资产文件', path: '/preview/management/assets' }
    ]
  }

  const baseItems = [
    { label: '工作台', path: '/workspace/home' }
  ]

  if (currentUserType.value === 'PATIENT') {
    baseItems.push(
      { label: '患者首页', path: '/workspace/patient' },
      { label: '患者档案', path: '/workspace/patient/profile' },
      { label: '挂号排班', path: '/workspace/patient/registration' },
      { label: '订单支付', path: '/workspace/patient/orders' },
      { label: 'AI 问诊', path: '/workspace/patient/consult' }
    )
  }

  if (currentUserType.value === 'DOCTOR') {
    baseItems.push(
      { label: '医生首页', path: '/workspace/doctor' },
      { label: '候诊队列', path: '/workspace/doctor/queue' },
      { label: '病历诊断', path: '/workspace/doctor/records' },
      { label: '检查处方', path: '/workspace/doctor/orders' },
      { label: 'CT 分析', path: '/workspace/doctor/ct-analysis' }
    )
  }

  if (currentUserType.value === 'MANAGEMENT') {
    baseItems.push(
      { label: '管理首页', path: '/workspace/management' },
      { label: '科室医生', path: '/workspace/management/departments' },
      { label: '排班号源', path: '/workspace/management/schedules' },
      { label: '患者挂号', path: '/workspace/management/patients' },
      { label: '资产文件', path: '/workspace/management/assets' }
    )
  }

  return baseItems
})

const activeMenu = computed(() => route.path)

const welcomeText = computed(() => {
  const map = {
    PATIENT: '患者服务台',
    DOCTOR: '医生工作站',
    MANAGEMENT: '管理控制台'
  }

  if (previewMode.value) {
    return `${map[currentUserType.value] || '三端工作区'} · 临时预览`
  }

  return map[currentUserType.value] || '智慧云脑诊疗平台'
})

async function handleLogout() {
  if (previewMode.value) {
    router.push('/login')
    return
  }

  await authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<template>
  <div class="portal-layout page-shell">
    <aside class="portal-sidebar">
      <div class="brand-panel">
        <div class="brand-mark">RH</div>
        <div>
          <div class="brand-title">智慧云脑诊疗平台</div>
          <div class="brand-subtitle">{{ welcomeText }}</div>
        </div>
      </div>

      <div class="sidebar-divider"></div>

      <nav class="sidebar-nav">
        <button
          v-for="item in menuItems"
          :key="item.path"
          class="nav-button"
          :class="{ 'is-active': activeMenu === item.path }"
          @click="router.push(item.path)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-caption">Access Identity</div>
        <div class="sidebar-user">{{ currentProfile?.username || '未登录' }}</div>
        <div class="sidebar-role">{{ currentUserType || 'GUEST' }} / {{ currentRole || 'NO_ROLE' }}</div>
      </div>
    </aside>

    <div class="portal-main">
      <header class="portal-header glass-card">
        <div>
          <div class="header-kicker">Clinical Intelligence Workspace</div>
          <h1 class="header-title">{{ route.meta?.title || '工作台' }}</h1>
        </div>
        <div class="header-actions">
          <div class="status-chip">{{ previewMode ? '临时预览模式' : '当前业务工作区' }}</div>
          <el-button round type="primary" @click="handleLogout">
            {{ previewMode ? '返回登录' : '退出登录' }}
          </el-button>
        </div>
      </header>

      <main class="portal-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.portal-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
}

.portal-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 28px 20px;
  background: var(--bg-sidebar);
  color: var(--text-primary);
  border-right: 1px solid rgba(255, 255, 255, 0.56);
}

.portal-sidebar::before {
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(109, 141, 157, 0.14);
  pointer-events: none;
  content: '';
}

.brand-panel {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
  border-radius: 6px;
  background: rgba(247, 250, 251, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.48);
}

.brand-mark {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 4px;
  background: linear-gradient(135deg, rgba(121, 189, 224, 0.92) 0%, rgba(111, 200, 184, 0.92) 100%);
  color: #f9fdff;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.brand-title {
  font-size: 18px;
  font-weight: 900;
}

.brand-subtitle {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.sidebar-divider {
  height: 1px;
  margin: 24px 4px 10px;
  background: linear-gradient(90deg, rgba(111, 200, 184, 0.45), rgba(121, 189, 224, 0.14), transparent);
}

.sidebar-nav {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.nav-button {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-secondary);
  text-align: left;
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: 0.2s ease;
}

.nav-button:hover,
.nav-button.is-active {
  background: rgba(248, 252, 253, 0.76);
  border-color: rgba(121, 189, 224, 0.35);
  color: var(--text-primary);
}

.sidebar-footer {
  margin-top: auto;
  padding: 18px;
  border-radius: 6px;
  background: rgba(248, 251, 252, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.46);
}

.sidebar-caption {
  color: var(--text-muted);
  font-family: 'Barlow', sans-serif;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

.sidebar-user {
  margin-top: 10px;
  font-size: 18px;
  font-weight: 900;
}

.sidebar-role {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.portal-main {
  min-width: 0;
  padding: 24px;
}

.portal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 22px 28px;
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, rgba(252, 254, 255, 0.86) 0%, rgba(240, 246, 248, 0.84) 100%);
}

.header-kicker {
  color: var(--text-muted);
  font-family: 'Barlow', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.header-title {
  margin: 8px 0 0;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.portal-content {
  padding: 24px 0;
}

@media (max-width: 1100px) {
  .portal-layout {
    grid-template-columns: 1fr;
  }

  .portal-sidebar {
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .portal-main {
    padding: 16px;
  }

  .portal-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
