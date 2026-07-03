import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { login as loginApi, logout as logoutApi, getCurrentUser, register as registerApi } from '@/api/auth'
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  getUserProfile,
  setAuthStorage
} from '@/utils/auth'
import { unwrapResult } from '@/utils/result'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref('')
  const refreshToken = ref('')
  const profile = ref(null)
  const initialized = ref(false)
  const profileLoaded = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const userType = computed(() => profile.value?.userType || '')
  const role = computed(() => profile.value?.role || '')
  const shouldAttemptRemoteLogout = !import.meta.env.DEV || import.meta.env.VITE_ENABLE_REMOTE_LOGOUT === 'true'

  function hydrate() {
    accessToken.value = getAccessToken()
    refreshToken.value = getRefreshToken()
    profile.value = getUserProfile()
    profileLoaded.value = Boolean(profile.value)
    initialized.value = true
  }

  function applyAuthPayload(payload) {
    const resolvedUserType = payload.userType || payload.role || ''
    const resolvedRole = payload.role || payload.userType || ''

    accessToken.value = payload.accessToken || accessToken.value || ''
    refreshToken.value = payload.refreshToken || refreshToken.value || ''
    profile.value = {
      userId: payload.userId,
      username: payload.username,
      role: resolvedRole,
      userType: resolvedUserType,
      bizId: payload.bizId,
      sessionId: payload.sessionId,
      refreshTokenId: payload.refreshTokenId
    }
    profileLoaded.value = true

    setAuthStorage({
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      profile: profile.value
    })
  }

  async function login(credentials) {
    const response = await loginApi(credentials)
    const payload = unwrapResult(response, '登录失败')
    applyAuthPayload(payload)
    return profile.value
  }

  async function register(payload) {
    return registerApi(payload)
  }

  async function ensureProfile() {
    if (!accessToken.value) {
      throw new Error('missing access token')
    }

    if (profileLoaded.value && profile.value) {
      return profile.value
    }

    const response = await getCurrentUser()
    const payload = unwrapResult(response, '加载当前用户失败')
    profile.value = {
      ...payload,
      userType: payload.userType || payload.role || '',
      role: payload.role || payload.userType || ''
    }
    profileLoaded.value = true

    setAuthStorage({
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      profile: profile.value
    })

    return profile.value
  }

  async function logout() {
    try {
      if (accessToken.value && shouldAttemptRemoteLogout) {
        await logoutApi()
      }
    } finally {
      clearAuth()
    }
  }

  function updateAccessToken(nextAccessToken) {
    accessToken.value = nextAccessToken
    setAuthStorage({
      accessToken: nextAccessToken,
      refreshToken: refreshToken.value,
      profile: profile.value
    })
  }

  function clearAuth() {
    accessToken.value = ''
    refreshToken.value = ''
    profile.value = null
    profileLoaded.value = false
    clearAuthStorage()
  }

  return {
    accessToken,
    refreshToken,
    profile,
    initialized,
    profileLoaded,
    isAuthenticated,
    userType,
    role,
    hydrate,
    applyAuthPayload,
    login,
    register,
    ensureProfile,
    logout,
    updateAccessToken,
    clearAuth
  }
})
