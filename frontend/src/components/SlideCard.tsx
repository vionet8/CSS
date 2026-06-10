import { useState } from 'react'
import { Pencil, Sparkles, Check, X, LayoutTemplate } from 'lucide-react'
import type { Slide, TemplateType } from '../types'
import { SlideRenderer, TEMPLATE_LABELS } from './templates'
import * as api from '../api/client'

interface Props {
  slide: Slide
  projectId: string
  onUpdate: (slide: Slide) => void
}

export default function SlideCard({ slide, projectId, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [improving, setImproving] = useState(false)
  const [changingTemplate, setChangingTemplate] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [draft, setDraft] = useState({ title: slide.title, body: slide.body })
  const [busy, setBusy] = useState(false)

  const saveEdit = async () => {
    setBusy(true)
    try {
      const res = await api.updateSlide(projectId, slide.id, draft)
      onUpdate(res.data.slide)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const applyImprovement = async () => {
    if (!instruction.trim()) return
    setBusy(true)
    try {
      const res = await api.improveSlide(projectId, slide.id, instruction)
      onUpdate(res.data.slide)
      setImproving(false)
      setInstruction('')
    } finally {
      setBusy(false)
    }
  }

  const changeTemplate = async (t: TemplateType) => {
    setBusy(true)
    try {
      const res = await api.updateSlide(projectId, slide.id, { template: t })
      onUpdate(res.data.slide)
      setChangingTemplate(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 overflow-hidden bg-gray-900">
      {/* Slide preview */}
      <div className="relative">
        <span className="absolute top-2 right-2 z-10 text-xs text-white/40 bg-black/40 px-1.5 py-0.5 rounded">
          #{slide.order}
        </span>
        {editing ? (
          <div className="aspect-video bg-gray-800 p-4 flex flex-col gap-2">
            <input
              className="bg-white/10 rounded px-2 py-1 text-white text-sm font-bold outline-none"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <textarea
              className="flex-1 bg-white/10 rounded px-2 py-1 text-white text-xs outline-none resize-none"
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            />
          </div>
        ) : (
          <SlideRenderer slide={slide} />
        )}
      </div>

      {/* Template label */}
      <div className="px-3 py-1 bg-gray-800/50 text-xs text-gray-500 border-t border-gray-700/50">
        {TEMPLATE_LABELS[slide.template] || slide.template}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-gray-700">
        {editing ? (
          <>
            <button onClick={saveEdit} disabled={busy} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
              <Check size={12} /> 保存
            </button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300">
              <X size={12} /> キャンセル
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setDraft({ title: slide.title, body: slide.body }); setEditing(true) }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
              <Pencil size={12} /> 編集
            </button>
            <button onClick={() => setChangingTemplate((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
              <LayoutTemplate size={12} /> テンプレ
            </button>
            <button onClick={() => setImproving((v) => !v)}
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
              <Sparkles size={12} /> AI改善
            </button>
          </>
        )}
      </div>

      {/* Template picker */}
      {changingTemplate && (
        <div className="px-3 pb-3 border-t border-gray-700 pt-2">
          <div className="grid grid-cols-3 gap-1">
            {(Object.entries(TEMPLATE_LABELS) as [TemplateType, string][]).map(([key, label]) => (
              <button key={key} onClick={() => changeTemplate(key)} disabled={busy}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  slide.template === key
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI improve */}
      {improving && (
        <div className="px-3 pb-3 flex gap-2 border-t border-gray-700 pt-2">
          <input
            className="flex-1 bg-gray-800 rounded px-2 py-1 text-sm text-white outline-none border border-gray-700 focus:border-brand-500"
            placeholder="改善指示（例: もっと具体例を追加）"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyImprovement()}
          />
          <button onClick={applyImprovement} disabled={busy}
            className="px-3 py-1 bg-brand-600 hover:bg-brand-700 rounded text-sm text-white disabled:opacity-50">
            {busy ? '...' : '実行'}
          </button>
        </div>
      )}
    </div>
  )
}
