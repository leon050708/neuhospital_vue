import request from '@/utils/request'

export function getDrugPage(params) {
  return request({
    url: '/drugs',
    method: 'get',
    params
  })
}
