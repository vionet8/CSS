import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'
import type { VideoScene, PromoVideo } from '../../types/video'
import SplashScene from './scenes/SplashScene'
import LineChatScene from './scenes/LineChatScene'
import RecipeCardScene from './scenes/RecipeCardScene'
import FeatureScene from './scenes/FeatureScene'
import ReviewScene from './scenes/ReviewScene'
import CTAScene from './scenes/CTAScene'

interface Props {
  video: PromoVideo
}

function SceneContent({ scene, video }: { scene: VideoScene; video: PromoVideo }) {
  const { type, data } = scene.mockup
  const color = video.accent_color || '#06C755'
  const imgUrl = scene.generated_image_url

  switch (type) {
    case 'splash':
      return (
        <SplashScene
          appName={video.app_name}
          tagline={data.tagline || video.tagline}
          logoEmoji={data.logo_emoji}
          accentColor={color}
          imageUrl={imgUrl}
        />
      )
    case 'line_chat':
      return (
        <LineChatScene
          messages={data.messages || []}
          botName={`${video.app_name}Bot`}
          accentColor={color}
        />
      )
    case 'recipe_card':
      return (
        <RecipeCardScene
          recipeName={data.recipe_name || 'レシピ'}
          time={data.time}
          difficulty={data.difficulty}
          calories={data.calories}
          ingredients={data.ingredients}
          accentColor={color}
          imageUrl={imgUrl}
        />
      )
    case 'feature_highlight':
      return (
        <FeatureScene
          icon={data.icon}
          headline={data.headline || scene.title}
          points={data.points}
          accentColor={color}
          imageUrl={imgUrl}
        />
      )
    case 'review_cards':
      return <ReviewScene reviews={data.reviews || []} accentColor={color} />
    case 'cta':
      return (
        <CTAScene
          appName={video.app_name}
          buttonText={data.button_text}
          subText={data.sub_text}
          badge={data.badge}
          accentColor={color}
        />
      )
    default:
      return (
        <FeatureScene headline={scene.title} accentColor={color} />
      )
  }
}

export default function ScenePlayer({ video }: Props) {
  const scenes = [...video.scenes].sort((a, b) => a.order - b.order)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentScene = scenes[currentIndex]
  const duration = currentScene?.duration ?? 4

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(Math.max(0, Math.min(scenes.length - 1, idx)))
    setElapsed(0)
  }, [scenes.length])

  const advance = useCallback(() => {
    if (currentIndex < scenes.length - 1) {
      goTo(currentIndex + 1)
    } else {
      setIsPlaying(false)
      setElapsed(0)
    }
  }, [currentIndex, scenes.length, goTo])

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.1
        if (next >= duration) {
          advance()
          return 0
        }
        return next
      })
    }, 100)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, duration, advance])

  if (!currentScene) return null

  const progress = Math.min((elapsed / duration) * 100, 100)
  const totalElapsed = scenes.slice(0, currentIndex).reduce((s, sc) => s + sc.duration, 0) + elapsed
  const totalDuration = video.total_duration

  return (
    <div className="flex flex-col gap-4">
      {/* Phone frame */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: 320, height: 570 }}>
          {/* Phone shell */}
          <div className="absolute inset-0 bg-gray-900 rounded-[2.5rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
            {/* Status bar */}
            <div className="h-7 bg-black flex items-center justify-between px-4 flex-shrink-0">
              <span className="text-white text-[10px] font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 border border-white/60 rounded-sm"><div className="w-2 h-full bg-white/60 rounded-sm" /></div>
              </div>
            </div>

            {/* Scene content */}
            <div className="absolute inset-0 top-7 overflow-hidden">
              <SceneContent scene={currentScene} video={video} />
            </div>

            {/* Narration subtitle */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-4">
              <p className="text-white text-xs text-center leading-relaxed drop-shadow">
                {currentScene.narration}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        {/* Overall progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>シーン {currentIndex + 1} / {scenes.length}</span>
            <span>{Math.floor(totalElapsed)}s / {totalDuration}s</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{ width: `${(totalElapsed / totalDuration) * 100}%`, backgroundColor: video.accent_color }}
            />
          </div>
        </div>

        {/* Scene progress */}
        <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%`, backgroundColor: video.accent_color + '88' }}
          />
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="w-12 h-12 rounded-full text-white flex items-center justify-center transition-colors"
            style={{ backgroundColor: video.accent_color }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === scenes.length - 1}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Scene name */}
        <p className="text-center text-xs text-gray-500 truncate">{currentScene.title}</p>
      </div>

      {/* Narration label */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Volume2 size={12} />
        <span>ナレーション: {currentScene.narration}</span>
      </div>

      {/* Scene thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {scenes.map((sc, i) => (
          <button
            key={sc.id}
            onClick={() => { goTo(i); setIsPlaying(false) }}
            className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs transition-colors border ${
              i === currentIndex
                ? 'text-white border-transparent'
                : 'text-gray-400 border-gray-800 hover:border-gray-600'
            }`}
            style={i === currentIndex ? { backgroundColor: video.accent_color + '33', borderColor: video.accent_color } : {}}
          >
            {sc.order}. {sc.title}
          </button>
        ))}
      </div>
    </div>
  )
}
