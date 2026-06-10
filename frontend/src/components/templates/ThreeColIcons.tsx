import type { Slide } from '../../types'

const ICON_BG = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ThreeColIcons({ slide }: { slide: Slide }) {
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
      <div className="flex-1 grid grid-cols-3 gap-5">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="flex flex-col items-center text-center p-5 rounded-2xl border border-gray-100 bg-gray-50">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: ICON_BG[i % ICON_BG.length] + '20' }}>
              <div className="w-7 h-7 rounded-lg" style={{ background: ICON_BG[i % ICON_BG.length] }} />
            </div>
            <p className="text-sm font-bold text-gray-800 mb-2">{item.title}</p>
            {item.body && <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>}
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-3 flex items-center justify-center text-gray-300 text-sm">
            items が未設定です
          </div>
        )}
      </div>
    </div>
  )
}
