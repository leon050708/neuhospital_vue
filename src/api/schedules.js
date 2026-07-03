import request from '@/utils/request'

export function getSchedulePage(params) {
  return request({
    url: '/schedules',
    method: 'get',
    params
  })
}

export function createSchedule(data) {
  return request({
    url: '/schedules',
    method: 'post',
    data
  })
}

export function updateSchedule(id, data) {
  return request({
    url: `/schedules/${id}`,
    method: 'put',
    data
  })
}

export function closeSchedule(id) {
  return request({
    url: `/schedules/${id}/close`,
    method: 'post'
  })
}
