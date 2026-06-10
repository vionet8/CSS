import type { Slide } from '../../types'

export default function LogoGrid({ slide }: { slide: Slide }) {
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
      <div className="flex-1 grid grid-cols-4 gap-3 content-center">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-center h-16 rounded-xl border border-gray-100 bg-gray-50 px-4">
            {item.image_filename ? (
              <img src={`/api/images/file/${item.image_filename}`} alt={item.title}
                className="max-h-8 max-w-full object-contain" />
            ) : (
              <p className="text-sm font-bold text-gray-600 text-center">{item.title}</p>
            )}
          </div>
        ))}
        {items.length === 0 && slide.body && (
          <div className="col-span-4 text-center text-gray-400 text-sm">{slide.body}</div>
        )}
      </div>
    </div>
  )
}
