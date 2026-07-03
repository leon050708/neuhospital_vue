import request from '@/utils/request'

export function dispensePrescription(data) {
  return request({
    url: '/pharmacy/dispense',
    method: 'post',
    data
  })
}
