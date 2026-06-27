interface Props {
  icon?: string
  headline: string
  points?: string[]
  accentColor: string
  imageUrl?: string
}

export default function FeatureScene({ icon = '✨', headline, points = [], accentColor, imageUrl }: Props) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-8 relative overflow-hidden"
      style={{
        background: imageUrl
          ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${imageUrl}) center/cover`
          : '#0d1117',
      }}
    >
      {/* BG accent */}
      {!imageUrl && (
        <div
          className="absolute inset-0 opacity-5"
          style={{ background: `radial-gradient(circle at 50% 30%, ${accentColor}, transparent 70%)` }}
        />
      )}

      {/* Icon */}
      <div className="text-5xl mb-5 drop-shadow-lg">{icon}</div>

      {/* Headline */}
      <h2 className="text-2xl font-black text-white text-center mb-6 leading-tight">{headline}</h2>

      {/* Points */}
      {points.length > 0 && (
        <div className="w-full max-w-xs space-y-3">
          {points.map((point, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: accentColor }}
              >
                {i + 1}
              </div>
              <p className="text-gray-100 text-sm leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
