import request from '@/utils/request'

export function createInspectionRequest(data) {
  return request({
    url: '/inspection-requests',
    method: 'post',
    data
  })
}

export function getInspectionRequestDetail(id) {
  return request({
    url: `/inspection-requests/${id}`,
    method: 'get'
  })
}

export function getInspectionRequestsPage(params) {
  return request({
    url: '/inspection-requests',
    method: 'get',
    params
  })
}

export function cancelInspectionRequest(id) {
  return request({
    url: `/inspection-requests/${id}/cancel`,
    method: 'post'
  })
}
