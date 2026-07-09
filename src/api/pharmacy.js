import request from '@/utils/request'

export function getPendingPrescriptions(params) {
  return request({
    url: '/pharmacy/dispense/pending',
    method: 'get',
    params
  })
}

export function dispensePrescription(data) {
  return request({
    url: '/pharmacy/dispense',
    method: 'post',
    data
  })
}

export function getDispenseRecords(params) {
  return request({
    url: '/pharmacy/dispense-records',
    method: 'get',
    params
  })
}
