import { create } from 'zustand'
import type { Project, ProjectSummary } from '../types'
import * as api from '../api/client'

interface ProjectStore {
  projects: ProjectSummary[]
  currentProject: Project | null
  loading: boolean
  error: string | null

  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (title: string, description?: string) => Promise<Project>
  updateContent: (id: string, content: string) => Promise<void>
  analyzeContent: (id: string) => Promise<void>
  generateSlides: (id: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  clearError: () => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const res = await api.getProjects()
      if (!Array.isArray(res.data)) {
        set({ error: `API応答が不正です: ${typeof res.data}`, loading: false })
        return
      }
      set({ projects: res.data, loading: false })
    } catch (e: unknown) {
      const axiosErr = e as { response?: { status: number; data?: unknown }; message?: string }
      const detail = axiosErr?.response
        ? `HTTP ${axiosErr.response.status}: ${JSON.stringify(axiosErr.response.data)}`
        : axiosErr?.message || '不明なエラー'
      set({ error: `プロジェクト一覧の取得に失敗しました — ${detail}`, loading: false })
    }
  },

  fetchProject: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await api.getProject(id)
      set({ currentProject: res.data, loading: false })
    } catch (e: unknown) {
      const axiosErr = e as { response?: { status: number; data?: unknown }; message?: string }
      const detail = axiosErr?.response
        ? `HTTP ${axiosErr.response.status}: ${JSON.stringify(axiosErr.response.data)}`
        : axiosErr?.message || '不明なエラー'
      set({ error: `プロジェクトの取得に失敗しました — ${detail}`, loading: false })
    }
  },

  createProject: async (title, description = '') => {
    const res = await api.createProject({ title, description })
    await get().fetchProjects()
    return res.data
  },

  updateContent: async (id, content) => {
    await api.updateProject(id, { raw_content: content })
    const res = await api.getProject(id)
    set({ currentProject: res.data })
  },

  analyzeContent: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.analyzeProject(id)
      const res = await api.getProject(id)
      set({ currentProject: res.data, loading: false })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '分析に失敗しました'
      set({ error: msg, loading: false })
    }
  },

  generateSlides: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.generateSlides(id)
      const res = await api.getProject(id)
      set({ currentProject: res.data, loading: false })
    } catch {
      set({ error: 'スライド生成に失敗しました', loading: false })
    }
  },

  deleteProject: async (id) => {
    await api.deleteProject(id)
    await get().fetchProjects()
    const current = get().currentProject
    if (current?.id === id) set({ currentProject: null })
  },

  clearError: () => set({ error: null }),
}))
