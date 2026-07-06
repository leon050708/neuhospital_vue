import request from '@/utils/request'

export function getDepartments() {
  return request({
    url: '/departments',
    method: 'get'
  })
}

export function getDepartmentDetail(id) {
  return request({
    url: `/departments/${id}`,
    method: 'get'
  })
}

export function createDepartment(data) {
  return request({
    url: '/departments',
    method: 'post',
    data
  })
}

export function updateDepartment(id, data) {
  return request({
    url: `/departments/${id}`,
    method: 'put',
    data
  })
}

export function getDepartmentTree() {
  return request({
    url: '/departments/tree',
    method: 'get'
  })
}
