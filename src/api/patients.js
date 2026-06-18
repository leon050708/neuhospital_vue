import request from '@/utils/request'

export function getPatientDetail(patientId) {
  return request({
    url: `/patients/${patientId}`,
    method: 'get'
  })
}

export function getPatientPage(params) {
  return request({
    url: '/patients',
    method: 'get',
    params
  })
}
