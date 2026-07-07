import { useEffect, useState } from 'react'
import {
  Megaphone, Save, Sparkles, Copy, Check, Trash2, RefreshCw,
  SearchCheck, PackageOpen, CircleCheck, CircleAlert, CircleX, ArrowDownToLine,
} from 'lucide-react'
import type { Project, MarketingFramework, MarketingAssetType, MarketingProfile } from '../types'
import { errorDetail } from '../store/projectStore'
import * as api from '../api/client'

const FIELD_LABELS: Record<string, string> = {
  product_name: 'プロダクト名',
  target_audience: 'ターゲット顧客',
  goal: '訴求ゴール',
  tone: 'トーン',
}

const STATUS_UI: Record<string, { icon: typeof CircleCheck; className: string; label: string }> = {
  ok:      { icon: CircleCheck, className: 'text-green-400',  label: 'OK' },
  weak:    { icon: CircleAlert, className: 'text-yellow-400', label: '曖昧' },
  missing: { icon: CircleX,     className: 'text-red-400',    label: '欠落' },
}

interface Props {
  project: Project
  onRefresh: () => Promise<void> | void
}

const EMPTY_PROFILE: MarketingProfile = {
  product_name: '',
  target_audience: '',
  goal: '',
  tone: '',
}

export default function MarketingPanel({ project, onRefresh }: Props) {
  const [frameworks, setFrameworks] = useState<MarketingFramework[]>([])
  const [assetTypes, setAssetTypes] = useState<MarketingAssetType[]>([])
  const [profile, setProfile] = useState<MarketingProfile>(
    project.assets?.marketing_profile ?? EMPTY_PROFILE
  )
  const [framework, setFramework] = useState('pasona')
  const [savingProfile, setSavingProfile] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [auditing, setAuditing] = useState(false)
  const [materialText, setMaterialText] = useState('')
  const [materialSource, setMaterialSource] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    api.getMarketingOptions()
      .then(r => {
        setFrameworks(r.data.frameworks)
        setAssetTypes(r.data.asset_types)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setProfile(project.assets?.marketing_profile ?? EMPTY_PROFILE)
  }, [project.id, project.assets?.marketing_profile])

  const marketingAssets = project.assets?.marketing_assets ?? {}
  const currentFramework = project.logic_structure?.framework
  const audit = project.assets?.profile_audit
  const fragments = project.assets?.material_fragments ?? []

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await api.saveMarketingProfile(project.id, profile)
      await onRefresh()
    } catch (e) {
      alert(`プロファイル保存エラー: ${errorDetail(e)}`)
    } finally {
      setSavingProfile(false)
    }
  }

  const analyze = async () => {
    if (!project.raw_content) {
      alert('先に「コンテンツ入力」タブで素材を入力・保存してください')
      return
    }
    setAnalyzing(true)
    try {
      await api.analyzeMarketing(project.id, framework)
      await onRefresh()
    } catch (e) {
      alert(`セールス構造分析エラー: ${errorDetail(e)}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const generate = async (assetType: string) => {
    setGenerating(assetType)
    try {
      await api.generateMarketingAsset(project.id, assetType)
      await onRefresh()
    } catch (e) {
      alert(`素材生成エラー: ${errorDetail(e)}`)
    } finally {
      setGenerating(null)
    }
  }

  const removeAsset = async (assetType: string) => {
    try {
      await api.deleteMarketingAsset(project.id, assetType)
      await onRefresh()
    } catch (e) {
      alert(`削除エラー: ${errorDetail(e)}`)
    }
  }

  const runAudit = async () => {
    setAuditing(true)
    try {
      await api.auditMarketingProfile(project.id)
      await onRefresh()
    } catch (e) {
      alert(`プロファイル審査エラー: ${errorDetail(e)}`)
    } finally {
      setAuditing(false)
    }
  }

  const applyExtracted = () => {
    if (!audit) return
    // 抽出できた値のみ反映（空欄は既存値を維持）。保存はユーザーが確認してから
    setProfile((p) => {
      const next = { ...p }
      for (const key of Object.keys(FIELD_LABELS) as (keyof MarketingProfile)[]) {
        const v = audit.extracted[key]
        if (v) next[key] = v
      }
      return next
    })
  }

  const importMaterialText = async () => {
    if (!materialText.trim()) return
    setImporting(true)
    try {
      await api.importMaterial(project.id, materialText, materialSource.trim())
      setMaterialText('')
      setMaterialSource('')
      await onRefresh()
    } catch (e) {
      alert(`素材取り込みエラー: ${errorDetail(e)}`)
    } finally {
      setImporting(false)
    }
  }

  const removeFragment = async (fragmentId: string) => {
    try {
      await api.deleteMaterialFragment(project.id, fragmentId)
      await onRefresh()
    } catch (e) {
      alert(`断片削除エラー: ${errorDetail(e)}`)
    }
  }

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      alert('コピーに失敗しました')
    }
  }

  const profileFields: { key: keyof MarketingProfile; label: string; placeholder: string }[] = [
    { key: 'product_name', label: 'プロダクト名', placeholder: '例: Future Compass' },
    { key: 'target_audience', label: 'ターゲット顧客', placeholder: '例: キャリアに悩む20-30代' },
    { key: 'goal', label: '訴求ゴール', placeholder: '例: 無料登録してもらう' },
    { key: 'tone', label: 'トーン', placeholder: '例: 親しみやすく前向き' },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      {/* プロダクトプロファイル */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="flex items-center gap-2 text-white font-semibold mb-1">
          <Megaphone size={16} className="text-brand-400" />
          プロダクトプロファイル
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          ここで設定した内容が、構造分析・スライド生成・販促素材のすべてに反映されます。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profileFields.map(({ key, label, placeholder }) => (
            <label key={key} className="text-xs text-gray-400">
              {label}
              <input
                className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                placeholder={placeholder}
                value={profile[key]}
                onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex justify-between items-center flex-wrap gap-2">
          <button
            onClick={runAudit}
            disabled={auditing}
            title="コンテンツ入力タブの素材（LP等）からターゲット設計を読み取り、審査します"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 rounded-lg text-sm disabled:opacity-50"
          >
            <SearchCheck size={14} />
            {auditing ? '審査中...' : '素材からターゲット設計を審査'}
          </button>
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm disabled:opacity-50"
          >
            <Save size={14} />
            {savingProfile ? '保存中...' : 'プロファイルを保存'}
          </button>
        </div>

        {/* 審査結果 */}
        {audit && (
          <div className="mt-4 border-t border-gray-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">審査結果</h4>
              <span className="text-xs text-gray-500">
                {new Date(audit.audited_at).toLocaleString('ja-JP')}
              </span>
            </div>
            {audit.verdict && (
              <p className="text-sm text-gray-300 bg-gray-800/60 border border-gray-700/60 rounded-lg p-3">
                {audit.verdict}
              </p>
            )}
            <div className="space-y-1.5">
              {audit.findings.map((f, i) => {
                const ui = STATUS_UI[f.status] ?? STATUS_UI.weak
                const Icon = ui.icon
                return (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Icon size={15} className={`${ui.className} mt-0.5 shrink-0`} />
                    <span className="text-gray-400 shrink-0">
                      {FIELD_LABELS[f.field] ?? f.field}
                      <span className={`ml-1 text-xs ${ui.className}`}>[{ui.label}]</span>:
                    </span>
                    <span className="text-gray-300">{f.comment}</span>
                  </div>
                )
              })}
            </div>
            {audit.questions.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-yellow-300 mb-1.5">
                  確認が必要です — 以下に答えてプロファイルを埋めてください:
                </p>
                <ul className="text-sm text-yellow-200/90 space-y-1 list-disc list-inside">
                  {audit.questions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
            {Object.values(audit.extracted).some(Boolean) && (
              <button
                onClick={applyExtracted}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs"
                title="審査で読み取れた値を上のフォームに反映します（保存は別途行ってください）"
              >
                <ArrowDownToLine size={12} />
                読み取れた値をフォームに反映
              </button>
            )}
          </div>
        )}
      </section>

      {/* 外部素材の取り込み */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="flex items-center gap-2 text-white font-semibold mb-1">
          <PackageOpen size={16} className="text-brand-400" />
          外部素材の取り込み
          {fragments.length > 0 && (
            <span className="text-xs bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">
              断片 {fragments.length}
            </span>
          )}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          ChatGPT等で作った素材を貼り付けると、再利用できる断片（主張・ベネフィット・実績・キャッチコピー等）に分解して蓄積します。
          蓄積した断片は、以降の構造分析・販促素材の生成に自動的に散りばめられます。
        </p>
        <textarea
          className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 outline-none resize-none focus:border-brand-500"
          placeholder="ここに外部AIで作った素材テキストを貼り付け..."
          value={materialText}
          onChange={(e) => setMaterialText(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            placeholder="出所メモ（任意。例: ChatGPT LP案 v2）"
            value={materialSource}
            onChange={(e) => setMaterialSource(e.target.value)}
          />
          <button
            onClick={importMaterialText}
            disabled={importing || !materialText.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {importing ? <RefreshCw size={14} className="animate-spin" /> : <PackageOpen size={14} />}
            {importing ? '分解中...' : '分解して取り込む'}
          </button>
        </div>

        {fragments.length > 0 && (
          <div className="mt-4 space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {fragments.map((f) => (
              <div key={f.id} className="flex items-start gap-2 bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2 group">
                <span className="shrink-0 text-xs bg-gray-700 text-gray-300 rounded px-1.5 py-0.5 mt-0.5">
                  {f.kind}
                </span>
                <p className="flex-1 text-sm text-gray-300 leading-relaxed min-w-0">
                  {f.text}
                  {f.source && <span className="ml-2 text-xs text-gray-500">（{f.source}）</span>}
                </p>
                <button
                  onClick={() => removeFragment(f.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                  title="この断片を削除"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* セールス構造分析 */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-1">セールスフレームワーク分析</h3>
        <p className="text-xs text-gray-500 mb-4">
          コンテンツを販促向けの構造に組み直します（結果は「ロジック構造」タブに表示）。
          {currentFramework && (
            <span className="ml-2 text-brand-400">
              現在: {frameworks.find(f => f.id === currentFramework)?.label ?? currentFramework}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {frameworks.map((f) => (
            <button
              key={f.id}
              onClick={() => setFramework(f.id)}
              title={f.description}
              className={`px-3 py-2 rounded-lg text-xs text-left transition-colors border ${
                framework === f.id
                  ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="font-semibold">{f.label}</div>
              <div className="opacity-70 mt-0.5">{f.node_types.join(' → ')}</div>
            </button>
          ))}
        </div>
        <button
          onClick={analyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Sparkles size={14} />
          {analyzing ? '分析中...' : 'セールス構造分析を実行'}
        </button>
      </section>

      {/* 販促素材の生成 */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-1">販促素材の生成</h3>
        <p className="text-xs text-gray-500 mb-4">
          同じ構造から各チャネル向けの素材を生成します。構造が未分析の場合は元コンテンツから生成します。
        </p>
        <div className="flex flex-wrap gap-2">
          {assetTypes.map((a) => {
            const exists = !!marketingAssets[a.id]
            return (
              <button
                key={a.id}
                onClick={() => generate(a.id)}
                disabled={generating !== null}
                title={a.description}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors border disabled:opacity-50 ${
                  exists
                    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:border-brand-500'
                    : 'bg-brand-600/10 border-brand-600/40 text-brand-300 hover:bg-brand-600/20'
                }`}
              >
                {generating === a.id ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : exists ? (
                  <RefreshCw size={12} />
                ) : (
                  <Sparkles size={12} />
                )}
                {a.label}
                {exists && <span className="opacity-60">（再生成）</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* 生成済み素材 */}
      {Object.values(marketingAssets).map((asset) => (
        <section key={asset.type} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">{asset.label}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{new Date(asset.generated_at).toLocaleString('ja-JP')}</span>
              <button
                onClick={() => removeAsset(asset.type)}
                className="text-gray-500 hover:text-red-400"
                title="削除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {asset.variants.map((v, i) => {
              const copyKey = `${asset.type}_${i}`
              const fullText = v.title ? `${v.title}\n\n${v.text}` : v.text
              return (
                <div key={copyKey} className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-3 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {v.title && <p className="text-sm font-semibold text-white mb-1">{v.title}</p>}
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{v.text}</p>
                    </div>
                    <button
                      onClick={() => copyText(copyKey, fullText)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
                      title="クリップボードにコピー"
                    >
                      {copied === copyKey ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      {copied === copyKey ? 'コピー済み' : 'コピー'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
