import anthropic
from app.core.config import settings
import json
import re
import logging

logger = logging.getLogger(__name__)


client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY.strip())


async def extract_logic_structure(content: str) -> dict:
    prompt = f"""以下のコンテンツを分析し、論理構造をJSON形式で抽出してください。

コンテンツ:
{content}

以下のJSON形式で出力してください（コードブロックなし、JSONのみ）:
{{
  "title": "コンテンツのメインタイトル",
  "thesis": "主な主張・結論",
  "nodes": [
    {{
      "id": "node_1",
      "type": "現状|問題|原因|解決策|根拠|具体例|結論",
      "title": "ノードタイトル",
      "content": "詳細内容",
      "children": []
    }}
  ]
}}

typeは以下から選択: 現状, 問題, 原因, 解決策, 根拠, 具体例, 結論
childrenには同じ構造のノードを入れてください。"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    logger.info("extract_logic_structure raw response (first 500): %s", raw[:500])
    # コードブロック除去
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        raw = match.group(0)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s\nRaw: %s", e, raw[:1000])
        raise ValueError(f"AI応答のJSONパースに失敗: {e}") from e


async def generate_slides_from_structure(structure: dict) -> list[dict]:
    prompt = f"""以下の論理構造からプレゼンテーションスライドを生成してください。

論理構造:
{json.dumps(structure, ensure_ascii=False, indent=2)}

利用可能なテンプレートと使い分け:
- hero-headline: タイトル・大見出し・キャッチコピー
- split-dark: 左ダーク背景＋右箇条書き（セクション区切り）
- fullbleed-overlay: インパクトある背景＋テキストオーバーレイ
- 2col-diagram: 左説明＋右に要素リスト（説明＋要点）
- 3col-icons: 3つの特徴・メリットを横並び
- 4grid-icons: 4つの要素を2×2グリッド
- flow-vertical: 縦フロー（プロセス・ステップ・因果関係）
- flow-horizontal: 横フロー（前後の流れ・変化）
- hub-spoke: 中心概念＋周辺要素（エコシステム・関係図）
- mvv-stack: Mission/Vision/Value等の縦積み
- value-list: 価値観・原則のリスト（左に大きなラベル）
- numbered-list: 番号付き手順・ポイント（01/02/03スタイル）
- comparison-table: ◎△×の比較表
- 3col-category: 3カテゴリに分けた箇条書き
- logo-grid: 実績・パートナーのロゴ一覧

以下のJSON形式でスライドリストを出力してください（コードブロックなし、JSONのみ）:
[
  {{
    "id": "slide_1",
    "order": 1,
    "type": "title|content|section|conclusion",
    "template": "上記テンプレート名から最適なものを選択",
    "title": "スライドタイトル",
    "subtitle": "サブタイトルまたはセクションラベル",
    "body": "本文テキスト（箇条書きは\\nで区切る）",
    "accent_color": "#16進数カラー（コンテンツに合った色）",
    "items": [
      {{"title": "項目タイトル", "body": "項目説明", "icon_hint": "アイコンの説明（英語）", "accent": "カテゴリ名"}}
    ],
    "speaker_notes": "発表者ノート",
    "image_hint": "推奨画像の説明（英語）",
    "source_node_id": "対応するノードID"
  }}
]

ルール:
- 最初はhero-headlineのタイトルスライド
- 最後はhero-headlineかsplit-darkのまとめスライド
- items は flow/3col/4grid/numbered/mvv/hub系のテンプレートで必須（3〜5個推奨）
- accent_color はコンテンツのトーンに合わせて選ぶ（例: 技術→#4f6ef7, 自然→#10b981, 警告→#ef4444）
- items の accent フィールドは3col-categoryのカテゴリ振り分けに使用"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
    match = re.search(r"\[[\s\S]*\]", raw)
    if match:
        raw = match.group(0)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("JSON parse error (slides): %s\nRaw: %s", e, raw[:1000])
        raise ValueError(f"AI応答のJSONパースに失敗: {e}") from e


async def improve_slide(slide: dict, instruction: str) -> dict:
    prompt = f"""以下のスライドを改善してください。

現在のスライド:
{json.dumps(slide, ensure_ascii=False, indent=2)}

改善指示: {instruction}

改善後のスライドをJSON形式で返してください（コードブロックなし、JSONのみ）。
元のフィールド構造を維持してください。"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        raw = match.group(0)
    return json.loads(raw)
