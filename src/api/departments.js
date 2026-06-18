import request from '@/utils/request'

export function getDepartments() {
  return request({
    url: '/departments',
    method: 'get'
  })
}

export function getDepartmentTree() {
  return request({
    url: '/departments/tree',
    method: 'get'
  })
}
