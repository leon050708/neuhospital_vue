import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      guestOnly: true,
      title: '登录'
    }
  },
  {
    path: '/workspace',
    component: () => import('@/layout/PortalLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: '/workspace/home'
      },
      {
        path: 'home',
        name: 'workspace-home',
        component: () => import('@/views/common/WorkspaceHomeView.vue'),
        meta: {
          requiresAuth: true,
          title: '工作台'
        }
      },
      {
        path: 'patient',
        name: 'patient-home',
        component: () => import('@/views/patient/PatientHomeView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['PATIENT'],
          title: '患者端'
        }
      },
      {
        path: 'doctor',
        name: 'doctor-home',
        component: () => import('@/views/doctor/DoctorHomeView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['DOCTOR'],
          title: '医生端'
        }
      },
      {
        path: 'doctor/ct-analysis',
        name: 'doctor-ct-analysis',
        component: () => import('@/views/doctor/DoctorCtAnalysisView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['DOCTOR'],
          title: 'CT 分析'
        }
      },
      {
        path: 'management',
        name: 'management-home',
        component: () => import('@/views/management/ManagementHomeView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT'],
          title: '管理端'
        }
      }
    ]
  },
  {
    path: '/preview',
    component: () => import('@/layout/PortalLayout.vue'),
    meta: {
      preview: true,
      title: '三端预览'
    },
    children: [
      {
        path: '',
        redirect: '/preview/patient'
      },
      {
        path: 'patient',
        name: 'preview-patient',
        component: () => import('@/views/patient/PatientHomeView.vue'),
        meta: {
          preview: true,
          previewUserType: 'PATIENT',
          title: '患者端预览'
        }
      },
      {
        path: 'doctor',
        name: 'preview-doctor',
        component: () => import('@/views/doctor/DoctorHomeView.vue'),
        meta: {
          preview: true,
          previewUserType: 'DOCTOR',
          title: '医生端预览'
        }
      },
      {
        path: 'doctor/ct-analysis',
        name: 'preview-doctor-ct-analysis',
        component: () => import('@/views/doctor/DoctorCtAnalysisView.vue'),
        meta: {
          preview: true,
          previewUserType: 'DOCTOR',
          title: 'CT 分析预览'
        }
      },
      {
        path: 'management',
        name: 'preview-management',
        component: () => import('@/views/management/ManagementHomeView.vue'),
        meta: {
          preview: true,
          previewUserType: 'MANAGEMENT',
          title: '管理端预览'
        }
      }
    ]
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/common/ForbiddenView.vue'),
    meta: {
      title: '无权限'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/common/NotFoundView.vue'),
    meta: {
      title: '页面不存在'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

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

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    authStore.hydrate()
  }

  if (to.meta?.guestOnly && authStore.isAuthenticated) {
    return resolveHomeByUserType(authStore.userType)
  }

  if (!to.meta?.requiresAuth) {
    return true
  }

  if (!authStore.isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    }
  }

  if (!authStore.profileLoaded) {
    try {
      await authStore.ensureProfile()
    } catch (error) {
      authStore.clearAuth()
      return {
        path: '/login',
        query: {
          redirect: to.fullPath
        }
      }
    }
  }

  const userTypes = to.meta?.userTypes
  if (userTypes?.length && !userTypes.includes(authStore.userType)) {
    return '/403'
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} | 智慧云脑诊疗平台`
    : '智慧云脑诊疗平台'
})

export default router
