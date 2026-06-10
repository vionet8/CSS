# メンテナンスマニュアル — Content Structure Studio

**対象**: 開発者（木田昌樹）  
**最終更新**: 2026-06-10

---

## 1. 日常的な起動・停止

### バックエンド起動

```powershell
cd C:\Apps\CSS\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

`--reload` で `.py` ファイルの変更を自動検知して再起動。

### フロントエンド起動

```powershell
cd C:\Apps\CSS\frontend
npm run dev
```

Vite の HMR でファイル変更が即時反映。

### ヘルスチェック

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
# → {"status":"ok"}
```

### API ドキュメント

`http://localhost:8000/docs` （Swagger UI）で全エンドポイントを確認・テスト可能。

---

## 2. 環境変数

**ファイル**: `backend\.env`

```env
ANTHROPIC_API_KEY=sk-ant-...      # 必須: Anthropic コンソールで取得
DATABASE_URL=sqlite+aiosqlite:///./css.db   # デフォルトのまま
UPLOAD_DIR=../uploads             # uploads/ フォルダの相対パス
CORS_ORIGINS_STR=http://localhost:5173      # カンマ区切りで複数指定可
```

**API キーの取得**: https://console.anthropic.com/

**注意**: `.env` は Git 管理外（`.gitignore` に含める）。

---

## 3. データベース

### 場所

```
backend/css.db   （SQLite ファイル）
```

### バックアップ

```powershell
Copy-Item C:\Apps\CSS\backend\css.db "C:\Apps\CSS\backend\css_backup_$(Get-Date -Format 'yyyyMMdd').db"
```

### リセット（全データ削除）

```powershell
Remove-Item C:\Apps\CSS\backend\css.db
# 次回起動時に自動再作成される
```

### 中身を確認（SQLite）

```powershell
# Python で確認
.\.venv\Scripts\python.exe -c "
import sqlite3
conn = sqlite3.connect('css.db')
for row in conn.execute('SELECT id, title, updated_at FROM projects'):
    print(row)
"
```

---

## 4. 依存関係の更新

### Python

```powershell
cd C:\Apps\CSS\backend
.\.venv\Scripts\pip install -r requirements.txt --upgrade
```

### Node.js

```powershell
cd C:\Apps\CSS\frontend
npm update
```

---

## 5. よくあるエラーと対処

### バックエンドが起動しない

**症状**: `uvicorn` コマンドでエラー

```powershell
# 原因1: venv が壊れている → 再作成
Remove-Item -Recurse -Force C:\Apps\CSS\backend\.venv
py -3.12 -m venv C:\Apps\CSS\backend\.venv
.\.venv\Scripts\pip install -r requirements.txt

# 原因2: ポート競合
netstat -ano | Select-String ":8000"
# PID を確認して Stop-Process -Id <PID> -Force
```

### CORS エラー（フロントエンドから API が叩けない）

```
# backend\.env を確認
CORS_ORIGINS_STR=http://localhost:5173

# 複数オリジンを許可する場合
CORS_ORIGINS_STR=http://localhost:5173,http://localhost:3000
```

### Claude API エラー

| エラーコード | 原因 | 対処 |
|-------------|------|------|
| 401 | API キーが無効 | `.env` の `ANTHROPIC_API_KEY` を確認 |
| 429 | レートリミット | 少し待って再試行 |
| 500 | モデル側エラー | リトライ or モデル名確認 |

**現在のモデル**: `claude-sonnet-4-6`（`ai_service.py` で変更可）

### 画像が表示されない

```powershell
# uploads ディレクトリの存在確認
Test-Path C:\Apps\CSS\uploads\images
# なければ作成
New-Item -ItemType Directory -Path C:\Apps\CSS\uploads\images -Force
```

### PDF テキスト抽出が空になる

PyPDF2 はスキャン PDF（画像 PDF）のテキスト抽出ができない。  
→ 将来的に `pytesseract`（OCR）を追加予定。

---

## 6. ファイル・フォルダの役割

| パス | 説明 |
|------|------|
| `backend/app/main.py` | FastAPI アプリのエントリポイント・ルーター登録 |
| `backend/app/core/config.py` | 環境変数 + `Settings` クラス |
| `backend/app/core/database.py` | DB エンジン・セッション・`init_db()` |
| `backend/app/models/project.py` | `Project` テーブル定義 |
| `backend/app/api/projects.py` | プロジェクト CRUD・AI 呼び出しエンドポイント |
| `backend/app/api/content.py` | URL・PDF・Markdown 変換エンドポイント |
| `backend/app/api/images.py` | 画像操作エンドポイント |
| `backend/app/services/ai_service.py` | Claude API 呼び出しロジック（プロンプト管理） |
| `backend/app/services/content_service.py` | BeautifulSoup・PyPDF2 処理 |
| `backend/app/services/image_service.py` | Pillow 画像処理 |
| `frontend/src/api/client.ts` | バックエンド API 呼び出し関数集 |
| `frontend/src/store/projectStore.ts` | Zustand グローバルストア |
| `uploads/` | アップロードされた画像・動画・音声 |
| `backend/css.db` | SQLite データベース |

---

## 7. AI プロンプトの調整

`backend/app/services/ai_service.py` にある3つの関数でプロンプト管理。

### ロジック構造プロンプト（`extract_logic_structure`）

- ノードタイプを増やす/減らす場合: `typeは以下から選択:` の行を編集
- 抽出精度を上げたい場合: コンテキスト例を追加

### スライド生成プロンプト（`generate_slides_from_structure`）

- スライド枚数を増やしたい: `最初はタイトルスライド、最後はまとめスライドを入れてください。` の前に枚数の目安を追記
- 出力フォーマット変更: JSON フィールドの説明を修正

---

## 8. 将来の実装メモ

### FFmpeg 統合（Phase 2）

```python
# backend/app/services/video_service.py
import subprocess

def trim_video(input_path, output_path, start_sec, end_sec):
    subprocess.run([
        "ffmpeg", "-i", input_path,
        "-ss", str(start_sec), "-to", str(end_sec),
        "-c", "copy", output_path
    ], check=True)
```

FFmpeg は別途インストール必要: https://ffmpeg.org/download.html

### Whisper 統合（Phase 3）

```python
# requirements.txt に追加
openai-whisper==20240927

# backend/app/services/audio_service.py
import whisper

model = whisper.load_model("base")  # small, medium, large も選択可

def transcribe(audio_path):
    result = model.transcribe(audio_path, language="ja")
    return result["text"], result["segments"]
```

### YouTube 分析（Phase 4）

```python
# requirements.txt に追加
yt-dlp==2024.10.7

# 字幕・メタデータ取得 → Claude で構成分析
```

---

## 9. Git 管理（推奨）

```powershell
cd C:\Apps\CSS
git init

# .gitignore を作成
@"
backend/.venv/
backend/css.db
backend/.env
uploads/
frontend/node_modules/
frontend/dist/
__pycache__/
*.pyc
"@ | Out-File -Encoding utf8 .gitignore

git add .
git commit -m "Initial: Content Structure Studio MVP"
```
