import request from '@/utils/request'

export function getDoctorQueue(userId) {
  return request({
    url: '/queue/doctor/me',
    method: 'get',
    headers: userId ? { 'X-User-Id': userId } : undefined
  })
}

export function callQueuePatient(id, userId) {
  return request({
    url: `/queue/${id}/call`,
    method: 'post',
    headers: userId ? { 'X-User-Id': userId } : undefined
  })
}

export function skipQueuePatient(id, userId) {
  return request({
    url: `/queue/${id}/skip`,
    method: 'post',
    headers: userId ? { 'X-User-Id': userId } : undefined
  })
}

export function finishQueuePatient(id, userId) {
  return request({
    url: `/queue/${id}/finish`,
    method: 'post',
    headers: userId ? { 'X-User-Id': userId } : undefined
  })
}
