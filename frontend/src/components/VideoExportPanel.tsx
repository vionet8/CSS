import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Clapperboard, Download, Captions, Film } from 'lucide-react'
import type { Slide } from '../types'
import { SlideRenderer } from './templates'
import CharacterOverlay from './CharacterOverlay'
import { errorDetail } from '../store/projectStore'
import * as api from '../api/client'

interface Props {
  slides: Slide[]
  projectId: string
  character?: string
}

interface RenderResult {
  duration: number
  slide_count: number
}

/** スライドをオフスクリーンで1280x720に描画してPNG化し、PNG保存・SRT・動画合成を行う */
export default function VideoExportPanel({ slides, projectId, character }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [exportSlide, setExportSlide] = useState<Slide | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [result, setResult] = useState<RenderResult | null>(null)

  const sorted = slides.slice().sort((a, b) => a.order - b.order)

  const captureAll = async (onCapture: (slide: Slide, blob: Blob) => Promise<void>) => {
    for (let i = 0; i < sorted.length; i++) {
      const slide = sorted[i]
      setStatus(`スライド ${i + 1}/${sorted.length} を描画中...`)
      setExportSlide(slide)
      await new Promise((r) => setTimeout(r, 250)) // 描画と画像読み込みを待つ
      const dataUrl = await toPng(stageRef.current!, { width: 1280, height: 720, pixelRatio: 1 })
      const blob = await (await fetch(dataUrl)).blob()
      await onCapture(slide, blob)
    }
    setExportSlide(null)
  }

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPngs = async () => {
    setResult(null)
    try {
      await captureAll(async (slide, blob) => {
        downloadBlob(blob, `slide_${String(slide.order).padStart(2, '0')}.png`)
      })
      setStatus(null)
    } catch (e) {
      setStatus(null)
      alert(`PNG書き出しエラー: ${errorDetail(e)}`)
    }
  }

  const downloadSrt = async () => {
    try {
      const res = await api.getSrt(projectId)
      downloadBlob(new Blob([res.data], { type: 'text/plain' }), 'slides.srt')
    } catch (e) {
      alert(`SRT生成エラー: ${errorDetail(e)}`)
    }
  }

  const createVideo = async () => {
    setResult(null)
    try {
      const tools = (await api.getVideoTools(projectId)).data
      const hints: string[] = Object.values(tools.hints ?? {})
      if (hints.length > 0) {
        alert(`動画生成に必要なツールが不足しています:\n\n${hints.join('\n\n')}`)
        return
      }
      await captureAll(async (slide, blob) => {
        setStatus(`スライド ${slide.order} をアップロード中...`)
        await api.uploadVideoFrame(projectId, slide.order, blob)
      })
      setStatus('音声合成と動画エンコード中...（スライド数に応じて数分かかります）')
      const res = await api.renderVideo(projectId, character || 'zundamon')
      setResult(res.data)
      setStatus(null)
    } catch (e) {
      setExportSlide(null)
      setStatus(null)
      alert(`動画生成エラー: ${errorDetail(e)}`)
    }
  }

  const busy = status !== null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={exportPngs} disabled={busy || sorted.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm disabled:opacity-50">
          <Download size={14} /> PNG書き出し
        </button>
        <button onClick={downloadSrt} disabled={busy || sorted.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm disabled:opacity-50">
          <Captions size={14} /> SRT字幕
        </button>
        <button onClick={createVideo} disabled={busy || sorted.length === 0}
          title="発表者ノートをVOICEVOXで読み上げ、FFmpegでmp4に合成します（ローカルにVOICEVOX・FFmpegが必要）"
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <Clapperboard size={14} />
          動画を作成{character ? `（${character === 'metan' ? 'めたん' : 'ずんだもん'}音声）` : '（ずんだもん音声）'}
        </button>
        {status && <span className="text-xs text-gray-400 animate-pulse">{status}</span>}
      </div>

      {result && (
        <div className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/30 rounded-lg px-4 py-3 text-sm">
          <Film size={16} className="text-pink-400" />
          <span className="text-gray-200">
            動画が完成しました（{result.slide_count}枚 / 約{Math.round(result.duration)}秒）
          </span>
          <a href={api.videoFileUrl(projectId)} className="text-pink-400 underline" download>mp4をダウンロード</a>
          <a href={api.videoSrtUrl(projectId)} className="text-pink-400 underline" download>字幕(SRT)</a>
        </div>
      )}

      {/* オフスクリーン描画ステージ（1280x720固定） */}
      <div
        ref={stageRef}
        style={{ position: 'fixed', left: -99999, top: 0, width: 1280, height: 720, overflow: 'hidden', background: '#fff' }}
        aria-hidden
      >
        {exportSlide && (
          <div style={{ position: 'relative', width: 1280, height: 720 }}>
            <SlideRenderer slide={exportSlide} />
            {character && <CharacterOverlay slide={exportSlide} character={character} />}
          </div>
        )}
      </div>
    </div>
  )
}
