const CT_VIEWER_API_BASE = import.meta.env.VITE_CT_VIEWER_API_BASE
const CT_VIEWER_DEV_FALLBACK = 'http://127.0.0.1:8000/api'

function getCtViewerApiBase() {
  if (CT_VIEWER_API_BASE) {
    return CT_VIEWER_API_BASE
  }

  if (import.meta.env.DEV) {
    return CT_VIEWER_DEV_FALLBACK
  }

  throw new Error('未配置 CT 可视化服务地址，请设置 VITE_CT_VIEWER_API_BASE')
}

async function expectOk(response) {
  if (!response.ok) {
    let message = `请求失败: ${response.status}`
    try {
      const body = await response.json()
      message = body.error || body.message || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return response
}

export async function uploadDicomFilesForViewer(files) {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file, file.webkitRelativePath || file.name)
  })

  const response = await fetch(`${getCtViewerApiBase()}/load-dicom`, {
    method: 'POST',
    body: formData
  })

  await expectOk(response)
  return response.json()
}

export async function fetchViewerVolumeNrrd(volumeId) {
  const response = await fetch(`${getCtViewerApiBase()}/volume/${volumeId}/nrrd`)
  await expectOk(response)
  return response.arrayBuffer()
}
