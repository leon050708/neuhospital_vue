import request from '@/utils/request'

export function quickRegistration(data) {
  return request({
    url: '/registrations/quick',
    method: 'post',
    data
  })
}

export function getMyRegistrations(params = {}) {
  return request({
    url: '/registrations/my',
    method: 'get',
    params
  })
}

export function getRegistrationsPage(params) {
  return request({
    url: '/registrations',
    method: 'get',
    params
  })
}

export function getRegistrationDetail(id) {
  return request({
    url: `/registrations/${id}`,
    method: 'get'
  })
}

export function cancelRegistration(id) {
  return request({
    url: `/registrations/${id}/cancel`,
    method: 'post'
  })
}

export function checkInRegistration(id) {
  return request({
    url: `/registrations/${id}/check-in`,
    method: 'post'
  })
}
