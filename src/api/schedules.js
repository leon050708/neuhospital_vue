import request from '@/utils/request'

export function getSchedulePage(params) {
  return request({
    url: '/schedules',
    method: 'get',
    params
  })
}
