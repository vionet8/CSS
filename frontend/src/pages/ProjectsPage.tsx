import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Trash2, ChevronRight } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'

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
      alert(`プロジェクト作成エラー: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">プロジェクト</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle size={16} />
          新規作成
        </button>
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
                onClick={(e) => { e.stopPropagation(); deleteProject(p.id) }}
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
