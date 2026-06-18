import request from '@/utils/request'

export function createCtAnalysisTask(data) {
  return request({
    url: '/ct-analysis/tasks',
    method: 'post',
    data
  })
}

export function getCtAnalysisResult(taskId) {
  return request({
    url: `/ct-analysis/results/${taskId}`,
    method: 'get'
  })
}
