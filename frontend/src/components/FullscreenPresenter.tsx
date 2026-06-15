import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Mic, MicOff, X } from 'lucide-react'
import type { Slide } from '../types'
import { SlideRenderer } from './templates'
import AnimatedCharacter from './AnimatedCharacter'
import * as api from '../api/client'

interface Props {
  slides: Slide[]
  initialIndex?: number
  character?: string
  onClose: () => void
}

export default function FullscreenPresenter({ slides, initialIndex = 0, character, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [nod, setNod] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevIndexRef = useRef(initialIndex)

  const sorted = [...slides].sort((a, b) => a.order - b.order)
  const slide = sorted[index]

  const prev = () => setIndex(i => Math.max(0, i - 1))
  const next = () => setIndex(i => Math.min(sorted.length - 1, i + 1))

  // Trigger nod on slide change
  useEffect(() => {
    if (index !== prevIndexRef.current) {
      setNod(true)
      setTimeout(() => setNod(false), 800)
      prevIndexRef.current = index
    }
  }, [index])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // VOICEVOX narration for current slide
  useEffect(() => {
    if (!voiceEnabled || !character) return
    const notes = slide.speaker_notes
    if (!notes?.trim()) return

    setSpeaking(true)
    const audio = new Audio()
    audioRef.current = audio

    const speaker = character === 'metan' ? 2 : 3
    const apiBase = import.meta.env.VITE_API_URL || '/api'

    // Use VOICEVOX directly from frontend (needs VOICEVOX running)
    const play = async () => {
      try {
        const qRes = await fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(notes)}&speaker=${speaker}`, {
          method: 'POST',
        })
        if (!qRes.ok) { setSpeaking(false); return }
        const query = await qRes.json()
        query.speedScale = 1.1

        const sRes = await fetch(`http://localhost:50021/synthesis?speaker=${speaker}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
        })
        if (!sRes.ok) { setSpeaking(false); return }

        const blob = await sRes.blob()
        const url = URL.createObjectURL(blob)
        audio.src = url
        audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url) }
        audio.play().catch(() => setSpeaking(false))
      } catch {
        setSpeaking(false)
      }
    }
    play()

    return () => {
      audio.pause()
      setSpeaking(false)
    }
  }, [index, voiceEnabled, character, slide.speaker_notes])

  const charX     = slide.character_x     ?? 68
  const charY     = slide.character_y     ?? 0
  const charScale = slide.character_scale ?? 0.55

  // Current emotion — when speaking, prefer "explaining"
  const emotion = speaking ? 'explaining' : (slide.character_emotion || 'normal')

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white/50 hover:text-white transition-colors">
        <X size={28} />
      </button>

      {/* Slide count */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/40 text-sm">
        {index + 1} / {sorted.length}
      </div>

      {/* VOICEVOX toggle (top-left) */}
      {character && (
        <button
          onClick={() => setVoiceEnabled(v => !v)}
          className={`absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            voiceEnabled
              ? speaking
                ? 'bg-brand-600/80 text-white animate-pulse'
                : 'bg-brand-600/60 text-white'
              : 'bg-white/10 text-white/40 hover:bg-white/20'
          }`}
        >
          {voiceEnabled ? <Mic size={12} /> : <MicOff size={12} />}
          {voiceEnabled ? (speaking ? '読み上げ中...' : 'ナレーション ON') : 'ナレーション OFF'}
        </button>
      )}

      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-full" style={{ maxWidth: 'calc((100vh - 96px) * 16 / 9)' }}>
          <SlideRenderer slide={slide} />

          {character && (
            <div
              className="absolute pointer-events-none drop-shadow-xl"
              style={{
                bottom: `${charY}%`,
                left: `${charX}%`,
                height: `${charScale * 100}%`,
              }}
            >
              <AnimatedCharacter
                character={character}
                emotion={emotion}
                audioRef={audioRef}
                width={200}
                height={320}
                nod={nod}
                className="h-full w-auto"
              />
            </div>
          )}
        </div>
      </div>

      {/* Nav bar */}
      <div className="flex items-center justify-center gap-6 pb-6">
        <button
          onClick={prev}
          disabled={index === 0}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-1.5">
          {sorted.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${i === index ? 'bg-white w-5 h-2' : 'bg-white/30 w-2 h-2'}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={index === sorted.length - 1}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="absolute bottom-4 right-4 text-white/20 text-xs">
        ← → キーで操作 · Esc で終了
      </div>
    </div>
  )
}
