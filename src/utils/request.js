import axios from 'axios'

import { getAccessToken, getRefreshToken, clearAuthStorage } from '@/utils/auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000
})

let refreshingPromise = null

request.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
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
      if (status === 401) {
        clearAuthStorage()
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const refreshResponse = await refreshAccessToken()
      const nextAccessToken = refreshResponse.data?.data?.accessToken

      if (!nextAccessToken) {
        throw new Error('refresh access token failed')
      }

      localStorage.setItem('neu_hospital_access_token', nextAccessToken)
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`
      return request(originalRequest)
    } catch (refreshError) {
      clearAuthStorage()
      return Promise.reject(refreshError)
    }
  }
)

export default request
