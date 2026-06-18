import request from '@/utils/request'

export function getOutpatientRecordPage(params) {
  return request({
    url: '/outpatient/records',
    method: 'get',
    params
  })
}

export function getOutpatientRecordDetail(recordId) {
  return request({
    url: `/outpatient/records/${recordId}`,
    method: 'get'
  })
}
