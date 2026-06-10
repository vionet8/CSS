import type { Slide } from '../../types'

export default function SplitDark({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const lines = slide.body?.split('\n').filter(Boolean) || []
  return (
    <div className="w-full h-full flex">
      <div className="w-2/5 flex flex-col justify-center px-10 py-8" style={{ background: '#1a1a2e' }}>
        {slide.subtitle && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: accent }}>
            {slide.subtitle}
          </p>
        )}
        <h1 className="text-3xl font-bold text-white leading-snug">{slide.title}</h1>
        <div className="mt-4 w-12 h-1 rounded" style={{ background: accent }} />
      </div>
      <div className="flex-1 flex flex-col justify-center px-10 py-8 bg-white">
        {lines.length > 0 ? (
          <ul className="space-y-3">
            {lines.map((line, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700 text-sm leading-relaxed">
                <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }} />
                {line.replace(/^[・\-•]\s*/, '')}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
