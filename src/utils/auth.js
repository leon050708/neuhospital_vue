const ACCESS_TOKEN_KEY = 'neu_hospital_access_token'
const REFRESH_TOKEN_KEY = 'neu_hospital_refresh_token'
const PROFILE_KEY = 'neu_hospital_profile'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || ''
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

export function getUserProfile() {
  const profile = localStorage.getItem(PROFILE_KEY)

  if (!profile) {
    return null
  }

  try {
    return JSON.parse(profile)
  } catch (error) {
    localStorage.removeItem(PROFILE_KEY)
    return null
  }
}

export function setAuthStorage({ accessToken, refreshToken, profile }) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  if (profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } else {
    localStorage.removeItem(PROFILE_KEY)
  }
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(PROFILE_KEY)
}
