import request from '@/utils/request'

export function getDoctors(params) {
  return request({
    url: '/doctors',
    method: 'get',
    params
  })
}

export function getDoctorPage(params) {
  return request({
    url: '/doctors/page',
    method: 'get',
    params
  })
}
