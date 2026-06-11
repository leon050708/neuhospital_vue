export function createEventStream(url, options = {}) {
  const { accessToken } = options
  const targetUrl = new URL(url, window.location.origin)

  if (accessToken) {
    targetUrl.searchParams.set('accessToken', accessToken)
  }

  return new EventSource(targetUrl.toString())
}
