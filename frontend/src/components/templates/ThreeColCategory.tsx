import type { Slide } from '../../types'

const COL_COLORS = ['#4f6ef7', '#10b981', '#f59e0b']

export default function ThreeColCategory({ slide }: { slide: Slide }) {
  const items = slide.items || []
  // 3グループに分割（items の accent フィールドをカテゴリ名に使用）
  const groups: Record<string, typeof items> = {}
  items.forEach(item => {
    const key = item.accent || '01'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  const groupEntries = Object.entries(groups).slice(0, 3)

  return (
    <div className="w-full h-full flex flex-col bg-white px-10 py-8">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">{slide.title}</h2>
        {slide.body && <p className="text-sm text-gray-400 mt-1">{slide.body}</p>}
      </div>
      <div className="flex-1 grid grid-cols-3 gap-4">
        {groupEntries.map(([label, groupItems], gi) => (
          <div key={gi} className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 text-white text-sm font-bold"
              style={{ background: COL_COLORS[gi % COL_COLORS.length] }}>
              {label}
            </div>
            <ul className="px-4 py-3 space-y-2">
              {groupItems.map((item, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: COL_COLORS[gi % COL_COLORS.length] }} />
                  {item.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {groupEntries.length === 0 && (
          <div className="col-span-3 text-center text-gray-300 text-sm flex items-center justify-center">
            items に accent（カテゴリ名）を設定してください
          </div>
        )}
      </div>
    </div>
  )
}
