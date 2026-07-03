import request from '@/utils/request'

export function createOutpatientRecord(data) {
  return request({
    url: '/outpatient/records',
    method: 'post',
    data
  })
}

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

export function getOutpatientRecordDiagnoses(recordId) {
  return request({
    url: `/outpatient/records/${recordId}/diagnoses`,
    method: 'get'
  })
}

export function updateOutpatientRecord(recordId, data) {
  return request({
    url: `/outpatient/records/${recordId}`,
    method: 'put',
    data
  })
}

export function confirmOutpatientRecord(recordId) {
  return request({
    url: `/outpatient/records/${recordId}/confirm`,
    method: 'post'
  })
}
