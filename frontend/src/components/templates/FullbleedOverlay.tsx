import type { Slide } from '../../types'

export default function FullbleedOverlay({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  return (
    <div
      className="w-full h-full flex flex-col justify-end relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, #0f0c29, #302b63, #24243e)` }}
    >
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
      <div className="relative z-10 px-12 pb-14">
        {slide.subtitle && (
          <span className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
            style={{ background: accent, color: 'white' }}>
            {slide.subtitle}
          </span>
        )}
        <h1 className="text-4xl font-bold text-white leading-snug mb-4 max-w-2xl">{slide.title}</h1>
        {slide.body && (
          <p className="text-white/70 text-base max-w-xl leading-relaxed">{slide.body}</p>
        )}
      </div>
    </div>
  )
}
