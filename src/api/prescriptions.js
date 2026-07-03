import request from '@/utils/request'

export function createPrescription(data) {
  return request({
    url: '/prescriptions',
    method: 'post',
    data
  })
}

export function getPrescriptionDetail(id) {
  return request({
    url: `/prescriptions/${id}`,
    method: 'get'
  })
}

export function getPrescriptionsPage(params) {
  return request({
    url: '/prescriptions',
    method: 'get',
    params
  })
}
