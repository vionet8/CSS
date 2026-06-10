import type { Slide } from '../../types'

const COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444']

export default function FourGridIcons({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const items = slide.items || []
  return (
    <div className="w-full h-full flex flex-col bg-white px-10 py-8">
      <div className="mb-5">
        {slide.subtitle && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accent }}>{slide.subtitle}</p>
        )}
        <h2 className="text-2xl font-bold text-gray-900">{slide.title}</h2>
        <div className="mt-2 w-10 h-0.5 rounded" style={{ background: accent }} />
      </div>
      <div className="flex-1 grid grid-cols-2 gap-4">
        {items.slice(0, 4).map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-gray-50">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: COLORS[i % COLORS.length] + '15' }}>
              <div className="w-6 h-6 rounded-lg" style={{ background: COLORS[i % COLORS.length] }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">{item.title}</p>
              {item.body && <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
