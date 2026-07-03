export function unwrapResult(response, fallbackMessage = '请求失败') {
  if (response && typeof response.code === 'number') {
    if (response.code !== 200) {
      throw new Error(response.message || fallbackMessage)
    }

    return response.data
  }

  return response?.data ?? response
}
