export default function DocsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">使い方</h1>

      <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-white mb-2">Phase 1: 記事→スライド</h2>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>プロジェクトを新規作成</li>
            <li>テキスト・MarkdownをペーストするかURLから記事を取得</li>
            <li>「構造分析」ボタンで論理構造を抽出</li>
            <li>「スライド生成」でスライドを自動生成</li>
            <li>各スライドを手動編集またはAI改善</li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">画像管理</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>ドラッグ&ドロップで複数画像をアップロード</li>
            <li>リサイズ: 幅・高さを指定して変換</li>
            <li>分割: 2・3・4・6・9分割に対応</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">ロジック構造のノードタイプ</h2>
          <div className="grid grid-cols-2 gap-2">
            {['現状', '問題', '原因', '解決策', '根拠', '具体例', '結論'].map((t) => (
              <div key={t} className="bg-gray-800 rounded px-3 py-1.5 text-xs text-gray-300">
                {t}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
