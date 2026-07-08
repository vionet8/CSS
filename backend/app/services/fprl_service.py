"""FPRL認知変化分析（Phase 5）。

FPRL理論（ユーザー独自の学習仮説）に基づき、コンテンツが
読者の認知変化（F更新）を起こせる設計になっているかを審査する。

FPRL = Foundation（基盤）→ Perception（知覚）→ Reasoning（推論）→ Learning（学習）。
「差分があっても学習は自動では起きない」— E₁〜E₃のゲートを
すべて通過した差分（有効差分）だけがFを書き換える。
"""
from app.services.ai_service import _call_claude, _parse_ai_json

# 審査する認知ステージ（読者がコンテンツで通過すべきゲート）
FPRL_STAGES = [
    {
        "id": "E1",
        "label": "E₁ 気づくゲート（差分検知）",
        "question": "読者の既存の基準（F）とのズレを検知させる仕掛け（フック・意外性・違和感）があるか",
    },
    {
        "id": "E2",
        "label": "E₂ トリアージ（処理する価値）",
        "question": "その差分を「自分に重要で、扱える」と判断させる要素（自分ごと化・処理可能性の提示）があるか",
    },
    {
        "id": "R",
        "label": "R 推論支援（因果の構造化）",
        "question": "「なぜそうなるのか」の因果構造と「どうすればいいか」の操作化を読者が展開できる説明があるか",
    },
    {
        "id": "E3",
        "label": "E₃ 受容ゲート（F更新の許可）",
        "question": "読者が既存の基準を書き換えることへの抵抗（自己正当化・回避）を下げる要素（共感・証拠・段階提示）があるか",
    },
    {
        "id": "L",
        "label": "L 定着（行動への変換）",
        "question": "更新された基準を行動として再現できる具体的な次の一歩（CTA・手順）があるか",
    },
]

_THEORY = """## FPRL理論の要点（この理論に基づいて審査すること）
- 学習とは F（基盤: 世界を解釈する基準・前提・価値観）が書き換わり、変化が再現可能になること
- ループ: F →(E₁: 基準とのズレ=差分の検知)→ P →(E₂: 処理可能性+実行許容)→ R →(E₃: 受容・F更新の許可)→ L → F更新
- 「差分が存在すること」と「学習が起きること」は別物。どこかのゲートで止まれば学習（認知変化）は起きない
- 停滞パターン: 差分を見落とす（E₁不通過）/ 重要と思わない・扱えないと感じる（E₂不通過）/ 因果が掴めず素通り（R弱）/ 行動は変えても基準を書き換えない・拒否/回避（E₃不通過, L未受容）
- 外的差分（現実との接触）は強いがコスト高、構造差分（他者のFの注入=学び）はF₁更新に留まりやすい。実践への接続が定着を生む
- 響残（echo）: 感情・失敗・成功を伴う差分ほど次サイクルへの残響が強く、気づきの感度を上げる"""


async def analyze_fprl(content: str, profile: dict | None = None) -> dict:
    """コンテンツを読者の認知変化（F更新）設計として審査する。"""
    profile = profile or {}
    target = profile.get("target_audience") or "想定読者"
    goal = profile.get("goal") or "コンテンツの主張の受容"

    stages_desc = "\n".join(f"- {s['id']}: {s['label']} — {s['question']}" for s in FPRL_STAGES)

    prompt = f"""あなたは認知変化設計の分析者です。以下のFPRL理論に基づき、
コンテンツが読者の認知変化を起こせる設計になっているかを審査してください。

{_THEORY}

ターゲット読者: {target}
変化のゴール: {goal}

コンテンツ:
{content}

審査するステージ:
{stages_desc}

以下のJSON形式で出力してください（コードブロックなし、JSONのみ）:
{{
  "reader_before": {{
    "foundation": "読者の現在のF（前提・思い込み・基準）を1〜2文で",
    "behavior": "その基準から生まれている現在の行動"
  }},
  "reader_after": {{
    "foundation": "コンテンツが目指す更新後のF（新しい基準）",
    "behavior": "基準が書き換わった後に期待される行動"
  }},
  "stages": [
    {{
      "id": "E1",
      "status": "ok | weak | missing",
      "evidence": "コンテンツ内の該当箇所（引用または要約。missingなら空文字）",
      "comment": "このゲートを通過できるかの分析"
    }}
  ],
  "gaps": [
    {{
      "stage": "止まるゲートのid",
      "issue": "読者がここで停滞する理由（論理の穴・欠落要素）",
      "fix": "具体的な修正案（何をどこに足すか）"
    }}
  ],
  "verdict": "総評（2〜3文。このままで読者のFは書き換わるか、最優先で直すべきゲートはどこか）"
}}

ルール:
- stages は E1, E2, R, E3, L の5つすべてについて順番に出す
- evidence は実際にコンテンツにある内容だけを使う（捏造しない）
- gaps は status が weak/missing のステージすべてについて出す（okのみなら空配列）"""

    raw = await _call_claude(prompt)
    result = _parse_ai_json(raw, r"\{[\s\S]*\}", "fprl")
    if (
        not isinstance(result, dict)
        or not isinstance(result.get("stages"), list)
        or len(result["stages"]) < 5
    ):
        raise ValueError("AI応答が想定形式（FPRL分析JSON）ではありません")
    result.setdefault("gaps", [])
    result.setdefault("verdict", "")
    return result
