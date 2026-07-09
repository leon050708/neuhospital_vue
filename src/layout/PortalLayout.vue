<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const currentProfile = computed(() => authStore.profile)

const currentUserType = computed(() => currentProfile.value?.userType || '')
const currentRole = computed(() => currentProfile.value?.role || '')

function buildMenuItem(label, path, activePrefixes = []) {
  return {
    label,
    path,
    activePrefixes: [path, ...activePrefixes]
  }
}

function buildMenuGroup(label, path, children, activePrefixes = []) {
  return {
    label,
    path,
    children,
    activePrefixes: [path, ...activePrefixes]
  }
}

const menuItems = computed(() => {
  const baseItems = []

  if (currentUserType.value === 'PATIENT') {
    baseItems.push(
      buildMenuItem('患者档案', '/workspace/patient/profile'),
      buildMenuGroup(
        '我的病例',
        '/workspace/patient/records/list',
        [
          buildMenuItem('病例列表', '/workspace/patient/records/list'),
          buildMenuItem('病例详情', '/workspace/patient/records/detail')
        ],
        ['/workspace/patient/records']
      ),
      buildMenuItem('挂号', '/workspace/patient/registration'),
      buildMenuGroup(
        '订单支付',
        '/workspace/patient/orders/registrations',
        [
          buildMenuItem('我的挂号', '/workspace/patient/orders/registrations'),
          buildMenuItem('待支付', '/workspace/patient/orders/payments')
        ],
        ['/workspace/patient/orders']
      ),
      buildMenuItem('AI 问诊', '/workspace/patient/consult')
    )
  }

  if (currentUserType.value === 'DOCTOR') {
    baseItems.push(
      buildMenuItem('候诊队列', '/workspace/doctor/queue'),
      buildMenuGroup(
        '病历诊断',
        '/workspace/doctor/records/consultation',
        [
          buildMenuItem('当前接诊', '/workspace/doctor/records/consultation'),
          buildMenuItem('病历记录', '/workspace/doctor/records/history')
        ],
        ['/workspace/doctor/records']
      )
    )
  }

  if (currentUserType.value === 'PHARMACIST' || currentUserType.value === 'PHARMACY') {
    baseItems.push(
      buildMenuGroup(
        '药房工作台',
        '/workspace/pharmacy/drugs',
        [
          buildMenuItem('药品管理', '/workspace/pharmacy/drugs'),
          buildMenuItem('发药工作台', '/workspace/pharmacy/dispense')
        ],
        ['/workspace/pharmacy']
      )
    )
  }

  if (currentUserType.value === 'MANAGEMENT' || currentUserType.value === 'ADMIN') {
    baseItems.push(
      buildMenuGroup(
        '科室医生',
        '/workspace/management/departments/list',
        [
          buildMenuItem('科室列表', '/workspace/management/departments/list'),
          buildMenuItem('医生分页', '/workspace/management/departments/doctors')
        ],
        ['/workspace/management/departments']
      ),
      buildMenuGroup(
        '排班号源',
        '/workspace/management/schedules/templates',
        [
          buildMenuItem('排班模板', '/workspace/management/schedules/templates'),
          buildMenuItem('排班实例', '/workspace/management/schedules/instances')
        ],
        ['/workspace/management/schedules']
      ),
      buildMenuItem('患者挂号', '/workspace/management/patients'),
      buildMenuGroup(
        '资产文件',
        '/workspace/management/assets/files',
        [
          buildMenuItem('文件记录', '/workspace/management/assets/files'),
          buildMenuItem('知识库上传', '/workspace/management/assets/knowledge')
        ],
        ['/workspace/management/assets']
      )
    )
  }

  return baseItems
})

function isMenuActive(item) {
  return item.activePrefixes?.some((prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`))
}

function handleMenuClick(item) {
  if (item.children?.length && isMenuActive(item)) {
    return
  }

  router.push(item.path)
}

const welcomeText = computed(() => {
  const map = {
    PATIENT: '患者服务台',
    DOCTOR: '医生工作站',
    PHARMACIST: '药房工作台',
    PHARMACY: '药房工作台',
    MANAGEMENT: '管理控制台',
    ADMIN: '管理控制台'
  }

  return map[currentUserType.value] || '智慧云脑诊疗平台'
})

async function handleLogout() {
  await authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<template>
  <div class="portal-layout page-shell">
    <header class="portal-header glass-card">
      <div class="header-brand">
        <div class="brand-panel">
          <div class="brand-mark">RH</div>
          <div>
            <div class="brand-title">智慧云脑诊疗平台</div>
            <div class="brand-subtitle">{{ welcomeText }}</div>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <div class="header-caption">当前业务工作区</div>
        <div class="header-action-row">
          <el-button round type="primary" @click="handleLogout">
            退出登录
          </el-button>
        </div>
      </div>
    </header>

    <aside class="portal-sidebar">
      <nav class="sidebar-nav">
        <div
          v-for="item in menuItems"
          :key="item.path"
          class="nav-group"
        >
          <button
            class="nav-button"
            :class="{ 'is-active': isMenuActive(item), 'has-children': item.children?.length }"
            @click="handleMenuClick(item)"
          >
            <span>{{ item.label }}</span>
            <span v-if="item.children?.length" class="nav-caret">{{ isMenuActive(item) ? '−' : '+' }}</span>
          </button>

          <div v-if="item.children?.length && isMenuActive(item)" class="subnav-list">
            <button
              v-for="child in item.children"
              :key="child.path"
              class="subnav-button"
              :class="{ 'is-active': isMenuActive(child) }"
              @click="router.push(child.path)"
            >
              {{ child.label }}
            </button>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer glass-card">
        <div class="sidebar-caption">Access Identity</div>
        <div class="sidebar-user">{{ currentProfile?.username || '未登录' }}</div>
        <div class="sidebar-role">{{ currentUserType || 'GUEST' }} / {{ currentRole || 'NO_ROLE' }}</div>
      </div>
    </aside>

    <div class="portal-main">
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
  grid-template-rows: auto 1fr;
  min-height: 100vh;
}

.portal-header {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin: 18px 18px 0;
  padding: 18px 22px;
  border-radius: var(--radius-lg);
}

.portal-sidebar {
  grid-row: 2;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 18px 0 18px 18px;
  padding: 18px;
  background: linear-gradient(180deg, rgba(177, 191, 198, 0.78) 0%, rgba(202, 217, 223, 0.72) 100%);
  color: var(--text-primary);
  border-right: 1px solid rgba(255, 255, 255, 0.56);
  border-radius: var(--radius-lg);
}

.portal-sidebar::before {
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(109, 141, 157, 0.14);
  pointer-events: none;
  content: '';
}

.header-brand {
  min-width: 0;
}

.brand-panel {
  display: flex;
  gap: 14px;
  align-items: center;
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

.header-actions {
  display: grid;
  gap: 8px;
  justify-items: end;
}

.header-caption {
  color: var(--text-muted);
  font-family: 'Barlow', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.header-action-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sidebar-nav {
  display: grid;
  gap: 8px;
}

.nav-group {
  display: grid;
  gap: 8px;
}

.nav-button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.nav-button.has-children {
  font-weight: 800;
}

.nav-button:hover,
.nav-button.is-active {
  background: rgba(248, 252, 253, 0.76);
  border-color: rgba(121, 189, 224, 0.35);
  color: var(--text-primary);
}

.nav-caret {
  font-size: 16px;
  line-height: 1;
}

.subnav-list {
  display: grid;
  gap: 6px;
  margin: -2px 0 4px;
  padding-left: 12px;
}

.subnav-button {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(121, 189, 224, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.14);
  color: var(--text-secondary);
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.subnav-button:hover,
.subnav-button.is-active {
  background: rgba(248, 252, 253, 0.72);
  border-color: rgba(121, 189, 224, 0.28);
  color: var(--text-primary);
}

.sidebar-footer {
  margin-top: auto;
  padding: 18px;
  border-radius: 6px;
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
  grid-row: 2;
  min-width: 0;
  padding: 18px 18px 18px 20px;
}

.portal-content {
  padding: 0;
}

@media (max-width: 1100px) {
  .portal-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }

  .portal-sidebar {
    grid-row: 2;
    margin: 0 18px 18px;
  }

  .portal-main {
    grid-row: 3;
    padding: 0 18px 18px;
  }
}

@media (max-width: 768px) {
  .portal-header {
    flex-direction: column;
    align-items: flex-start;
    margin: 16px 16px 0;
    padding: 16px 18px;
  }

  .header-actions {
    width: 100%;
    justify-items: start;
  }

  .portal-main {
    padding: 16px;
  }

  .portal-sidebar {
    margin: 0 16px 16px;
  }
}
</style>
