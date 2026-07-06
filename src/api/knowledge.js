import request from '@/utils/request'

export function uploadKnowledgeDocument(formData) {
  return request({
    url: '/admin/ai/knowledge/documents/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function publishKnowledgeDocument(documentId) {
  return request({
    url: `/admin/ai/knowledge/documents/${documentId}/publish`,
    method: 'post'
  })
}

export function offlineKnowledgeDocument(documentId) {
  return request({
    url: `/admin/ai/knowledge/documents/${documentId}/offline`,
    method: 'post'
  })
}
