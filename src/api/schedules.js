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

export function getScheduleTemplatePage(params) {
  return request({
    url: '/schedule-templates',
    method: 'get',
    params
  })
}

export function createScheduleTemplate(data) {
  return request({
    url: '/schedule-templates',
    method: 'post',
    data
  })
}

export function updateScheduleTemplate(id, data) {
  return request({
    url: `/schedule-templates/${id}`,
    method: 'put',
    data
  })
}

export function disableScheduleTemplate(id) {
  return request({
    url: `/schedule-templates/${id}/disable`,
    method: 'post'
  })
}

export function generateSchedules(data) {
  return request({
    url: '/schedules/generate',
    method: 'post',
    data
  })
}
