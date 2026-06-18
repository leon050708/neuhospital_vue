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
        path: 'patient/profile',
        name: 'patient-profile',
        component: () => import('@/views/patient/PatientProfileView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['PATIENT'],
          title: '患者档案'
        }
      },
      {
        path: 'patient/registration',
        name: 'patient-registration',
        component: () => import('@/views/patient/PatientRegistrationView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['PATIENT'],
          title: '挂号排班'
        }
      },
      {
        path: 'patient/orders',
        name: 'patient-orders',
        component: () => import('@/views/patient/PatientOrdersView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['PATIENT'],
          title: '订单支付'
        }
      },
      {
        path: 'patient/consult',
        name: 'patient-consult',
        component: () => import('@/views/patient/PatientConsultView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['PATIENT'],
          title: 'AI 问诊'
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
        path: 'doctor/queue',
        name: 'doctor-queue',
        component: () => import('@/views/doctor/DoctorQueueView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['DOCTOR'],
          title: '候诊队列'
        }
      },
      {
        path: 'doctor/records',
        name: 'doctor-records',
        component: () => import('@/views/doctor/DoctorRecordsView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['DOCTOR'],
          title: '病历诊断'
        }
      },
      {
        path: 'doctor/orders',
        name: 'doctor-orders',
        component: () => import('@/views/doctor/DoctorOrdersView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['DOCTOR'],
          title: '检查处方'
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
      },
      {
        path: 'management/departments',
        name: 'management-departments',
        component: () => import('@/views/management/ManagementDepartmentsView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT'],
          title: '科室医生管理'
        }
      },
      {
        path: 'management/schedules',
        name: 'management-schedules',
        component: () => import('@/views/management/ManagementSchedulesView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT'],
          title: '排班号源管理'
        }
      },
      {
        path: 'management/patients',
        name: 'management-patients',
        component: () => import('@/views/management/ManagementPatientsView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT'],
          title: '患者挂号管理'
        }
      },
      {
        path: 'management/assets',
        name: 'management-assets',
        component: () => import('@/views/management/ManagementAssetsView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT'],
          title: '资产文件管理'
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
        path: 'patient/profile',
        name: 'preview-patient-profile',
        component: () => import('@/views/patient/PatientProfileView.vue'),
        meta: {
          preview: true,
          previewUserType: 'PATIENT',
          title: '患者档案预览'
        }
      },
      {
        path: 'patient/registration',
        name: 'preview-patient-registration',
        component: () => import('@/views/patient/PatientRegistrationView.vue'),
        meta: {
          preview: true,
          previewUserType: 'PATIENT',
          title: '挂号排班预览'
        }
      },
      {
        path: 'patient/orders',
        name: 'preview-patient-orders',
        component: () => import('@/views/patient/PatientOrdersView.vue'),
        meta: {
          preview: true,
          previewUserType: 'PATIENT',
          title: '订单支付预览'
        }
      },
      {
        path: 'patient/consult',
        name: 'preview-patient-consult',
        component: () => import('@/views/patient/PatientConsultView.vue'),
        meta: {
          preview: true,
          previewUserType: 'PATIENT',
          title: 'AI 问诊预览'
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
        path: 'doctor/queue',
        name: 'preview-doctor-queue',
        component: () => import('@/views/doctor/DoctorQueueView.vue'),
        meta: {
          preview: true,
          previewUserType: 'DOCTOR',
          title: '候诊队列预览'
        }
      },
      {
        path: 'doctor/records',
        name: 'preview-doctor-records',
        component: () => import('@/views/doctor/DoctorRecordsView.vue'),
        meta: {
          preview: true,
          previewUserType: 'DOCTOR',
          title: '病历诊断预览'
        }
      },
      {
        path: 'doctor/orders',
        name: 'preview-doctor-orders',
        component: () => import('@/views/doctor/DoctorOrdersView.vue'),
        meta: {
          preview: true,
          previewUserType: 'DOCTOR',
          title: '检查处方预览'
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
      },
      {
        path: 'management/departments',
        name: 'preview-management-departments',
        component: () => import('@/views/management/ManagementDepartmentsView.vue'),
        meta: {
          preview: true,
          previewUserType: 'MANAGEMENT',
          title: '科室医生预览'
        }
      },
      {
        path: 'management/schedules',
        name: 'preview-management-schedules',
        component: () => import('@/views/management/ManagementSchedulesView.vue'),
        meta: {
          preview: true,
          previewUserType: 'MANAGEMENT',
          title: '排班号源预览'
        }
      },
      {
        path: 'management/patients',
        name: 'preview-management-patients',
        component: () => import('@/views/management/ManagementPatientsView.vue'),
        meta: {
          preview: true,
          previewUserType: 'MANAGEMENT',
          title: '患者挂号预览'
        }
      },
      {
        path: 'management/assets',
        name: 'preview-management-assets',
        component: () => import('@/views/management/ManagementAssetsView.vue'),
        meta: {
          preview: true,
          previewUserType: 'MANAGEMENT',
          title: '资产文件预览'
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
