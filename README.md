# Content Structure Studio (CSS) 📐

> 「編集」ではなく「構造化」を中心に設計されたコンテンツ制作支援プラットフォーム  
> 思考・認知構造を整理し、再利用可能なコンテンツへ変換する

---

## プロジェクト理念

- **構造ファースト** — 素材の編集より、論理・認知の構造設計を優先する
- **相互変換** — 記事・スライド・動画・音声を同一構造から生成・変換できる
- **再利用性** — 一度作った構造は何度でも別フォーマットへ転換できる

---

## MVP 機能（現在実装済み）

| # | 機能 | 概要 |
|---|------|------|
| ① | コンテンツ入力 | Markdown・テキスト・URL記事・PDF対応 |
| ② | ロジック構造生成 | Claude APIで主張/根拠/具体例/結論をツリー抽出 |
| ③ | スライド自動生成 | 構造からタイトル・本文・発表者ノートを自動生成 |
| ④ | スライド編集 | 手動編集 + AI改善（スライド単体への指示） |
| ⑤ | 画像管理 | アップロード・リサイズ・2/3/4/6/9分割 |
| ⑥ | プロジェクト管理 | 作成・保存・読み込み・削除 |

---

## ディレクトリ構成

```
CSS/
├── README.md
├── start.ps1                  # 起動スクリプト
├── setup.ps1                  # 初回セットアップ
├── docs/
│   ├── requirements.md        # 要件定義書
│   └── maintenance.md         # メンテナンスマニュアル
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI エントリポイント
│   │   ├── core/
│   │   │   ├── config.py      # 環境変数管理
│   │   │   └── database.py    # SQLAlchemy + SQLite
│   │   ├── models/
│   │   │   └── project.py     # Project モデル
│   │   ├── api/
│   │   │   ├── projects.py    # プロジェクト CRUD + AI API
│   │   │   ├── content.py     # URL・PDF・Markdown 取得
│   │   │   └── images.py      # 画像操作 API
│   │   └── services/
│   │       ├── ai_service.py      # Claude API 連携
│   │       ├── content_service.py # コンテンツ取得
│   │       └── image_service.py   # 画像処理（Pillow）
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx     # サイドバーレイアウト
│   │   │   ├── LogicTree.tsx  # ロジック構造ツリー表示
│   │   │   └── SlideCard.tsx  # スライドカード（編集付き）
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── ProjectDetailPage.tsx
│   │   │   └── ImagesPage.tsx
│   │   ├── api/client.ts      # API クライアント
│   │   ├── store/             # Zustand ストア
│   │   └── types/             # TypeScript 型定義
│   ├── package.json
│   └── vite.config.ts
└── uploads/
    ├── images/
    ├── videos/
    └── audio/
```

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18 + TypeScript + Vite + Tailwind CSS |
| バックエンド | Python 3.12 + FastAPI + SQLAlchemy |
| データベース | SQLite（aiosqlite で非同期） |
| AI | Claude API（claude-sonnet-4-6） |
| 画像処理 | Pillow + OpenCV |
| 状態管理 | Zustand |

---

## セットアップ

### 初回

```powershell
# 1. Python venv + 依存インストール
.\setup.ps1

# 2. API キーを設定
notepad backend\.env
# → ANTHROPIC_API_KEY=sk-ant-...
```

### 起動

```powershell
# バックエンド（port 8000）
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# フロントエンド（port 5173）
cd frontend
npm run dev
```

→ `http://localhost:5173` をブラウザで開く  
→ API ドキュメント: `http://localhost:8000/docs`

---

## フェーズ計画

| フェーズ | 内容 | 状態 |
|---------|------|------|
| **Phase 1** | 記事→スライド自動生成（MVP） | ✅ 実装済み |
| **Phase 2** | 動画ユーティリティ（FFmpeg） | 🔲 未着手 |
| **Phase 3** | 音声機能（Whisper 文字起こし・字幕） | 🔲 未着手 |
| **Phase 4** | 人気動画分析（YouTube URL → 構成分析） | 🔲 未着手 |
| **Phase 5** | 認知変化分析・FPRL モデル | 🔲 未着手 |
