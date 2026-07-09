const ACCESS_TOKEN_KEY = 'neu_hospital_access_token'
const REFRESH_TOKEN_KEY = 'neu_hospital_refresh_token'
const PROFILE_KEY = 'neu_hospital_profile'

export function normalizeUserType(userType) {
  if (userType === 'PHARMACIST') {
    return 'PHARMACY'
  }

  return userType || ''
}

export function normalizeRole(role, userType = '') {
  if (role === 'PHARMACIST') {
    return 'PHARMACY'
  }

  if (!role && userType === 'PHARMACIST') {
    return 'PHARMACY'
  }

  return role || ''
}

export function buildAuthIdentityHeaders(profile) {
  if (!profile) {
    return {}
  }

  const normalizedUserType = normalizeUserType(profile.userType)
  const normalizedRole = normalizeRole(profile.role, profile.userType)
  const resolvedUserId = profile.userId ?? ''
  const resolvedUsername = profile.username ?? ''
  const roles = Array.from(new Set([profile.role, normalizedRole].filter(Boolean))).join(',')

  return {
    ...(resolvedUserId ? { 'X-User-Id': String(resolvedUserId) } : {}),
    ...(resolvedUsername ? { 'X-Username': String(resolvedUsername) } : {}),
    ...(normalizedUserType ? { 'X-User-Type': normalizedUserType } : {}),
    ...(roles ? { 'X-User-Roles': roles } : {})
  }
}

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
