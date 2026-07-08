import { useEffect, useState } from 'react'
import { Brain, ArrowRight, RefreshCw, CircleCheck, CircleAlert, CircleX, Wrench } from 'lucide-react'
import type { Project } from '../types'
import { errorDetail } from '../store/projectStore'
import * as api from '../api/client'

interface Props {
  project: Project
  onRefresh: () => Promise<void> | void
}

interface StageDef { id: string; label: string; question: string }

const STATUS_UI = {
  ok:      { icon: CircleCheck, className: 'text-green-400',  label: '通過' },
  weak:    { icon: CircleAlert, className: 'text-yellow-400', label: '弱い' },
  missing: { icon: CircleX,     className: 'text-red-400',    label: '欠落' },
}

export default function FprlPanel({ project, onRefresh }: Props) {
  const [stageDefs, setStageDefs] = useState<StageDef[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    api.getFprlStages().then(r => setStageDefs(r.data.stages)).catch(() => {})
  }, [])

  const analysis = project.assets?.fprl_analysis

  const analyze = async () => {
    setAnalyzing(true)
    try {
      await api.analyzeFprl(project.id)
      await onRefresh()
    } catch (e) {
      alert(`FPRL分析エラー: ${errorDetail(e)}`)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="flex items-center gap-2 text-white font-semibold mb-1">
          <Brain size={16} className="text-purple-400" />
          FPRL認知変化分析
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          FPRL理論（F→P→R→L）に基づき、このコンテンツが読者の基準（F）を書き換えられる設計か、
          E₁気づき → E₂トリアージ → R推論 → E₃受容 → L定着 の各ゲートを審査します。
          マーケ素材タブのプロファイル（ターゲット・ゴール）が審査に反映されます。
        </p>
        <button
          onClick={analyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
          {analyzing ? '分析中...' : analysis ? '再分析する' : '認知変化を分析'}
        </button>
      </section>

      {analysis && (
        <>
          {/* 認知変化マップ: Before → After */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3">認知変化マップ</h4>
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="flex-1 bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">読者の現在（Before）</p>
                <p className="text-sm text-gray-200 mb-2">🧭 {analysis.reader_before.foundation}</p>
                <p className="text-xs text-gray-400">行動: {analysis.reader_before.behavior}</p>
              </div>
              <div className="flex items-center justify-center text-purple-400">
                <ArrowRight size={24} className="rotate-90 sm:rotate-0" />
              </div>
              <div className="flex-1 bg-purple-600/10 border border-purple-500/40 rounded-lg p-4">
                <p className="text-xs font-semibold text-purple-300 mb-2">目標状態（After = F更新後）</p>
                <p className="text-sm text-gray-200 mb-2">🧭 {analysis.reader_after.foundation}</p>
                <p className="text-xs text-gray-400">行動: {analysis.reader_after.behavior}</p>
              </div>
            </div>
            {analysis.verdict && (
              <p className="mt-3 text-sm text-gray-300 bg-gray-800/60 border border-gray-700/60 rounded-lg p-3">
                {analysis.verdict}
              </p>
            )}
          </section>

          {/* ゲート審査 */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3">ゲート通過審査</h4>
            <div className="space-y-3">
              {analysis.stages.map((s) => {
                const def = stageDefs.find(d => d.id === s.id)
                const ui = STATUS_UI[s.status] ?? STATUS_UI.weak
                const Icon = ui.icon
                return (
                  <div key={s.id} className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={15} className={ui.className} />
                      <span className="text-sm font-semibold text-white">{def?.label ?? s.id}</span>
                      <span className={`text-xs ${ui.className}`}>[{ui.label}]</span>
                    </div>
                    {def && <p className="text-xs text-gray-500 mb-1.5">{def.question}</p>}
                    {s.evidence && (
                      <p className="text-xs text-gray-400 mb-1 border-l-2 border-gray-600 pl-2">
                        該当箇所: {s.evidence}
                      </p>
                    )}
                    <p className="text-sm text-gray-300">{s.comment}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 欠落と修正案 */}
          {analysis.gaps.length > 0 && (
            <section className="bg-red-500/5 border border-red-500/30 rounded-xl p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-red-300 mb-3">
                <Wrench size={14} /> 停滞ポイントと修正案
              </h4>
              <div className="space-y-3">
                {analysis.gaps.map((g, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-red-300 font-medium">
                      {stageDefs.find(d => d.id === g.stage)?.label ?? g.stage} で停滞
                    </p>
                    <p className="text-gray-300 mt-0.5">{g.issue}</p>
                    <p className="text-green-300/90 mt-0.5">修正案: {g.fix}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
