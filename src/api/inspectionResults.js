import request from '@/utils/request'

export function createInspectionResult(data) {
  return request({
    url: '/inspection-results',
    method: 'post',
    data
  })
}

export function getInspectionResultDetail(id) {
  return request({
    url: `/inspection-results/${id}`,
    method: 'get'
  })
}

export function confirmInspectionResult(id) {
  return request({
    url: `/inspection-results/${id}/confirm`,
    method: 'post'
  })
}
