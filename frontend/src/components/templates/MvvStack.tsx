import type { Slide } from '../../types'

const LABELS = ['MISSION', 'VISION', 'VALUE']
const LABEL_COLORS = ['#4f6ef7', '#10b981', '#f59e0b']

export default function MvvStack({ slide }: { slide: Slide }) {
  const items = slide.items || []
  return (
    <div className="w-full h-full flex flex-col bg-white px-10 py-8">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">{slide.title}</h2>
        {slide.subtitle && <p className="text-sm text-gray-400 mt-1">{slide.subtitle}</p>}
      </div>
      <div className="flex-1 flex flex-col gap-4 justify-center">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-start gap-5 p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="px-3 py-1.5 rounded-lg text-white text-xs font-bold uppercase tracking-wider flex-shrink-0"
              style={{ background: LABEL_COLORS[i % LABEL_COLORS.length] }}>
              {LABELS[i] || `0${i + 1}`}
            </div>
            <div>
              <p className="text-base font-bold text-gray-800 leading-snug">{item.title}</p>
              {item.body && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.body}</p>}
            </div>
          </div>
        ))}
        {items.length === 0 && slide.body && (
          <p className="text-sm text-gray-600 leading-relaxed">{slide.body}</p>
        )}
      </div>
    </div>
  )
}
