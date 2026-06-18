import request from '@/utils/request'

export function quickRegistration(data) {
  return request({
    url: '/registrations/quick',
    method: 'post',
    data
  })
}
