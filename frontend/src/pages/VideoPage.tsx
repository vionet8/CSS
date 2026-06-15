import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, CheckCircle2, Download, Film, Mic, MicOff,
  Plus, Scissors, Trash2, Upload, X
} from 'lucide-react'
import * as api from '../api/client'
import type { ProjectSummary } from '../types'

type ExportTab = 'export' | 'edit'

interface VideoFile {
  filename: string
  label: string
}

export default function VideoPage() {
  const [tab, setTab] = useState<ExportTab>('export')

  // --- Export tab ---
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [character, setCharacter] = useState<string>('zundamon')
  const [slideDuration, setSlideDuration] = useState<number>(5)
  const [resolution, setResolution] = useState<string>('1280x720')
  const [withNarration, setWithNarration] = useState<boolean>(true)
  const [voicevoxOk, setVoicevoxOk] = useState<boolean | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ filename: string; url: string; slide_count: number; narration: boolean } | null>(null)
  const [exportError, setExportError] = useState<string>('')

  // --- Edit tab ---
  const [uploadedVideos, setUploadedVideos] = useState<VideoFile[]>([])
  const [uploadedAudio, setUploadedAudio] = useState<VideoFile[]>([])
  const [editError, setEditError] = useState<string>('')
  const [editResult, setEditResult] = useState<{ filename: string; url: string } | null>(null)
  const [trimTarget, setTrimTarget] = useState<string>('')
  const [trimStart, setTrimStart] = useState<string>('0')
  const [trimEnd, setTrimEnd] = useState<string>('10')
  const [concatList, setConcatList] = useState<string[]>([])
  const [audioTarget, setAudioTarget] = useState<string>('')
  const [audioFile, setAudioFile] = useState<string>('')
  const [processing, setProcessing] = useState(false)

  const videoUploadRef = useRef<HTMLInputElement>(null)
  const audioUploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getProjects().then(r => setProjects(r.data)).catch(() => {})
    api.getVoicevoxStatus().then(r => setVoicevoxOk(r.data.available)).catch(() => setVoicevoxOk(false))
  }, [])

  const handleExport = async () => {
    if (!selectedProject) return
    setExporting(true)
    setExportError('')
    setExportResult(null)
    try {
      const res = await api.exportProjectVideo(selectedProject, {
        character,
        slide_duration: slideDuration,
        resolution,
        with_narration: withNarration && !!voicevoxOk,
      })
      setExportResult(res.data)
    } catch (e: any) {
      setExportError(e?.response?.data?.detail || e?.message || '出力エラー')
    } finally {
      setExporting(false)
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await api.uploadVideo(file)
      setUploadedVideos(prev => [...prev, { filename: res.data.filename, label: file.name }])
    } catch {
      setEditError('動画のアップロードに失敗しました')
    }
    e.target.value = ''
  }

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await api.uploadAudio(file)
      setUploadedAudio(prev => [...prev, { filename: res.data.filename, label: file.name }])
    } catch {
      setEditError('音声のアップロードに失敗しました')
    }
    e.target.value = ''
  }

  const handleTrim = async () => {
    if (!trimTarget) { setEditError('動画を選択してください'); return }
    const start = parseFloat(trimStart)
    const end = parseFloat(trimEnd)
    if (isNaN(start) || isNaN(end) || end <= start) { setEditError('開始・終了秒数が不正です'); return }
    setProcessing(true); setEditError(''); setEditResult(null)
    try {
      const res = await api.trimVideo(trimTarget, start, end)
      const out = res.data
      setEditResult({ filename: out.filename, url: api.getVideoUrl(out.filename) })
      setUploadedVideos(prev => [...prev, { filename: out.filename, label: `trimmed_${out.filename.slice(0, 8)}.mp4` }])
    } catch (e: any) {
      setEditError(e?.response?.data?.detail || 'トリミングエラー')
    } finally { setProcessing(false) }
  }

  const handleConcat = async () => {
    if (concatList.length < 2) { setEditError('2本以上選択してください'); return }
    setProcessing(true); setEditError(''); setEditResult(null)
    try {
      const res = await api.concatVideos(concatList)
      const out = res.data
      setEditResult({ filename: out.filename, url: api.getVideoUrl(out.filename) })
      setUploadedVideos(prev => [...prev, { filename: out.filename, label: `concat_${out.filename.slice(0, 8)}.mp4` }])
      setConcatList([])
    } catch (e: any) {
      setEditError(e?.response?.data?.detail || '結合エラー')
    } finally { setProcessing(false) }
  }

  const handleAddAudio = async () => {
    if (!audioTarget || !audioFile) { setEditError('動画と音声を選択してください'); return }
    setProcessing(true); setEditError(''); setEditResult(null)
    try {
      const res = await api.addAudioToVideo(audioTarget, audioFile)
      const out = res.data
      setEditResult({ filename: out.filename, url: api.getVideoUrl(out.filename) })
      setUploadedVideos(prev => [...prev, { filename: out.filename, label: `with_audio_${out.filename.slice(0, 8)}.mp4` }])
    } catch (e: any) {
      setEditError(e?.response?.data?.detail || '音声追加エラー')
    } finally { setProcessing(false) }
  }

  const toggleConcat = (filename: string) => {
    setConcatList(prev =>
      prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <Film size={20} className="text-brand-400" />
          <h1 className="text-lg font-bold text-white">動画</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900/30">
        {([
          { key: 'export' as const, label: '動画出力' },
          { key: 'edit' as const, label: '動画編集' },
        ] as { key: ExportTab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-brand-400 border-b-2 border-brand-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">

        {/* ====== EXPORT TAB ====== */}
        {tab === 'export' && (
          <div className="max-w-2xl space-y-6">

            {/* VOICEVOX status */}
            <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg ${voicevoxOk ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
              {voicevoxOk === null
                ? <span className="text-gray-400">VOICEVOX 確認中...</span>
                : voicevoxOk
                ? <><CheckCircle2 size={15} /> VOICEVOX 起動中 — ナレーション生成が可能です</>
                : <><MicOff size={15} /> VOICEVOX が起動していません — 無音で出力します</>
              }
            </div>

            {/* Project select */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">プロジェクト</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-500"
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
              >
                <option value="">選択してください</option>
                {projects.filter(p => p.slide_count > 0).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.slide_count}枚)
                  </option>
                ))}
              </select>
              {projects.filter(p => p.slide_count === 0).length === projects.length && projects.length > 0 && (
                <p className="text-xs text-yellow-500">スライドが生成されているプロジェクトがありません</p>
              )}
            </div>

            {/* Character */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">ナレーションキャラクター</label>
              <div className="flex gap-2">
                {[
                  { id: 'zundamon', label: 'ずんだもん' },
                  { id: 'metan', label: '四国めたん' },
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCharacter(c.id)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      character === c.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">スライドの表示時間（秒）</label>
                <input
                  type="number" min={1} max={30} step={1}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-500"
                  value={slideDuration}
                  onChange={e => setSlideDuration(Number(e.target.value))}
                />
                <p className="text-xs text-gray-500">ナレーションがある場合は音声優先</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">解像度</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-500"
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                >
                  <option value="1280x720">1280×720 (HD)</option>
                  <option value="1920x1080">1920×1080 (Full HD)</option>
                  <option value="854x480">854×480 (SD)</option>
                </select>
              </div>
            </div>

            {/* Narration toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setWithNarration(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${withNarration ? 'bg-brand-600' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${withNarration ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-gray-300">
                <Mic size={14} className="inline mr-1.5" />
                VOICEVOXナレーションを生成する
              </span>
            </label>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={!selectedProject || exporting}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Film size={16} />
              {exporting ? '動画を生成中...' : '動画を出力'}
            </button>

            {exporting && (
              <div className="text-sm text-gray-400 animate-pulse">
                スライドをレンダリング中...
                {withNarration && voicevoxOk && ' VOICEVOXでナレーション生成中...'}
              </div>
            )}

            {exportError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                {exportError}
              </div>
            )}

            {exportResult && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-green-400 font-medium">
                  <CheckCircle2 size={16} />
                  動画の生成が完了しました
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>{exportResult.slide_count}枚のスライド</div>
                  <div>ナレーション: {exportResult.narration ? '✓ VOICEVOXで生成済み' : '✗ なし（VOICEVOXが未起動）'}</div>
                </div>
                <a
                  href={`${import.meta.env.VITE_API_URL || '/api'}${exportResult.url}`}
                  download={exportResult.filename}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={15} />
                  ダウンロード
                </a>
              </div>
            )}
          </div>
        )}

        {/* ====== EDIT TAB ====== */}
        {tab === 'edit' && (
          <div className="max-w-2xl space-y-8">

            {/* Upload zone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">動画をアップロード</label>
                <button
                  onClick={() => videoUploadRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-700 hover:border-brand-500 rounded-xl text-gray-400 hover:text-brand-400 text-sm transition-colors"
                >
                  <Upload size={16} />
                  動画ファイルを選択
                </button>
                <input ref={videoUploadRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">音声をアップロード</label>
                <button
                  onClick={() => audioUploadRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-700 hover:border-green-500 rounded-xl text-gray-400 hover:text-green-400 text-sm transition-colors"
                >
                  <Mic size={16} />
                  音声ファイルを選択
                </button>
                <input ref={audioUploadRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              </div>
            </div>

            {/* Uploaded files */}
            {uploadedVideos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">アップロード済み動画</p>
                <div className="space-y-1">
                  {uploadedVideos.map(v => (
                    <div key={v.filename} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-300 min-w-0">
                        <Film size={13} className="text-brand-400 flex-shrink-0" />
                        <span className="truncate">{v.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <a
                          href={api.getVideoUrl(v.filename)}
                          download={v.filename}
                          className="text-xs text-brand-400 hover:text-brand-300"
                        >
                          <Download size={13} />
                        </a>
                        <button
                          onClick={() => setUploadedVideos(p => p.filter(x => x.filename !== v.filename))}
                          className="text-gray-600 hover:text-red-400"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadedAudio.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">アップロード済み音声</p>
                <div className="space-y-1">
                  {uploadedAudio.map(a => (
                    <div key={a.filename} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-300 min-w-0">
                        <Mic size={13} className="text-green-400 flex-shrink-0" />
                        <span className="truncate">{a.label}</span>
                      </div>
                      <button
                        onClick={() => setUploadedAudio(p => p.filter(x => x.filename !== a.filename))}
                        className="text-gray-600 hover:text-red-400 flex-shrink-0 ml-2"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadedVideos.length > 0 && (
              <>
                {/* Trim */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <Scissors size={15} className="text-yellow-400" />
                    トリミング
                  </div>
                  <div className="space-y-3">
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                      value={trimTarget}
                      onChange={e => setTrimTarget(e.target.value)}
                    >
                      <option value="">動画を選択</option>
                      {uploadedVideos.map(v => (
                        <option key={v.filename} value={v.filename}>{v.label}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">開始（秒）</label>
                        <input
                          type="number" min={0} step={0.1}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                          value={trimStart}
                          onChange={e => setTrimStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">終了（秒）</label>
                        <input
                          type="number" min={0} step={0.1}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                          value={trimEnd}
                          onChange={e => setTrimEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleTrim}
                      disabled={processing}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                    >
                      <Scissors size={14} />
                      {processing ? '処理中...' : 'トリミング実行'}
                    </button>
                  </div>
                </div>

                {/* Concat */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <Plus size={15} className="text-blue-400" />
                    動画を結合
                  </div>
                  <p className="text-xs text-gray-500">結合する順番でチェックを入れてください</p>
                  <div className="space-y-1">
                    {uploadedVideos.map((v, i) => (
                      <label key={v.filename} className="flex items-center gap-3 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={concatList.includes(v.filename)}
                          onChange={() => toggleConcat(v.filename)}
                          className="accent-brand-500"
                        />
                        <span className="text-sm text-gray-300">
                          {concatList.includes(v.filename)
                            ? <span className="text-brand-400 mr-2 font-mono text-xs">{concatList.indexOf(v.filename) + 1}.</span>
                            : null}
                          {v.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleConcat}
                    disabled={processing || concatList.length < 2}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                  >
                    <Plus size={14} />
                    {processing ? '処理中...' : `${concatList.length}本を結合`}
                  </button>
                </div>

                {/* Add audio */}
                {uploadedAudio.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-white font-medium text-sm">
                      <Mic size={15} className="text-green-400" />
                      音声を追加
                    </div>
                    <div className="space-y-3">
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                        value={audioTarget}
                        onChange={e => setAudioTarget(e.target.value)}
                      >
                        <option value="">動画を選択</option>
                        {uploadedVideos.map(v => <option key={v.filename} value={v.filename}>{v.label}</option>)}
                      </select>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                        value={audioFile}
                        onChange={e => setAudioFile(e.target.value)}
                      >
                        <option value="">音声を選択</option>
                        {uploadedAudio.map(a => <option key={a.filename} value={a.filename}>{a.label}</option>)}
                      </select>
                      <button
                        onClick={handleAddAudio}
                        disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                      >
                        <Mic size={14} />
                        {processing ? '処理中...' : '音声を追加'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {uploadedVideos.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                動画をアップロードすると編集メニューが表示されます
              </div>
            )}

            {editError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                {editError}
              </div>
            )}

            {editResult && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle2 size={15} />
                  処理が完了しました
                </div>
                <a
                  href={`${import.meta.env.VITE_API_URL || '/api'}${editResult.url}`}
                  download={editResult.filename}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={14} />
                  ダウンロード
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
