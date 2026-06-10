import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, Wand2, Link2, FileText, Upload } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import LogicTree from '../components/LogicTree'
import SlideCard from '../components/SlideCard'
import type { Slide } from '../types'
import * as api from '../api/client'

type Tab = 'input' | 'structure' | 'slides'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, loading, fetchProject, updateContent, analyzeContent, generateSlides } =
    useProjectStore()
  const [tab, setTab] = useState<Tab>('input')
  const [content, setContent] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [slides, setSlides] = useState<Slide[]>([])

  useEffect(() => {
    if (id) fetchProject(id)
  }, [id, fetchProject])

  useEffect(() => {
    if (currentProject) {
      setContent(currentProject.raw_content || '')
      setSlides(currentProject.slides || [])
    }
  }, [currentProject])

  const handleSaveContent = useCallback(async () => {
    if (!id) return
    await updateContent(id, content)
  }, [id, content, updateContent])

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    try {
      const res = await api.fetchUrl(urlInput.trim())
      const fetched = res.data
      const combined = `# ${fetched.title}\n\n${fetched.content}`
      setContent((prev) => (prev ? prev + '\n\n---\n\n' + combined : combined))
      setUrlInput('')
    } finally {
      setUrlLoading(false)
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const res = await api.uploadPdf(file)
    setContent((prev) => (prev ? prev + '\n\n---\n\n' + res.data.text : res.data.text))
  }

  const handleAnalyze = async () => {
    if (!id) return
    await handleSaveContent()
    await analyzeContent(id)
    setTab('structure')
  }

  const handleGenerateSlides = async () => {
    if (!id) return
    await generateSlides(id)
    setTab('slides')
  }

  if (!currentProject) {
    if (error) return (
      <div className="p-8 space-y-3">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={() => id && fetchProject(id)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm">
          再試行
        </button>
      </div>
    )
    return <div className="p-8 text-gray-500">読み込み中...</div>
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'input', label: 'コンテンツ入力' },
    { key: 'structure', label: 'ロジック構造' },
    { key: 'slides', label: 'スライド' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4 px-3 md:px-6 py-3 md:py-4 border-b border-gray-800 bg-gray-900/50 flex-wrap">
        <button onClick={() => navigate('/projects')} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 truncate">{currentProject.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={loading || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Brain size={15} />
            {loading ? '分析中...' : '構造分析'}
          </button>
          <button
            onClick={handleGenerateSlides}
            disabled={loading || !currentProject.logic_structure}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Wand2 size={15} />
            {loading ? '生成中...' : 'スライド生成'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900/30">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-brand-400 border-b-2 border-brand-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
            {t.key === 'structure' && currentProject.logic_structure && (
              <span className="ml-1.5 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">済</span>
            )}
            {t.key === 'slides' && slides.length > 0 && (
              <span className="ml-1.5 text-xs bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">
                {slides.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 md:p-6">
        {tab === 'input' && (
          <div className="max-w-3xl space-y-4">
            {/* URL fetch */}
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus-within:border-brand-500">
                <Link2 size={14} className="text-gray-500" />
                <input
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
                  placeholder="URLから記事を取得..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                />
              </div>
              <button
                onClick={handleFetchUrl}
                disabled={urlLoading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm disabled:opacity-50"
              >
                {urlLoading ? '取得中...' : '取得'}
              </button>
              <label className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm cursor-pointer">
                <Upload size={14} />
                PDF
                <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
              </label>
            </div>

            <textarea
              className="w-full h-96 bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 font-mono outline-none resize-none focus:border-brand-500 leading-relaxed"
              placeholder="Markdown、テキスト、またはNote記事をここに貼り付けてください..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{content.length.toLocaleString()} 文字</span>
              <button
                onClick={handleSaveContent}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm"
              >
                <FileText size={14} className="inline mr-1.5" />
                保存
              </button>
            </div>
          </div>
        )}

        {tab === 'structure' && (
          <div className="max-w-3xl">
            {currentProject.logic_structure ? (
              <LogicTree structure={currentProject.logic_structure} />
            ) : (
              <div className="text-gray-500 text-sm py-12 text-center">
                コンテンツ入力タブで「構造分析」を実行してください
              </div>
            )}
          </div>
        )}

        {tab === 'slides' && (
          <div>
            {slides.length === 0 ? (
              <div className="text-gray-500 text-sm py-12 text-center">
                構造分析後に「スライド生成」を実行してください
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {slides
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((slide) => (
                    <SlideCard
                      key={slide.id}
                      slide={slide}
                      projectId={currentProject.id}
                      onUpdate={(updated) =>
                        setSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
                      }
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
