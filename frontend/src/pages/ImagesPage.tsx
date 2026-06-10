import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Scissors, Crop, Grid } from 'lucide-react'
import * as api from '../api/client'
import type { ImageInfo } from '../types'

const SPLIT_OPTIONS = [2, 3, 4, 6, 9]

export default function ImagesPage() {
  const [images, setImages] = useState<ImageInfo[]>([])
  const [selected, setSelected] = useState<ImageInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [resizeW, setResizeW] = useState('')
  const [resizeH, setResizeH] = useState('')

  const onDrop = useCallback(async (files: File[]) => {
    setBusy(true)
    try {
      const results = await Promise.all(files.map((f) => api.uploadImage(f)))
      const infos: ImageInfo[] = results.map((r) => r.data)
      setImages((prev) => [...prev, ...infos])
      if (infos.length > 0) setSelected(infos[0])
    } finally {
      setBusy(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  })

  const handleResize = async () => {
    if (!selected || !resizeW || !resizeH) return
    setBusy(true)
    try {
      const res = await api.resizeImage(selected.filename, parseInt(resizeW), parseInt(resizeH))
      const newInfo: ImageInfo = { ...selected, filename: res.data.filename, width: res.data.width, height: res.data.height }
      setImages((prev) => [...prev, newInfo])
      setSelected(newInfo)
    } finally {
      setBusy(false)
    }
  }

  const handleSplit = async (count: number) => {
    if (!selected) return
    setBusy(true)
    try {
      const res = await api.splitImage(selected.filename, count)
      const newImages: ImageInfo[] = res.data.map((item: { filename: string }) => ({
        ...selected,
        filename: item.filename,
      }))
      setImages((prev) => [...prev, ...newImages])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 flex gap-6 h-full">
      {/* Left: upload + list */}
      <div className="w-64 flex-shrink-0 space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={24} className="mx-auto text-gray-500 mb-2" />
          <p className="text-xs text-gray-400">
            {isDragActive ? 'ドロップしてください' : 'クリックまたはD&D'}
          </p>
        </div>

        <div className="space-y-1 overflow-auto max-h-[calc(100vh-250px)]">
          {images.map((img) => (
            <div
              key={img.filename}
              onClick={() => setSelected(img)}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                selected?.filename === img.filename
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <img
                src={api.getImageUrl(img.filename)}
                alt=""
                className="w-10 h-10 object-cover rounded flex-shrink-0"
              />
              <span className="truncate">{img.filename.split('-').pop()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: preview + tools */}
      {selected ? (
        <div className="flex-1 flex gap-6">
          <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-center overflow-hidden">
            <img
              src={api.getImageUrl(selected.filename)}
              alt={selected.filename}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          <div className="w-56 space-y-5">
            <div>
              <p className="text-xs text-gray-500 mb-1">{selected.filename.split('-').pop()}</p>
              <p className="text-xs text-gray-400">{selected.width} × {selected.height}px</p>
              <p className="text-xs text-gray-400">{(selected.size / 1024).toFixed(1)} KB</p>
            </div>

            {/* Resize */}
            <div>
              <h3 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
                <Scissors size={12} /> リサイズ
              </h3>
              <div className="flex gap-2 mb-2">
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
                  placeholder="W"
                  value={resizeW}
                  onChange={(e) => setResizeW(e.target.value)}
                />
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
                  placeholder="H"
                  value={resizeH}
                  onChange={(e) => setResizeH(e.target.value)}
                />
              </div>
              <button
                onClick={handleResize}
                disabled={busy}
                className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 rounded-lg disabled:opacity-50"
              >
                実行
              </button>
            </div>

            {/* Split */}
            <div>
              <h3 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
                <Grid size={12} /> 分割
              </h3>
              <div className="grid grid-cols-5 gap-1">
                {SPLIT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSplit(n)}
                    disabled={busy}
                    className="py-1.5 bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 rounded disabled:opacity-50"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">分割数を選択</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <Crop size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">画像をアップロードしてください</p>
          </div>
        </div>
      )}

      {busy && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
          <div className="text-white text-sm">処理中...</div>
        </div>
      )}
    </div>
  )
}
