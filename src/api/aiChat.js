import request from '@/utils/request'

const AI_CHAT_TIMEOUT = 60000

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
    data,
    timeout: AI_CHAT_TIMEOUT
  })
}
