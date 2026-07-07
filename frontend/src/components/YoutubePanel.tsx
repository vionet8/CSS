import { useState } from 'react'
import { Youtube, Trash2, FileText, Lightbulb, RefreshCw } from 'lucide-react'
import type { Project, YoutubeAnalysisEntry } from '../types'
import { errorDetail } from '../store/projectStore'
import * as api from '../api/client'

interface Props {
  project: Project
  onRefresh: () => Promise<void> | void
  onAppendContent: (text: string) => void
}

const SECTION_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444']

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  return `${m}分${Math.floor(sec % 60)}秒`
}

export default function YoutubePanel({ project, onRefresh, onAppendContent }: Props) {
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const analyses = Object.values(project.assets?.youtube_analyses ?? {}).sort(
    (a, b) => (a.analyzed_at < b.analyzed_at ? 1 : -1)
  )

  const analyze = async () => {
    if (!url.trim()) return
    setAnalyzing(true)
    try {
      await api.analyzeYoutube(project.id, url.trim())
      setUrl('')
      await onRefresh()
    } catch (e) {
      alert(`動画分析エラー: ${errorDetail(e)}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const remove = async (videoId: string) => {
    try {
      await api.deleteYoutubeAnalysis(project.id, videoId)
      await onRefresh()
    } catch (e) {
      alert(`削除エラー: ${errorDetail(e)}`)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="flex items-center gap-2 text-white font-semibold mb-1">
          <Youtube size={16} className="text-red-400" />
          人気動画の構成分析
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          参考にしたいYouTube動画のURLを入れると、字幕・メタデータから構成（時間配分・フック・CTA）を分析します。
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
          />
          <button
            onClick={analyze}
            disabled={analyzing || !url.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Youtube size={14} />}
            {analyzing ? '分析中...' : '分析'}
          </button>
        </div>
      </section>

      {analyses.map((a: YoutubeAnalysisEntry) => (
        <section key={a.video_id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a href={a.url} target="_blank" rel="noreferrer" className="text-white font-semibold hover:text-brand-400">
                {a.title}
              </a>
              <p className="text-xs text-gray-500 mt-0.5">
                {a.channel} · {fmtDuration(a.duration)} · 再生 {a.view_count.toLocaleString()} · 👍 {a.like_count.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {a.transcript_text && (
                <button
                  onClick={() => onAppendContent(`# ${a.title} の文字起こし\n\n${a.transcript_text}`)}
                  title="文字起こしをコンテンツ入力に追加"
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
                >
                  <FileText size={12} /> 入力へ
                </button>
              )}
              <button onClick={() => remove(a.video_id)} className="text-gray-500 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-300">{a.analysis.summary}</p>

          {/* 時間配分バー */}
          {a.analysis.sections.length > 0 && (
            <div>
              <div className="flex h-6 rounded-lg overflow-hidden">
                {a.analysis.sections.map((s, i) => (
                  <div
                    key={i}
                    title={`${s.label} (${s.share_pct}%) — ${s.purpose}`}
                    style={{ width: `${Math.max(2, s.share_pct)}%`, background: SECTION_COLORS[i % SECTION_COLORS.length] }}
                  />
                ))}
              </div>
              <div className="mt-2 space-y-1">
                {a.analysis.sections.map((s, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-xs">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: SECTION_COLORS[i % SECTION_COLORS.length] }} />
                    <span className="text-gray-300 font-medium shrink-0">{s.label}（{s.share_pct}%）</span>
                    <span className="text-gray-500">{s.purpose}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-800/60 rounded-lg p-3">
              <p className="text-xs font-semibold text-brand-400 mb-1">フック（冒頭）</p>
              <p className="text-gray-300">{a.analysis.hook}</p>
            </div>
            <div className="bg-gray-800/60 rounded-lg p-3">
              <p className="text-xs font-semibold text-brand-400 mb-1">CTA</p>
              <p className="text-gray-300">{a.analysis.cta}</p>
            </div>
          </div>

          {a.analysis.takeaways.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-yellow-300 mb-1.5">
                <Lightbulb size={12} /> 自分のコンテンツへの学び
              </p>
              <ul className="text-sm text-yellow-100/90 space-y-1 list-disc list-inside">
                {a.analysis.takeaways.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
