import request from '@/utils/request'

export function uploadFile(formData) {
  return request({
    url: '/files/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function uploadDirectory(formData) {
  return request({
    url: '/files/upload-directory',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function getFileList(params) {
  return request({
    url: '/files',
    method: 'get',
    params
  })
}

export function getFileDetail(fileId) {
  return request({
    url: `/files/${fileId}`,
    method: 'get'
  })
}

export function getFilePreviewUrl(fileId) {
  return request({
    url: `/files/${fileId}/preview-url`,
    method: 'get'
  })
}
