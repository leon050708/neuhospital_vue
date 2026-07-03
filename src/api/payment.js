import request from '@/utils/request'

export function getPendingPayments() {
  return request({
    url: '/payment/pending',
    method: 'get'
  })
}

export function createPaymentOrder(data) {
  return request({
    url: '/payment/create',
    method: 'post',
    data
  })
}

export function payPaymentOrder(id) {
  return request({
    url: `/payment/${id}/pay`,
    method: 'post'
  })
}
