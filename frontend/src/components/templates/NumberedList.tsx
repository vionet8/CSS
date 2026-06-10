import type { Slide } from '../../types'

export default function NumberedList({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const items = slide.items || []
  return (
    <div className="w-full h-full flex flex-col bg-white px-10 py-8">
      <div className="mb-6 pb-4 border-b border-gray-100">
        {slide.subtitle && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accent }}>{slide.subtitle}</p>
        )}
        <h2 className="text-2xl font-bold text-gray-900">{slide.title}</h2>
      </div>
      <div className="flex-1 flex flex-col gap-4 justify-center">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
              style={{ background: accent }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div className="flex-1 border-b border-gray-100 pb-4">
              <p className="text-sm font-bold text-gray-800 mb-1">{item.title}</p>
              {item.body && <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
