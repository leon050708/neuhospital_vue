import request from '@/utils/request'

export function createCheckResult(data) {
  return request({
    url: '/check-results',
    method: 'post',
    data
  })
}

export function getCheckResultDetail(id) {
  return request({
    url: `/check-results/${id}`,
    method: 'get'
  })
}

export function confirmCheckResult(id) {
  return request({
    url: `/check-results/${id}/confirm`,
    method: 'post'
  })
}
