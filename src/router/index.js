import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

function isPharmacyUserType(userType) {
  return userType === 'PHARMACIST' || userType === 'PHARMACY'
}

function resolveWorkspaceDefaultPath(userType) {
  if (userType === 'PATIENT') {
    return '/workspace/patient/profile'
  }

  if (userType === 'DOCTOR') {
    return '/workspace/doctor/queue'
  }

  if (isPharmacyUserType(userType)) {
    return '/workspace/pharmacy/drugs'
  }

  if (userType === 'MANAGEMENT' || userType === 'ADMIN') {
    return '/workspace/management/departments'
  }

  return '/login'
}

function getStoredUserType() {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    authStore.hydrate()
  }

  return authStore.userType
}

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
        redirect: () => resolveWorkspaceDefaultPath(getStoredUserType())
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
        path: 'patient/records',
        name: 'patient-records',
        component: () => import('@/views/common/WorkspaceSectionOutlet.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['PATIENT'],
          title: '我的病例'
        },
        children: [
          {
            path: '',
            redirect: '/workspace/patient/records/list'
          },
          {
            path: 'list',
            name: 'patient-records-list',
            component: () => import('@/views/patient/PatientRecordsView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['PATIENT'],
              title: '病例列表',
              section: 'list'
            }
          },
          {
            path: 'detail',
            name: 'patient-records-detail',
            component: () => import('@/views/patient/PatientRecordsView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['PATIENT'],
              title: '病例详情',
              section: 'detail'
            }
          }
        ]
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
        component: () => import('@/views/common/WorkspaceSectionOutlet.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['PATIENT'],
          title: '订单支付'
        },
        children: [
          {
            path: '',
            redirect: '/workspace/patient/orders/registrations'
          },
          {
            path: 'registrations',
            name: 'patient-order-registrations',
            component: () => import('@/views/patient/PatientOrdersView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['PATIENT'],
              title: '我的挂号',
              orderSection: 'registrations'
            }
          },
          {
            path: 'payments',
            name: 'patient-order-payments',
            component: () => import('@/views/patient/PatientOrdersView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['PATIENT'],
              title: '待支付项目',
              orderSection: 'payments'
            }
          }
        ]
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
        component: () => import('@/views/common/WorkspaceSectionOutlet.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['DOCTOR'],
          title: '病历诊断'
        },
        children: [
          {
            path: '',
            redirect: '/workspace/doctor/records/consultation'
          },
          {
            path: 'consultation',
            name: 'doctor-records-consultation',
            component: () => import('@/views/doctor/DoctorRecordsView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['DOCTOR'],
              title: '当前接诊',
              section: 'consultation'
            }
          },
          {
            path: 'history',
            name: 'doctor-records-history',
            component: () => import('@/views/doctor/DoctorRecordsView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['DOCTOR'],
              title: '病历记录',
              section: 'history'
            }
          }
        ]
      },
      {
        path: 'doctor/orders',
        name: 'doctor-orders',
        component: () => import('@/views/common/WorkspaceSectionOutlet.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['DOCTOR'],
          title: '检查处方'
        },
        children: [
          {
            path: '',
            redirect: '/workspace/doctor/orders/check'
          },
          {
            path: 'check',
            name: 'doctor-orders-check',
            component: () => import('@/views/doctor/DoctorOrdersView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['DOCTOR'],
              title: '检查申请',
              orderSection: 'check'
            }
          },
          {
            path: 'inspection',
            name: 'doctor-orders-inspection',
            component: () => import('@/views/doctor/DoctorOrdersView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['DOCTOR'],
              title: '检验申请',
              orderSection: 'inspection'
            }
          },
          {
            path: 'prescription',
            name: 'doctor-orders-prescription',
            component: () => import('@/views/doctor/DoctorOrdersView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['DOCTOR'],
              title: '处方开立',
              orderSection: 'prescription'
            }
          }
        ]
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
        path: 'management/departments',
        name: 'management-departments',
        component: () => import('@/views/common/WorkspaceSectionOutlet.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT', 'ADMIN'],
          title: '科室医生管理'
        },
        children: [
          {
            path: '',
            redirect: '/workspace/management/departments/list'
          },
          {
            path: 'list',
            name: 'management-department-list',
            component: () => import('@/views/management/ManagementDepartmentsView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['MANAGEMENT', 'ADMIN'],
              title: '科室列表',
              section: 'departments'
            }
          },
          {
            path: 'doctors',
            name: 'management-doctor-list',
            component: () => import('@/views/management/ManagementDepartmentsView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['MANAGEMENT', 'ADMIN'],
              title: '医生分页',
              section: 'doctors'
            }
          }
        ]
      },
      {
        path: 'management/schedules',
        name: 'management-schedules',
        component: () => import('@/views/management/ManagementSchedulesView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT', 'ADMIN'],
          title: '排班号源管理'
        },
        children: [
          {
            path: '',
            redirect: '/workspace/management/schedules/templates'
          },
          {
            path: 'templates',
            name: 'management-schedule-templates',
            component: () => import('@/views/management/ManagementScheduleTemplatesView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['MANAGEMENT', 'ADMIN'],
              title: '排班模板'
            }
          },
          {
            path: 'instances',
            name: 'management-schedule-instances',
            component: () => import('@/views/management/ManagementScheduleInstancesView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['MANAGEMENT', 'ADMIN'],
              title: '排班实例'
            }
          }
        ]
      },
      {
        path: 'management/patients',
        name: 'management-patients',
        component: () => import('@/views/management/ManagementPatientsView.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT', 'ADMIN'],
          title: '患者挂号管理'
        }
      },
      {
        path: 'pharmacy',
        name: 'pharmacy',
        component: () => import('@/views/common/WorkspaceSectionOutlet.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['PHARMACIST', 'PHARMACY'],
          title: '药房工作台'
        },
        children: [
          {
            path: '',
            redirect: '/workspace/pharmacy/drugs'
          },
          {
            path: 'drugs',
            name: 'pharmacy-drugs',
            component: () => import('@/views/pharmacy/PharmacyWorkspaceView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['PHARMACIST', 'PHARMACY'],
              title: '药品管理',
              section: 'drugs'
            }
          },
          {
            path: 'dispense',
            name: 'pharmacy-dispense',
            component: () => import('@/views/pharmacy/PharmacyWorkspaceView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['PHARMACIST', 'PHARMACY'],
              title: '发药工作台',
              section: 'dispense'
            }
          }
        ]
      },
      {
        path: 'management/assets',
        name: 'management-assets',
        component: () => import('@/views/common/WorkspaceSectionOutlet.vue'),
        meta: {
          requiresAuth: true,
          userTypes: ['MANAGEMENT', 'ADMIN'],
          title: '资产文件管理'
        },
        children: [
          {
            path: '',
            redirect: '/workspace/management/assets/files'
          },
          {
            path: 'files',
            name: 'management-assets-files',
            component: () => import('@/views/management/ManagementAssetsView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['MANAGEMENT', 'ADMIN'],
              title: '文件记录',
              section: 'files'
            }
          },
          {
            path: 'knowledge',
            name: 'management-assets-knowledge',
            component: () => import('@/views/management/ManagementAssetsView.vue'),
            meta: {
              requiresAuth: true,
              userTypes: ['MANAGEMENT', 'ADMIN'],
              title: '知识库上传',
              section: 'knowledge'
            }
          }
        ]
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
  return resolveWorkspaceDefaultPath(userType)
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    authStore.hydrate()
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
