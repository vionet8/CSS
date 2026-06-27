interface Props {
  appName: string
  tagline: string
  logoEmoji?: string
  accentColor: string
  imageUrl?: string
}

export default function SplashScene({ appName, tagline, logoEmoji = '🍱', accentColor, imageUrl }: Props) {
  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: imageUrl
          ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${imageUrl}) center/cover`
          : `radial-gradient(ellipse at 60% 40%, ${accentColor}33 0%, #0d1117 70%)`,
      }}
    >
      {/* Decorative rings */}
      <div
        className="absolute rounded-full opacity-10"
        style={{ width: 340, height: 340, border: `2px solid ${accentColor}`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <div
        className="absolute rounded-full opacity-5"
        style={{ width: 500, height: 500, border: `2px solid ${accentColor}`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />

      {/* Logo */}
      <div className="text-6xl mb-4 drop-shadow-lg">{logoEmoji}</div>

      {/* App name */}
      <h1 className="text-4xl font-black text-white tracking-tight mb-3 drop-shadow-md">{appName}</h1>

      {/* Divider */}
      <div className="w-12 h-0.5 mb-3 rounded-full" style={{ backgroundColor: accentColor }} />

      {/* Tagline */}
      <p className="text-base text-gray-200 font-medium tracking-wide">{tagline}</p>

      {/* LINE badge */}
      <div
        className="absolute bottom-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold"
        style={{ backgroundColor: accentColor }}
      >
        <span>LINE</span>
        <span className="opacity-75">公式アカウント</span>
      </div>
    </div>
  )
}
