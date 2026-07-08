import type { SlideEffect } from '../types'

export const EFFECT_LABELS: Record<SlideEffect, string> = {
  burst: '集中線',
  stamp: '重要スタンプ',
  spotlight: 'スポットライト',
}

/** 集中線: 960x540基準のSVG。外周から中央へ向かう漫画的な三角形の束 */
function BurstLines() {
  const cx = 480
  const cy = 270
  const lines = []
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2 + (i % 2) * 0.04
    const outer = 720
    const inner = 250 + (i % 3) * 28
    const spread = 0.012 + (i % 4) * 0.004
    const x1 = cx + Math.cos(angle - spread) * outer
    const y1 = cy + Math.sin(angle - spread) * outer
    const x2 = cx + Math.cos(angle + spread) * outer
    const y2 = cy + Math.sin(angle + spread) * outer
    const xi = cx + Math.cos(angle) * inner
    const yi = cy + Math.sin(angle) * inner
    lines.push(<polygon key={i} points={`${x1},${y1} ${x2},${y2} ${xi},${yi}`} />)
  }
  return (
    <svg
      viewBox="0 0 960 540"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      fill="rgba(0,0,0,0.28)"
    >
      {lines}
    </svg>
  )
}

function Stamp() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 22,
        left: 22,
        width: 112,
        height: 112,
        borderRadius: '50%',
        border: '5px solid #dc2626',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 34,
        fontWeight: 900,
        transform: 'rotate(-12deg)',
        background: 'rgba(255,255,255,0.75)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        letterSpacing: 2,
      }}
    >
      重要
    </div>
  )
}

function Spotlight() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)',
      }}
    />
  )
}

/** スライドの注目演出オーバーレイ。SlideRenderer の 960x540 レイヤー内で描画され、
    PNG書き出し・動画にもそのまま焼き込まれる */
export default function SlideEffects({ effects }: { effects?: SlideEffect[] }) {
  if (!effects?.length) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {effects.includes('burst') && <BurstLines />}
      {effects.includes('spotlight') && <Spotlight />}
      {effects.includes('stamp') && <Stamp />}
    </div>
  )
}
