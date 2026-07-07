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

// Content
export const fetchUrl = (url: string) => api.post('/content/fetch-url', { url })
export const parseMarkdown = (text: string) => api.post('/content/parse-markdown', { text })
export const uploadPdf = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/content/upload-pdf', fd)
}

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
