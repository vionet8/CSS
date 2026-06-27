import anthropic
import json
import re
import logging
from app.core.config import settings
from json_repair import repair_json

logger = logging.getLogger(__name__)

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY.strip())


async def generate_promo_video(
    app_name: str,
    features: str,
    target: str,
    tone: str,
) -> dict:
    prompt = f"""LINEアプリ「{app_name}」の勧誘動画の構成をJSONで生成してください。

アプリ情報:
- 機能・特徴: {features}
- ターゲット: {target}
- トーン: {tone}

以下のJSON形式で出力してください（コードブロックなし、JSONのみ）:
{{
  "app_name": "{app_name}",
  "tagline": "キャッチコピー（20文字以内）",
  "accent_color": "#HEX（ブランドカラー、LINEグリーン系推奨）",
  "total_duration": 合計秒数（整数）,
  "scenes": [
    {{
      "id": "scene_1",
      "order": 1,
      "type": "splash",
      "duration": 3,
      "title": "シーンタイトル",
      "subtitle": "サブタイトル（任意、なければ空文字）",
      "narration": "ナレーション台本（話し言葉、20〜40文字）",
      "image_prompt": "英語での画像生成プロンプト（DALL-E向け、具体的に）",
      "mockup": {{
        "type": "splash",
        "data": {{}}
      }}
    }}
  ]
}}

必須シーン構成（この順番で）:
1. type=splash (3秒) - アプリ名・キャッチコピーの導入
   mockup.data: {{"logo_emoji": "絵文字", "tagline": "キャッチコピー"}}

2. type=problem (4秒) - ターゲットの悩みをLINEチャット風に描写
   mockup.type: "line_chat"
   mockup.data: {{"messages": [{{"role": "user", "text": "悩みのセリフ"}}, {{"role": "user", "text": "続きのセリフ"}}]}}

3. type=solution (3秒) - アプリが解決することを提示
   mockup.type: "feature_highlight"
   mockup.data: {{"icon": "絵文字", "headline": "解決策の見出し", "points": ["ポイント1", "ポイント2", "ポイント3"]}}

4. type=feature (4秒) - 主要機能デモ1：LINEチャットでの操作
   mockup.type: "line_chat"
   mockup.data: {{"messages": [{{"role": "user", "text": "ユーザーの入力"}}, {{"role": "bot", "text": "AIの返答（詳しく）"}}, {{"role": "bot", "text": "続きの返答"}}}]}}

5. type=feature (4秒) - 主要機能デモ2：レシピカード
   mockup.type: "recipe_card"
   mockup.data: {{"recipe_name": "料理名", "time": "30分", "difficulty": "★★☆", "calories": "450kcal", "ingredients": ["材料1 量", "材料2 量", "材料3 量", "材料4 量"]}}

6. type=review (5秒) - 実際っぽいユーザーの声
   mockup.type: "review_cards"
   mockup.data: {{"reviews": [{{"user": "ユーザー名（例: 主婦Aさん・35歳）", "avatar_emoji": "👩", "rating": 5, "text": "口コミ文章（40文字以内）"}}, {{"user": "...", "avatar_emoji": "👨", "rating": 5, "text": "..."}}]}}

7. type=cta (4秒) - 友達追加を促すCTA
   mockup.type: "cta"
   mockup.data: {{"button_text": "友達追加はこちら", "sub_text": "完全無料！今すぐ使える", "badge": "登録0円"}}

ルール:
- narrationはナレーターが読む台本（句読点あり、自然な話し言葉）
- image_promptは英語で、recipe/food/Japanese/LINE appのコンテキストを含める
- レビューはリアルだが架空のもの（実在ユーザーを示唆しない）
- accent_colorはブランドに合った色（LINEグリーン #06C755 やそれに近い色を推奨）"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    logger.info("generate_promo_video raw (first 500): %s", raw[:500])
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
    raw = re.sub(r"```\s*$", "", raw).strip()
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
            logger.error("JSON parse error after repair: %s\nRaw: %s", e, raw[:2000])
            raise ValueError(f"AI応答のJSONパースに失敗: {e}") from e
