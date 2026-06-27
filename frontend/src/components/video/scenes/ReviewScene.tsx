import type { Review } from '../../../types/video'

interface Props {
  reviews: Review[]
  accentColor: string
}

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className="text-xs" style={{ color: s <= rating ? color : '#d1d5db' }}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function ReviewScene({ reviews, accentColor }: Props) {
  const shown = reviews.slice(0, 3)

  return (
    <div className="w-full h-full flex flex-col bg-[#0d1117] px-5 py-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
        <p className="text-white font-bold text-base">ユーザーの声</p>
        <span className="text-xs text-gray-500 ml-1">実際のレビュー</span>
      </div>

      {/* Review cards */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {shown.map((r, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex gap-3">
            <div className="text-2xl flex-shrink-0">{r.avatar_emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StarRating rating={r.rating} color={accentColor} />
                <span className="text-xs text-gray-500">{r.user}</span>
              </div>
              <p className="text-gray-200 text-xs leading-relaxed">{r.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 text-center">
        <span className="text-xs text-gray-500">※ 実際のユーザーイメージです</span>
      </div>
    </div>
  )
}
