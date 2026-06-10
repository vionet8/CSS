import type { Slide } from '../../types'

const POSITIONS = [
  'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
  'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
  'top-[15%] right-[15%]',
  'bottom-[15%] right-[15%]',
]

export default function HubSpoke({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const items = slide.items || []
  return (
    <div className="w-full h-full flex bg-white">
      <div className="w-1/3 flex flex-col justify-center px-10 py-8">
        {slide.subtitle && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accent }}>{slide.subtitle}</p>
        )}
        <h2 className="text-2xl font-bold text-gray-900 leading-snug">{slide.title}</h2>
        {slide.body && (
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">{slide.body}</p>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center relative py-8 pr-8">
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 rounded-full border-2 border-dashed opacity-20"
            style={{ borderColor: accent }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xs font-bold text-center shadow-lg"
              style={{ background: accent }}>
              {slide.title.slice(0, 6)}
            </div>
          </div>
          {items.slice(0, 6).map((item, i) => (
            <div key={i} className={`absolute ${POSITIONS[i]}`}>
              <div className="px-3 py-2 rounded-xl text-center shadow-sm border"
                style={{ borderColor: accent + '40', background: accent + '10', minWidth: '72px' }}>
                <p className="text-xs font-semibold text-gray-700 leading-tight">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
