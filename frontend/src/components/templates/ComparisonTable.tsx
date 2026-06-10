import type { Slide } from '../../types'

export default function ComparisonTable({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  const items = slide.items || []
  // items: [{title: "行名", body: "◎,△,×,◎"}, ...]
  // subtitle を列ヘッダーとして使用 (カンマ区切り)
  const headers = slide.subtitle?.split(',').map(s => s.trim()) || []
  return (
    <div className="w-full h-full flex flex-col bg-white px-10 py-8">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">{slide.title}</h2>
        <div className="mt-2 w-10 h-0.5 rounded" style={{ background: accent }} />
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs border-b border-gray-100 w-1/4" />
              {headers.map((h, i) => (
                <th key={i}
                  className="px-4 py-3 text-center text-xs font-bold border-b border-gray-100"
                  style={i === 0 ? { color: accent } : { color: '#6b7280' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const cells = item.body?.split(',').map(s => s.trim()) || []
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-700 text-xs">{item.title}</td>
                  {cells.map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-center text-base">
                      <span style={{ color: cell === '◎' ? '#10b981' : cell === '△' ? '#f59e0b' : cell === '×' ? '#ef4444' : '#374151' }}>
                        {cell}
                      </span>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
