import type { Slide } from '../../types'

export default function HeroHeadline({ slide }: { slide: Slide }) {
  const accent = slide.accent_color || '#4f6ef7'
  return (
    <div className="w-full h-full flex flex-col justify-center items-center text-center px-16 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: accent }} />
      {slide.subtitle && (
        <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: accent }}>
          {slide.subtitle}
        </p>
      )}
      <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6 max-w-3xl">{slide.title}</h1>
      {slide.body && (
        <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">{slide.body}</p>
      )}
      <div className="absolute bottom-8 right-8 w-24 h-24 rounded-full opacity-10" style={{ background: accent }} />
      <div className="absolute bottom-16 right-16 w-12 h-12 rounded-full opacity-10" style={{ background: accent }} />
    </div>
  )
}
