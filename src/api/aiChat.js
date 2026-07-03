import request from '@/utils/request'

export function createChatSession(data) {
  return request({
    url: '/ai/chat/sessions',
    method: 'post',
    data
  })
}

export function sendChatMessage(sessionNo, data) {
  return request({
    url: `/ai/chat/sessions/${sessionNo}/messages`,
    method: 'post',
    data
  })
}
