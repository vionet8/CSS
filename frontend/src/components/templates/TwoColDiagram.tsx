import type { Slide } from '../../types'

export default function TwoColDiagram({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const items = slide.items || []
  const lines = slide.body?.split('\n').filter(Boolean) || []
  return (
    <div className="w-full h-full flex bg-white">
      <div className="w-1/2 flex flex-col justify-center px-10 py-8 border-r border-gray-100">
        {slide.subtitle && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accent }}>{slide.subtitle}</p>
        )}
        <h2 className="text-3xl font-bold text-gray-900 leading-snug mb-4">{slide.title}</h2>
        {lines.length > 0 && (
          <p className="text-sm text-gray-500 leading-relaxed">{lines.join(' ')}</p>
        )}
      </div>
      <div className="w-1/2 flex flex-col justify-center px-10 py-8 gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: accent }}>
              {i + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
              {item.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.body}</p>}
            </div>
          </div>
        ))}
        {items.length === 0 && lines.map((line, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }} />
            <p className="text-sm text-gray-700">{line.replace(/^[・\-•]\s*/, '')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
