import anthropic
from app.core.config import settings
import json
import re
import logging
from json_repair import repair_json

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
    except json.JSONDecodeError:
        repaired = repair_json(raw)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError as e:
            logger.error("JSON parse error after repair: %s\nRaw: %s", e, raw[:1000])
            raise ValueError(f"AI応答のJSONパースに失敗: {e}") from e


async def generate_slides_from_structure(structure: dict) -> list[dict]:
    prompt = f"""以下の論理構造からプレゼンテーションスライドを生成してください。

論理構造:
{json.dumps(structure, ensure_ascii=False, indent=2)}

## スライドは「序・破・急」の3パターンで統一感を出してください

### 序（Jo）- 導入・文脈・前提を示す
静かで余白の多いレイアウト。テキスト中心。
使えるテンプレート: hero-headline, split-dark, 2col-diagram

### 破（Ha）- 問題・分析・展開・根拠を深掘りする
構造的・情報密度高め。フローや数字で見せる。
使えるテンプレート: flow-vertical, flow-horizontal, numbered-list, 3col-icons, 4grid-icons

### 急（Kyū）- 解決・結論・インパクトを打ち出す
大胆・全画面・図解。「だから何か」を強く示す。
使えるテンプレート: hub-spoke, fullbleed-overlay, mvv-stack, 3col-category

## 各スライドに必ず「phase」フィールドで jo/ha/kyu のどれかを指定してください

以下のJSON形式で出力（コードブロックなし、JSONのみ）:
[
  {{
    "id": "slide_1",
    "order": 1,
    "type": "title|content|section|conclusion",
    "phase": "jo|ha|kyu",
    "template": "phaseに対応するテンプレートから選択",
    "title": "スライドタイトル",
    "subtitle": "サブタイトルまたはセクションラベル",
    "body": "本文テキスト（箇条書きは\\nで区切る）",
    "accent_color": "#16進数カラー（コンテンツ全体で統一した1色を使い続ける）",
    "items": [
      {{"title": "項目タイトル", "body": "項目説明", "icon_hint": "アイコンの説明（英語）", "accent": "カテゴリ名"}}
    ],
    "speaker_notes": "発表者ノート",
    "source_node_id": "対応するノードID",
    "character_emotion": "normal|happy|very_happy|surprised|sad|crying|angry|thinking|smug|embarrassed|explaining"
  }}
]

ルール:
- 最初のスライドは phase=jo, template=hero-headline（タイトル）
- 最後のスライドは phase=kyu（まとめ・結論）
- コンテンツの流れに合わせて jo→ha→kyu の順で自然に推移させる
- accent_color はコンテンツ全体で1色に統一する（途中で変えない）
- items は flow/3col/4grid/numbered/mvv/hub/3col-category 系のテンプレートで必須（3〜5個）
- items の accent フィールドは3col-categoryのカテゴリ振り分けに使用
- character_emotion はスライドの雰囲気に合わせて選ぶ（jo→explaining/normal, ha→thinking/surprised/sad, kyu→smug/happy）"""

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
    except json.JSONDecodeError:
        repaired = repair_json(raw)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError as e:
            logger.error("JSON parse error (slides) after repair: %s\nRaw: %s", e, raw[:1000])
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
