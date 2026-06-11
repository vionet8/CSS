import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Slide } from '../types'
import { SlideRenderer } from './templates'
import * as api from '../api/client'

interface Props {
  slides: Slide[]
  initialIndex?: number
  character?: string
  onClose: () => void
}

export default function FullscreenPresenter({ slides, initialIndex = 0, character, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const containerRef = useRef<HTMLDivElement>(null)
  const sorted = [...slides].sort((a, b) => a.order - b.order)
  const slide = sorted[index]

  const prev = () => setIndex(i => Math.max(0, i - 1))
  const next = () => setIndex(i => Math.min(sorted.length - 1, i + 1))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const charUrl = character
    ? api.getCharacterImageUrl(character, slide.character_emotion || 'normal')
    : null

  const charX     = slide.character_x     ?? 68
  const charY     = slide.character_y     ?? 0
  const charScale = slide.character_scale ?? 0.55

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/50 hover:text-white transition-colors"
      >
        <X size={28} />
      </button>

      {/* Slide count */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/40 text-sm">
        {index + 1} / {sorted.length}
      </div>

      {/* Slide area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-full" style={{ maxWidth: 'calc((100vh - 96px) * 16 / 9)' }}>
          <SlideRenderer slide={slide} />
          {charUrl && (
            <img
              src={charUrl}
              alt="character"
              className="absolute pointer-events-none drop-shadow-xl"
              style={{
                bottom: `${charY}%`,
                left:   `${charX}%`,
                height: `${charScale * 100}%`,
                objectFit: 'contain',
              }}
            />
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

        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {sorted.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                i === index ? 'bg-white w-5 h-2' : 'bg-white/30 w-2 h-2'
              }`}
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

      {/* Keyboard hint */}
      <div className="absolute bottom-4 right-4 text-white/20 text-xs">
        ← → キーで操作 · Esc で終了
      </div>
    </div>
  )
}
