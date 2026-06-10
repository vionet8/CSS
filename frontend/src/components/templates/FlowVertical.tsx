import type { Slide } from '../../types'

export default function FlowVertical({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const items = slide.items || []
  return (
    <div className="w-full h-full flex bg-white">
      <div className="w-2/5 flex flex-col justify-center px-10 py-8">
        {slide.subtitle && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accent }}>{slide.subtitle}</p>
        )}
        <h2 className="text-2xl font-bold text-gray-900 leading-snug">{slide.title}</h2>
        {slide.body && (
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">{slide.body}</p>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-8 gap-0">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col items-center w-full max-w-xs">
            <div className="w-full p-4 rounded-xl border-2 text-center"
              style={{ borderColor: accent, background: accent + '10' }}>
              <p className="text-sm font-bold text-gray-800">{item.title}</p>
              {item.body && <p className="text-xs text-gray-500 mt-1">{item.body}</p>}
            </div>
            {i < items.length - 1 && (
              <div className="flex flex-col items-center my-1">
                <div className="w-0.5 h-4" style={{ background: accent }} />
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                  style={{ borderTopColor: accent }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
