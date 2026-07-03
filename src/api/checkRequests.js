import request from '@/utils/request'

export function createCheckRequest(data) {
  return request({
    url: '/check-requests',
    method: 'post',
    data
  })
}

export function getCheckRequestDetail(id) {
  return request({
    url: `/check-requests/${id}`,
    method: 'get'
  })
}

export function getCheckRequestsPage(params) {
  return request({
    url: '/check-requests',
    method: 'get',
    params
  })
}

export function cancelCheckRequest(id) {
  return request({
    url: `/check-requests/${id}/cancel`,
    method: 'post'
  })
}
