import request from '@/utils/request'

export function getDrugPage(params) {
  return request({
    url: '/drugs',
    method: 'get',
    params
  })
}

export function createDrug(data) {
  return request({
    url: '/drugs',
    method: 'post',
    data
  })
}

export function updateDrug(id, data) {
  return request({
    url: `/drugs/${id}`,
    method: 'put',
    data
  })
}

export function adjustDrugStock(id, data) {
  return request({
    url: `/drugs/${id}/stock-adjust`,
    method: 'post',
    data
  })
}
