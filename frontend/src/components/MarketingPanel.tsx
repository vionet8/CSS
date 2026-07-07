import { useEffect, useState } from 'react'
import { Megaphone, Save, Sparkles, Copy, Check, Trash2, RefreshCw } from 'lucide-react'
import type { Project, MarketingFramework, MarketingAssetType, MarketingProfile } from '../types'
import { errorDetail } from '../store/projectStore'
import * as api from '../api/client'

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
        <div className="mt-3 flex justify-end">
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm disabled:opacity-50"
          >
            <Save size={14} />
            {savingProfile ? '保存中...' : 'プロファイルを保存'}
          </button>
        </div>
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
