import { useState } from 'react'
import { Pencil, Sparkles, Check, X, LayoutTemplate, User, Move } from 'lucide-react'
import type { Slide, TemplateType, CharacterEmotion } from '../types'
import { SlideRenderer, TEMPLATE_LABELS } from './templates'
import CharacterPositionEditor from './CharacterPositionEditor'
import * as api from '../api/client'

interface Props {
  slide: Slide
  projectId: string
  character?: string
  onUpdate: (slide: Slide) => void
}

const EMOTIONS: { value: CharacterEmotion; label: string }[] = [
  { value: 'normal',      label: '通常' },
  { value: 'happy',       label: '喜び' },
  { value: 'very_happy',  label: '大喜び' },
  { value: 'surprised',   label: '驚き' },
  { value: 'sad',         label: '悲しみ' },
  { value: 'crying',      label: '泣き' },
  { value: 'angry',       label: '怒り' },
  { value: 'thinking',    label: '考え中' },
  { value: 'smug',        label: 'ドヤ顔' },
  { value: 'embarrassed', label: '恥ずかし' },
  { value: 'explaining',  label: '説明' },
]

export default function SlideCard({ slide, projectId, character, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [improving, setImproving] = useState(false)
  const [changingTemplate, setChangingTemplate] = useState(false)
  const [changingEmotion, setChangingEmotion] = useState(false)
  const [positionEditing, setPositionEditing] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [draft, setDraft] = useState({ title: slide.title, body: slide.body })
  const [busy, setBusy] = useState(false)

  const emotion = slide.character_emotion || 'normal'
  const charImageUrl = character
    ? api.getCharacterImageUrl(character, emotion)
    : null

  const charX     = slide.character_x     ?? 68
  const charY     = slide.character_y     ?? 0
  const charScale = slide.character_scale ?? 0.55

  const savePosition = async (x: number, y: number, s: number) => {
    setBusy(true)
    try {
      const res = await api.updateSlide(projectId, slide.id, { character_x: x, character_y: y, character_scale: s })
      onUpdate(res.data.slide)
      setPositionEditing(false)
    } finally {
      setBusy(false)
    }
  }

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

  const changeEmotion = async (e: CharacterEmotion) => {
    setBusy(true)
    try {
      const res = await api.updateSlide(projectId, slide.id, { character_emotion: e })
      onUpdate(res.data.slide)
      setChangingEmotion(false)
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
          <div className="relative">
            <SlideRenderer slide={slide} />
            {charImageUrl && !positionEditing && (
              <img
                src={charImageUrl}
                alt={`${character} ${emotion}`}
                className="absolute pointer-events-none drop-shadow-lg"
                style={{
                  bottom: `${charY}%`,
                  left:   `${charX}%`,
                  height: `${charScale * 100}%`,
                  objectFit: 'contain',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Template + emotion label */}
      <div className="px-3 py-1 bg-gray-800/50 text-xs text-gray-500 border-t border-gray-700/50 flex justify-between">
        <span>{TEMPLATE_LABELS[slide.template] || slide.template}</span>
        {character && (
          <span className="text-gray-600">
            {EMOTIONS.find(e => e.value === emotion)?.label || emotion}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-gray-700 flex-wrap">
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
            {character && (
              <button onClick={() => setChangingEmotion((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
                <User size={12} /> 表情
              </button>
            )}
            {character && (
              <button onClick={() => { setPositionEditing(true); setChangingEmotion(false); setChangingTemplate(false) }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
                <Move size={12} /> 配置
              </button>
            )}
            <button onClick={() => setImproving((v) => !v)}
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
              <Sparkles size={12} /> AI改善
            </button>
          </>
        )}
      </div>

      {/* Emotion picker */}
      {changingEmotion && (
        <div className="px-3 pb-3 border-t border-gray-700 pt-2">
          <div className="grid grid-cols-4 gap-1">
            {EMOTIONS.map(({ value, label }) => (
              <button key={value} onClick={() => changeEmotion(value)} disabled={busy}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  emotion === value
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Position editor */}
      {positionEditing && character && (
        <div className="px-3 pb-3 border-t border-gray-700 pt-3">
          <CharacterPositionEditor
            slide={slide}
            character={character}
            onSave={savePosition}
            onCancel={() => setPositionEditing(false)}
          />
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
