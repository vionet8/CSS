interface Props {
  appName: string
  buttonText?: string
  subText?: string
  badge?: string
  accentColor: string
}

export default function CTAScene({
  appName,
  buttonText = '友達追加はこちら',
  subText = '完全無料！今すぐ使える',
  badge = '登録0円',
  accentColor,
}: Props) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: `linear-gradient(160deg, #0d1117 0%, ${accentColor}22 100%)` }}
    >
      {/* BG decoration */}
      <div
        className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-10"
        style={{ backgroundColor: accentColor }}
      />
      <div
        className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-5"
        style={{ backgroundColor: accentColor }}
      />

      {/* Badge */}
      <div
        className="px-4 py-1 rounded-full text-white text-xs font-bold mb-6"
        style={{ backgroundColor: accentColor }}
      >
        🎉 {badge}
      </div>

      {/* Main text */}
      <h2 className="text-3xl font-black text-white mb-2 text-center">{appName}</h2>
      <p className="text-gray-300 text-sm mb-8 text-center">をLINEで今すぐ試そう</p>

      {/* QR placeholder */}
      <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <div className="grid grid-cols-3 gap-0.5 p-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: [0,2,6,8,4].includes(i) ? '#1d1d1d' : '#fff' }}
            />
          ))}
        </div>
      </div>

      {/* CTA button */}
      <button
        className="flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-lg"
        style={{ backgroundColor: accentColor }}
      >
        <span className="text-lg">+</span>
        {buttonText}
      </button>

      <p className="mt-3 text-gray-400 text-xs">{subText}</p>
    </div>
  )
}
