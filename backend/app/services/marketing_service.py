"""セールス・マーケティング支援機能。

プロダクトの販促を第一目的として、コンテンツを
セールスフレームワークで構造化し、同一構造から
複数チャネルの販促素材（X投稿・LPコピー・メール・
プレスリリース・広告コピー）を生成する。
"""
import json
from datetime import datetime, timezone

from app.services.ai_service import _call_claude, _parse_ai_json

# 構造分析に使えるセールスフレームワーク
FRAMEWORKS: dict[str, dict] = {
    "pasona": {
        "label": "PASONA（セールスレター）",
        "description": "問題提起から行動喚起まで、購買心理に沿って訴求する定番構成",
        "node_types": ["問題", "共感", "解決策", "提案", "絞込", "行動喚起"],
    },
    "aidma": {
        "label": "AIDMA（購買行動）",
        "description": "注意→興味→欲求→記憶→行動の認知プロセスで整理する",
        "node_types": ["注意", "興味", "欲求", "記憶", "行動"],
    },
    "fab": {
        "label": "FAB（提案営業）",
        "description": "特徴→優位性→便益→証拠で製品価値を論理的に示す",
        "node_types": ["特徴", "優位性", "便益", "証拠"],
    },
}

# 生成できる販促素材
ASSET_TYPES: dict[str, dict] = {
    "x_post": {
        "label": "X（SNS）投稿",
        "description": "140字以内の投稿を3案",
        "instruction": "X（旧Twitter）投稿を3案。各案は日本語140字以内、ハッシュタグ2個まで。フックの強い1文目にする。",
        "count": 3,
    },
    "lp_copy": {
        "label": "LPコピー",
        "description": "ヒーローコピー・ベネフィット・CTA",
        "instruction": "ランディングページ用コピー一式。1案目=ヒーロー見出し+サブコピー、2〜4案目=ベネフィット訴求（見出し+説明）、最後の案=CTAボタン文言+後押し文。",
        "count": 5,
    },
    "sales_email": {
        "label": "セールスメール",
        "description": "件名＋本文の営業メール",
        "instruction": "セールスメールを2案。各案 title=件名、text=本文（300字程度、宛名は「{{name}}様」プレースホルダ、最後に明確なCTA）。",
        "count": 2,
    },
    "press_release": {
        "label": "プレスリリース",
        "description": "タイトル・リード・本文",
        "instruction": "プレスリリース1案。title=リリースタイトル、text=リード文+本文（500字程度、5W1Hを明確に、誇張表現を避ける）。",
        "count": 1,
    },
    "ad_copy": {
        "label": "広告コピー",
        "description": "広告見出しを5案",
        "instruction": "ディスプレイ/検索広告用の見出しコピーを5案。各案 title=見出し（30字以内）、text=説明文（90字以内）。",
        "count": 5,
    },
}


def _profile_block(profile: dict | None) -> str:
    if not profile:
        return ""
    lines = ["## プロダクト情報（この内容に沿って訴求すること）"]
    for key, label in [
        ("product_name", "プロダクト名"),
        ("target_audience", "ターゲット顧客"),
        ("goal", "訴求ゴール（読者に取ってほしい行動）"),
        ("tone", "トーン"),
    ]:
        if profile.get(key):
            lines.append(f"- {label}: {profile[key]}")
    return "\n".join(lines) + "\n"


async def extract_marketing_structure(
    content: str, framework: str, profile: dict | None = None
) -> dict:
    """コンテンツをセールスフレームワークで構造化する。"""
    fw = FRAMEWORKS.get(framework)
    if not fw:
        raise KeyError(framework)

    types = fw["node_types"]
    prompt = f"""あなたはセールス・マーケティングの専門家です。
以下のコンテンツを「{fw['label']}」フレームワークで販促用に構造化してください。

{_profile_block(profile)}
コンテンツ:
{content}

以下のJSON形式で出力してください（コードブロックなし、JSONのみ）:
{{
  "title": "販促コンテンツのタイトル",
  "thesis": "中心となるセールスメッセージ（1文）",
  "nodes": [
    {{
      "id": "node_1",
      "type": "{types[0]}",
      "title": "ノードタイトル",
      "content": "詳細内容（具体的な訴求文）",
      "children": []
    }}
  ]
}}

ルール:
- type は必ず次から選択: {", ".join(types)}
- フレームワークの順序（{"→".join(types)}）に沿ってノードを並べる
- 各typeにつき最低1ノードを作る
- childrenには同じ構造の補足ノードを入れてよい"""

    raw = await _call_claude(prompt)
    result = _parse_ai_json(raw, r"\{[\s\S]*\}", f"marketing-{framework}")
    if not isinstance(result, dict):
        raise ValueError("AI応答が想定形式（JSONオブジェクト）ではありません")
    result["framework"] = framework
    return result


async def generate_marketing_asset(
    source: str, asset_type: str, profile: dict | None = None
) -> dict:
    """構造またはコンテンツから販促素材を生成する。"""
    spec = ASSET_TYPES.get(asset_type)
    if not spec:
        raise KeyError(asset_type)

    prompt = f"""あなたはセールス・マーケティングのコピーライターです。
以下の素材をもとに販促用の「{spec['label']}」を作成してください。

{_profile_block(profile)}
素材:
{source}

作成指示: {spec['instruction']}

以下のJSON形式で出力してください（コードブロックなし、JSONのみ）:
[
  {{"title": "案の見出しや件名（不要なら空文字）", "text": "本文テキスト"}}
]

ルール:
- 必ず{spec['count']}案の配列にする
- 事実に基づき、素材にない実績・数値を捏造しない
- ターゲット顧客に刺さる言葉を選ぶ"""

    raw = await _call_claude(prompt)
    result = _parse_ai_json(raw, r"\[[\s\S]*\]", f"asset-{asset_type}")
    if not isinstance(result, list) or not all(isinstance(v, dict) for v in result):
        raise ValueError("AI応答が想定形式（案のJSON配列）ではありません")

    variants = [
        {"title": str(v.get("title", "")), "text": str(v.get("text", ""))}
        for v in result
        if v.get("text")
    ]
    if not variants:
        raise ValueError("AI応答に有効な案が含まれていません")

    return {
        "type": asset_type,
        "label": spec["label"],
        "variants": variants,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def structure_to_text(structure: dict) -> str:
    """logic_structure を素材テキストに変換する。"""

    def walk(nodes, depth=0):
        lines = []
        for n in nodes or []:
            indent = "  " * depth
            lines.append(f"{indent}- [{n.get('type', '')}] {n.get('title', '')}: {n.get('content', '')}")
            lines.extend(walk(n.get("children"), depth + 1))
        return lines

    parts = [
        f"タイトル: {structure.get('title', '')}",
        f"中心メッセージ: {structure.get('thesis', '')}",
        *walk(structure.get("nodes")),
    ]
    return "\n".join(p for p in parts if p.strip())


def options() -> dict:
    """UI用: 利用可能なフレームワークと素材タイプの一覧。"""
    return {
        "frameworks": [
            {"id": k, "label": v["label"], "description": v["description"], "node_types": v["node_types"]}
            for k, v in FRAMEWORKS.items()
        ],
        "asset_types": [
            {"id": k, "label": v["label"], "description": v["description"]}
            for k, v in ASSET_TYPES.items()
        ],
    }
