import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { login as loginApi, logout as logoutApi, getCurrentUser } from '@/api/auth'
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  getUserProfile,
  setAuthStorage
} from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref('')
  const refreshToken = ref('')
  const profile = ref(null)
  const initialized = ref(false)
  const profileLoaded = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const userType = computed(() => profile.value?.userType || '')
  const role = computed(() => profile.value?.role || '')

  function hydrate() {
    accessToken.value = getAccessToken()
    refreshToken.value = getRefreshToken()
    profile.value = getUserProfile()
    profileLoaded.value = Boolean(profile.value)
    initialized.value = true
  }

  function applyAuthPayload(payload) {
    accessToken.value = payload.accessToken || ''
    refreshToken.value = payload.refreshToken || refreshToken.value || ''
    profile.value = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      userType: payload.userType,
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
    applyAuthPayload(response.data)
    return response.data
  }

  async function ensureProfile() {
    if (!accessToken.value) {
      throw new Error('missing access token')
    }

    if (profileLoaded.value && profile.value) {
      return profile.value
    }

    const response = await getCurrentUser()
    profile.value = response.data
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
      if (accessToken.value) {
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
    ensureProfile,
    logout,
    updateAccessToken,
    clearAuth
  }
})
