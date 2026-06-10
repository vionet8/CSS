import type { Slide } from '../../types'

export default function ValueList({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const items = slide.items || []
  const lines = slide.body?.split('\n').filter(Boolean) || []
  const allItems = items.length > 0 ? items.map(i => i.title) : lines.map(l => l.replace(/^[・\-•]\s*/, ''))
  return (
    <div className="w-full h-full flex bg-gray-950">
      <div className="w-2/5 flex flex-col justify-center items-center px-10 py-8 border-r border-white/10">
        <h1 className="text-6xl font-black tracking-tight" style={{ color: accent }}>{slide.subtitle || 'VALUE'}</h1>
        {slide.body && items.length === 0 && (
          <p className="text-white/40 text-xs mt-4 text-center leading-relaxed">{slide.title}</p>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center px-12 py-8 gap-4">
        <h2 className="text-xl font-bold text-white mb-2">{slide.title}</h2>
        {allItems.map((text, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-bold opacity-40 text-white w-6 text-right flex-shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 h-px bg-white/10" />
            <p className="text-sm text-white/80 font-medium">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
