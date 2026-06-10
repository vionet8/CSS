import { useNavigate } from 'react-router-dom'
import { PlusCircle, Layers, Image, Wand2 } from 'lucide-react'

const features = [
  {
    icon: Layers,
    title: 'ロジック構造化',
    desc: '記事・テキストから主張・根拠・具体例・結論を自動抽出',
  },
  {
    icon: Wand2,
    title: 'スライド自動生成',
    desc: '論理構造からプレゼンスライドをワンクリックで生成',
  },
  {
    icon: Image,
    title: '画像管理',
    desc: 'リサイズ・トリミング・2〜9分割など画像ユーティリティ',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Content Structure Studio</h1>
        <p className="text-gray-400 text-lg">
          思考を構造化し、再利用可能なコンテンツへ変換するプラットフォーム
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <Icon size={24} className="text-brand-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/projects/new')}
        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
      >
        <PlusCircle size={20} />
        新しいプロジェクトを作成
      </button>
    </div>
  )
}
