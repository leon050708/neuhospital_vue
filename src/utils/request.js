import axios from 'axios'

import { getAccessToken, getRefreshToken, clearAuthStorage } from '@/utils/auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000
})

let refreshingPromise = null
let redirectingToLogin = false
const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/refresh']

function isPublicAuthRequest(url = '') {
  return publicAuthPaths.some((path) => url.includes(path))
}

function buildLoginRedirectPath() {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
  return `/login?redirect=${encodeURIComponent(currentPath)}`
}

function forceRelogin() {
  clearAuthStorage()

  if (redirectingToLogin) {
    return
  }

  redirectingToLogin = true
  window.location.replace(buildLoginRedirectPath())
}

function shouldForceRelogin(status, requestUrl) {
  if (isPublicAuthRequest(requestUrl)) {
    return false
  }

  if (status === 401) {
    return true
  }

  // Back-end restarts or in-memory session loss may surface as 403.
  return status === 403 && Boolean(getAccessToken())
}

request.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token && !isPublicAuthRequest(config.url)) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

async function refreshAccessToken() {
  if (!refreshingPromise) {
    refreshingPromise = axios.post(
      `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
      {
        refreshToken: getRefreshToken()
      },
      {
        timeout: 20000
      }
    ).finally(() => {
      refreshingPromise = null
    })
  }

  return refreshingPromise
}

request.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const requestUrl = originalRequest?.url || ''
    const canRefresh = !originalRequest?._retry
      && status === 401
      && !requestUrl.includes('/auth/login')
      && !requestUrl.includes('/auth/refresh')
      && getRefreshToken()

    if (!canRefresh) {
      if (shouldForceRelogin(status, requestUrl)) {
        forceRelogin()
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const refreshResponse = await refreshAccessToken()
      const nextAccessToken = refreshResponse.data?.accessToken

      if (!nextAccessToken) {
        throw new Error('refresh access token failed')
      }

      localStorage.setItem('neu_hospital_access_token', nextAccessToken)
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`
      return request(originalRequest)
    } catch (refreshError) {
      forceRelogin()
      return Promise.reject(refreshError)
    }
  }
)

export default request
