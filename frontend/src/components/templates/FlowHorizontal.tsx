import type { Slide } from '../../types'

const COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function FlowHorizontal({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const items = slide.items || []
  return (
    <div className="w-full h-full flex flex-col bg-white px-10 py-8">
      <div className="mb-6">
        {slide.subtitle && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accent }}>{slide.subtitle}</p>
        )}
        <h2 className="text-2xl font-bold text-gray-900">{slide.title}</h2>
        <div className="mt-2 w-10 h-0.5 rounded" style={{ background: accent }} />
      </div>
      <div className="flex-1 flex items-center justify-center gap-0">
        {items.map((item, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center text-center w-28 lg:w-36">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg mb-3"
                style={{ background: COLORS[i % COLORS.length] }}>
                {i + 1}
              </div>
              <p className="text-xs font-bold text-gray-800 leading-tight">{item.title}</p>
              {item.body && <p className="text-xs text-gray-400 mt-1 leading-tight">{item.body}</p>}
            </div>
            {i < items.length - 1 && (
              <div className="flex items-center mx-1">
                <div className="w-6 h-0.5" style={{ background: '#d1d5db' }} />
                <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent"
                  style={{ borderLeftColor: '#d1d5db' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
