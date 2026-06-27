import { useState } from 'react'
import { Video, Wand2, Image, RefreshCw } from 'lucide-react'
import ScenePlayer from '../components/video/ScenePlayer'
import type { PromoVideo } from '../types/video'
import * as api from '../api/client'

const TONES = [
  '親しみやすく・テンポよく',
  'プロフェッショナル・信頼感',
  'かわいい・ポップ',
  'シリアス・問題提起型',
]

const PRESETS = {
  recipick: {
    app_name: 'レシピック',
    features: 'AIが食材から献立を提案、LINEのトーク画面で完結、レシピを音声読み上げ、買い物リスト自動生成、カロリー・栄養計算',
    target: '毎日の献立に悩む主婦・主夫、料理初心者の一人暮らし、時短したい共働き夫婦',
    tone: '親しみやすく・テンポよく',
  },
}

export default function VideoPage() {
  const [appName, setAppName] = useState(PRESETS.recipick.app_name)
  const [features, setFeatures] = useState(PRESETS.recipick.features)
  const [target, setTarget] = useState(PRESETS.recipick.target)
  const [tone, setTone] = useState(PRESETS.recipick.tone)
  const [generateImages, setGenerateImages] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [video, setVideo] = useState<PromoVideo | null>(null)
  const [imageLoading, setImageLoading] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!appName.trim() || !features.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.generatePromoVideo({ app_name: appName, features, target, tone, generate_images: generateImages })
      setVideo(res.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`生成エラー: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSceneImage = async (sceneId: string, prompt: string) => {
    if (!video) return
    setImageLoading(sceneId)
    try {
      const res = await api.generateVideoImage(prompt)
      const url: string | null = res.data.url
      if (url) {
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                scenes: prev.scenes.map((s) =>
                  s.id === sceneId ? { ...s, generated_image_url: url } : s,
                ),
              }
            : prev,
        )
      }
    } finally {
      setImageLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
        <Video size={20} className="text-brand-400" />
        <div>
          <h1 className="text-lg font-bold text-white">勧誘動画ジェネレーター</h1>
          <p className="text-xs text-gray-500">LINEアプリのプロモーション動画を自動生成</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col xl:flex-row gap-6 p-6 min-h-full">
          {/* Left: Input form */}
          <div className="w-full xl:w-96 flex-shrink-0 space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">アプリ情報</h2>

              {/* App name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">アプリ名</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500"
                  placeholder="例：レシピック"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">機能・特徴</label>
                <textarea
                  className="w-full h-28 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 resize-none leading-relaxed"
                  placeholder="例：AIが食材から献立を提案、LINEで完結..."
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                />
              </div>

              {/* Target */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">ターゲット</label>
                <textarea
                  className="w-full h-20 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 resize-none leading-relaxed"
                  placeholder="例：毎日の献立に悩む主婦、一人暮らしの学生..."
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>

              {/* Tone */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">トーン</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                        tone === t
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image generation toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={generateImages}
                    onChange={(e) => setGenerateImages(e.target.checked)}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${generateImages ? 'bg-brand-600' : 'bg-gray-700'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${generateImages ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-xs text-gray-400">
                  DALL-E 3で画像生成
                  <span className="ml-1 text-gray-600">（OPENAI_API_KEY必要）</span>
                </span>
              </label>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !appName.trim() || !features.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#06C755' }}
            >
              {loading ? (
                <><RefreshCw size={18} className="animate-spin" /> 生成中... (20〜40秒)</>
              ) : (
                <><Wand2 size={18} /> 動画構成を自動生成</>
              )}
            </button>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="flex-1">
            {video ? (
              <div className="space-y-6">
                {/* Video meta */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className="px-3 py-1 rounded-full text-white text-xs font-bold"
                    style={{ backgroundColor: video.accent_color }}
                  >
                    {video.app_name}
                  </div>
                  <span className="text-gray-400 text-sm">{video.tagline}</span>
                  <span className="text-gray-600 text-xs ml-auto">{video.total_duration}秒 / {video.scenes.length}シーン</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Player */}
                  <div className="flex-shrink-0">
                    <ScenePlayer video={video} />
                  </div>

                  {/* Scene list */}
                  <div className="flex-1 space-y-3">
                    <h3 className="text-sm font-bold text-gray-300">シーン一覧</h3>
                    {[...video.scenes]
                      .sort((a, b) => a.order - b.order)
                      .map((scene) => (
                        <div key={scene.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-xs px-2 py-0.5 rounded font-medium text-white flex-shrink-0"
                                  style={{ backgroundColor: video.accent_color + '99' }}
                                >
                                  {scene.order}
                                </span>
                                <span className="text-sm font-semibold text-white truncate">{scene.title}</span>
                                <span className="text-xs text-gray-500 flex-shrink-0">{scene.duration}秒</span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{scene.narration}</p>
                            </div>
                            {scene.image_prompt && !scene.generated_image_url && (
                              <button
                                onClick={() => handleGenerateSceneImage(scene.id, scene.image_prompt)}
                                disabled={imageLoading === scene.id}
                                className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-xs transition-colors disabled:opacity-50"
                              >
                                {imageLoading === scene.id ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Image size={12} />
                                )}
                                画像生成
                              </button>
                            )}
                            {scene.generated_image_url && (
                              <div className="flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden border border-gray-700">
                                <img
                                  src={scene.generated_image_url}
                                  alt="generated"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>

                          {/* Image prompt */}
                          <details className="group">
                            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 list-none">
                              画像プロンプト ▾
                            </summary>
                            <p className="mt-1 text-xs text-gray-500 font-mono leading-relaxed">
                              {scene.image_prompt}
                            </p>
                          </details>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
                <div className="w-20 h-20 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                  <Video size={32} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-400 font-medium">動画構成を生成してください</p>
                  <p className="text-gray-600 text-sm mt-1">
                    左のフォームに情報を入力して「自動生成」ボタンを押すと、<br />
                    スクリプト・画面モック・レビューが自動で生成されます
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
