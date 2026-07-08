import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 120000,
})

export default api

// Projects
export const getProjects = () => api.get('/projects/')
export const getProject = (id: string) => api.get(`/projects/${id}`)
export const createProject = (data: { title: string; description?: string; raw_content?: string }) =>
  api.post('/projects/', data)
export const updateProject = (id: string, data: Record<string, unknown>) =>
  api.patch(`/projects/${id}`, data)
export const deleteProject = (id: string) => api.delete(`/projects/${id}`)
export const analyzeProject = (id: string) => api.post(`/projects/${id}/analyze`)
export const generateSlides = (id: string) => api.post(`/projects/${id}/generate-slides`)
export const updateSlide = (projectId: string, slideId: string, data: Record<string, unknown>) =>
  api.patch(`/projects/${projectId}/slides/${slideId}`, data)
export const improveSlide = (projectId: string, slideId: string, instruction: string) =>
  api.post(`/projects/${projectId}/slides/improve`, { slide_id: slideId, instruction })
export const exportProject = (id: string) => api.get(`/projects/${id}/export`)
export const importProject = (data: Record<string, unknown>) =>
  api.post('/projects/import', data)

// Marketing
export const getMarketingOptions = () => api.get('/marketing/options')
export const saveMarketingProfile = (id: string, profile: import('../types').MarketingProfile) =>
  api.put(`/projects/${id}/marketing/profile`, profile)
export const analyzeMarketing = (id: string, framework: string) =>
  api.post(`/projects/${id}/marketing/analyze`, { framework })
export const generateMarketingAsset = (id: string, assetType: string) =>
  api.post(`/projects/${id}/marketing/assets`, { asset_type: assetType })
export const deleteMarketingAsset = (id: string, assetType: string) =>
  api.delete(`/projects/${id}/marketing/assets/${assetType}`)
export const auditMarketingProfile = (id: string) =>
  api.post(`/projects/${id}/marketing/profile/audit`)
export const importMaterial = (id: string, text: string, sourceName?: string) =>
  api.post(`/projects/${id}/marketing/materials`, { text, source_name: sourceName ?? '' })
export const deleteMaterialFragment = (id: string, fragmentId: string) =>
  api.delete(`/projects/${id}/marketing/materials/${fragmentId}`)
export const exportLpHtml = (
  id: string, ctaUrl: string, accent: string, template: string, catchcopyIndex?: number
) =>
  api.get<string>(`/projects/${id}/marketing/lp.html`, {
    params: {
      cta_url: ctaUrl, accent, template,
      ...(catchcopyIndex != null && catchcopyIndex >= 0 ? { catchcopy_index: catchcopyIndex } : {}),
    },
    responseType: 'text',
  })

// Content
export const fetchUrl = (url: string) => api.post('/content/fetch-url', { url })
export const parseMarkdown = (text: string) => api.post('/content/parse-markdown', { text })
export const uploadPdf = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/content/upload-pdf', fd)
}

// Video
const API_BASE = import.meta.env.VITE_API_URL || '/api'
export const getVideoTools = (id: string) => api.get(`/projects/${id}/video/tools`)
export const uploadVideoFrame = (id: string, order: number, blob: Blob) => {
  const fd = new FormData()
  fd.append('order', String(order))
  fd.append('file', blob, `${order}.png`)
  return api.post(`/projects/${id}/video/frames`, fd)
}
export const renderVideo = (id: string, character: string) =>
  api.post(`/projects/${id}/video/render`, { character }, { timeout: 600000 })
export const getSrt = (id: string) =>
  api.get<string>(`/projects/${id}/video/subtitles.srt`, { responseType: 'text' })
export const videoFileUrl = (id: string) => `${API_BASE}/projects/${id}/video/file`
export const videoSrtUrl = (id: string) => `${API_BASE}/projects/${id}/video/file.srt`

// FPRL認知変化分析
export const getFprlStages = () => api.get('/projects/x/fprl/stages')
export const analyzeFprl = (id: string) =>
  api.post(`/projects/${id}/fprl/analyze`, {}, { timeout: 300000 })

// YouTube分析
export const analyzeYoutube = (id: string, url: string) =>
  api.post(`/projects/${id}/youtube/analyze`, { url }, { timeout: 300000 })
export const deleteYoutubeAnalysis = (id: string, videoId: string) =>
  api.delete(`/projects/${id}/youtube/${videoId}`)

// Media (動画・音声取り込み)
export const getMediaTools = () => api.get('/media/tools')
export const uploadMedia = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/media/upload', fd, { timeout: 600000 })
}
export const transcribeMedia = (filename: string, modelSize = 'small') =>
  api.post('/media/transcribe', { filename, model_size: modelSize }, { timeout: 1800000 })

// Characters
export const getCharacters = () => api.get('/characters/')
export const getCharacterEmotions = (name: string) => api.get(`/characters/${name}/emotions`)
export const getCharacterImageUrl = (character: string, emotion: string) =>
  `${import.meta.env.VITE_API_URL || '/api'}/static/characters/${character}_${emotion}.png`

// Images
export const uploadImage = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/images/upload', fd)
}
export const getImageUrl = (filename: string) =>
  `${import.meta.env.VITE_API_URL || '/api'}/images/file/${filename}`
export const resizeImage = (filename: string, width: number, height: number) =>
  api.post('/images/resize', { filename, width, height })
export const cropImage = (filename: string, x: number, y: number, width: number, height: number) =>
  api.post('/images/crop', { filename, x, y, width, height })
export const splitImage = (filename: string, count: number) =>
  api.post('/images/split', { filename, count })
