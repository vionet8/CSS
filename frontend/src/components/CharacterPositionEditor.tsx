import { useRef, useState, useCallback } from 'react'
import type { Slide } from '../types'
import { SlideRenderer } from './templates'
import * as api from '../api/client'

interface Props {
  slide: Slide
  character: string
  onSave: (x: number, y: number, scale: number) => void
  onCancel: () => void
}

export default function CharacterPositionEditor({ slide, character, onSave, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [x, setX]         = useState(slide.character_x     ?? 68)
  const [y, setY]         = useState(slide.character_y     ?? 0)
  const [scale, setScale] = useState(slide.character_scale ?? 0.55)
  const dragging = useRef(false)

  const charUrl = api.getCharacterImageUrl(character, slide.character_emotion || 'normal')

  const toPercent = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = ((e.clientX - rect.left) / rect.width)  * 100
    const py = ((rect.bottom - e.clientY) / rect.height) * 100
    setX(Math.max(0, Math.min(90, px)))
    setY(Math.max(0, Math.min(80, py)))
  }, [])

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    toPercent(e)
    const move = (ev: MouseEvent) => { if (dragging.current) toPercent(ev) }
    const up   = () => { dragging.current = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">スライド上をクリック/ドラッグしてキャラの位置を調整</p>

      {/* Preview with draggable character */}
      <div
        ref={containerRef}
        className="relative w-full cursor-crosshair rounded overflow-hidden border border-gray-600"
        style={{ aspectRatio: '16/9' }}
        onMouseDown={onMouseDown}
      >
        <SlideRenderer slide={slide} />
        <img
          src={charUrl}
          alt="character"
          className="absolute pointer-events-none drop-shadow-lg"
          style={{
            bottom: `${y}%`,
            left:   `${x}%`,
            height: `${scale * 100}%`,
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Scale slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-12">サイズ</span>
        <input
          type="range" min="0.2" max="1.0" step="0.05"
          value={scale}
          onChange={e => setScale(parseFloat(e.target.value))}
          className="flex-1 accent-brand-500"
        />
        <span className="text-xs text-gray-400 w-10">{Math.round(scale * 100)}%</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-gray-200 bg-gray-800">
          キャンセル
        </button>
        <button
          onClick={() => onSave(x, y, scale)}
          className="px-4 py-1.5 rounded text-xs text-white bg-brand-600 hover:bg-brand-700"
        >
          保存
        </button>
      </div>
    </div>
  )
}
