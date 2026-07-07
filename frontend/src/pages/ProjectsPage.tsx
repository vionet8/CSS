import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Trash2, ChevronRight, Download, Upload } from 'lucide-react'
import { useProjectStore, errorDetail } from '../store/projectStore'
import * as api from '../api/client'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, loading, error, fetchProjects, createProject, deleteProject } = useProjectStore()
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    try {
      const p = await createProject(newTitle.trim())
      if (!p?.id) throw new Error(`IDが取得できませんでした: ${JSON.stringify(p)}`)
      setNewTitle('')
      setCreating(false)
      navigate(`/projects/${p.id}`)
    } catch (e) {
      alert(`プロジェクト作成エラー: ${errorDetail(e)}`)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) return
    try {
      await deleteProject(id)
    } catch (e) {
      alert(`削除エラー: ${errorDetail(e)}`)
    }
  }

  const handleExport = async (id: string, title: string) => {
    try {
      const res = await api.exportProject(id)
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'project'}.css-project.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`エクスポートエラー: ${errorDetail(e)}`)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.title) throw new Error('title フィールドがありません')
      const res = await api.importProject(data)
      await fetchProjects()
      navigate(`/projects/${res.data.id}`)
    } catch (err) {
      alert(`インポートエラー: ${err instanceof SyntaxError ? 'JSONの形式が不正です' : errorDetail(err)}`)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">プロジェクト</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors">
            <Upload size={16} />
            インポート
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
          </label>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusCircle size={16} />
            新規作成
          </button>
        </div>
      </div>

      {creating && (
        <div className="mb-4 flex gap-2">
          <input
            autoFocus
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-500"
            placeholder="プロジェクト名"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
          />
          <button onClick={handleCreate} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm">作成</button>
          <button onClick={() => setCreating(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">キャンセル</button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
          <button onClick={fetchProjects} className="ml-3 underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">読み込み中...</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-500 text-sm py-12 text-center">プロジェクトがありません</div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl px-5 py-4 cursor-pointer transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{p.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.has_structure ? '構造済み' : '未分析'}
                  {p.slide_count > 0 && ` · ${p.slide_count}枚のスライド`}
                  {' · '}
                  {new Date(p.updated_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <button
                title="JSONエクスポート"
                onClick={(e) => { e.stopPropagation(); handleExport(p.id, p.title) }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-brand-400 transition-opacity"
              >
                <Download size={16} />
              </button>
              <button
                title="削除"
                onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.title) }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
              <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
