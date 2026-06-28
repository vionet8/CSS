from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.video_service import generate_promo_video
from app.services.image_gen_service import generate_image

router = APIRouter(prefix="/video", tags=["video"])

DEMO_VIDEO = {
    "app_name": "レシピック",
    "tagline": "今日の献立、AIにおまかせ",
    "accent_color": "#06C755",
    "total_duration": 27,
    "scenes": [
        {
            "id": "scene_1", "order": 1, "type": "splash", "duration": 3,
            "title": "レシピックへようこそ",
            "subtitle": "毎日の献立を解決するLINEアプリ",
            "narration": "毎日の献立、もう悩まない。",
            "image_prompt": "Minimalist Japanese recipe app splash screen, green and white",
            "mockup": {"type": "splash", "data": {"logo_emoji": "🍱", "tagline": "今日の献立、AIにおまかせ"}}
        },
        {
            "id": "scene_2", "order": 2, "type": "problem", "duration": 4,
            "title": "こんな悩み、ありませんか？",
            "subtitle": "",
            "narration": "毎日の献立を考えるのって、意外と大変ですよね。",
            "image_prompt": "Stressed Japanese woman thinking about dinner",
            "mockup": {"type": "line_chat", "data": {"messages": [
                {"role": "user", "text": "今日の夕飯どうしよう..."},
                {"role": "user", "text": "また同じメニューになっちゃう😥"}
            ]}}
        },
        {
            "id": "scene_3", "order": 3, "type": "solution", "duration": 3,
            "title": "レシピックが解決！",
            "subtitle": "",
            "narration": "レシピックなら、LINEだけで献立問題が解決します！",
            "image_prompt": "Happy Japanese family eating delicious food together",
            "mockup": {"type": "feature_highlight", "data": {
                "icon": "✨",
                "headline": "AIが献立をまるごとサポート",
                "points": ["食材を入力するだけで献立提案", "LINEのトーク画面で完結", "栄養バランスも自動計算"]
            }}
        },
        {
            "id": "scene_4", "order": 4, "type": "feature", "duration": 4,
            "title": "使い方は超カンタン",
            "subtitle": "",
            "narration": "使い方は簡単。冷蔵庫の食材を送るだけ！",
            "image_prompt": "Japanese smartphone showing LINE chat with recipe bot",
            "mockup": {"type": "line_chat", "data": {"messages": [
                {"role": "user", "text": "今日は鶏肉と玉ねぎとにんじんがあります🥕"},
                {"role": "bot", "text": "チキンカレーはいかがですか？✨\n⏱ 30分 / 難易度★★☆\n栄養バランス◎"},
                {"role": "bot", "text": "レシピを送ります👇"}
            ]}}
        },
        {
            "id": "scene_5", "order": 5, "type": "feature", "duration": 4,
            "title": "本格レシピをその場で表示",
            "subtitle": "",
            "narration": "プロ級レシピが手元にすぐ届きます。",
            "image_prompt": "Beautiful chicken curry recipe card with ingredients",
            "mockup": {"type": "recipe_card", "data": {
                "recipe_name": "鶏もも肉の本格チキンカレー",
                "time": "30分",
                "difficulty": "★★☆",
                "calories": "520kcal",
                "ingredients": ["鶏もも肉 300g", "玉ねぎ 1個", "にんじん 1本", "カレールー 4皿分", "トマト缶 1/2個", "にんにく 1片"]
            }}
        },
        {
            "id": "scene_6", "order": 6, "type": "review", "duration": 5,
            "title": "みんなの声",
            "subtitle": "",
            "narration": "すでに多くの方が毎日使っています！",
            "image_prompt": "Happy Japanese users leaving positive reviews on smartphone",
            "mockup": {"type": "review_cards", "data": {"reviews": [
                {"user": "主婦Aさん（35歳）", "avatar_emoji": "👩", "rating": 5, "text": "冷蔵庫の残り物を入力するだけで献立が決まる！毎日使ってます😊"},
                {"user": "一人暮らしBさん（22歳）", "avatar_emoji": "👨‍🎓", "rating": 5, "text": "料理が苦手でもわかりやすい。節約にもなって最高！"},
                {"user": "共働きCさん（38歳）", "avatar_emoji": "👩‍💼", "rating": 5, "text": "帰宅途中にLINEで献立決められる。時短神アプリ🙌"}
            ]}}
        },
        {
            "id": "scene_7", "order": 7, "type": "cta", "duration": 4,
            "title": "今すぐ友達追加！",
            "subtitle": "",
            "narration": "レシピックを友達追加して、今日から献立の悩みを解決しましょう！",
            "image_prompt": "LINE add friend QR code for recipe app",
            "mockup": {"type": "cta", "data": {
                "button_text": "友達追加はこちら",
                "sub_text": "完全無料！今すぐ使える",
                "badge": "登録0円"
            }}
        }
    ]
}


class PromoRequest(BaseModel):
    app_name: str
    features: str
    target: str
    tone: str = "親しみやすく・テンポよく"
    generate_images: bool = False


class ImageRequest(BaseModel):
    prompt: str


@router.get("/demo")
async def get_demo():
    return DEMO_VIDEO


@router.post("/generate-promo")
async def generate_promo(req: PromoRequest):
    try:
        video = await generate_promo_video(
            app_name=req.app_name,
            features=req.features,
            target=req.target,
            tone=req.tone,
        )

        if req.generate_images:
            for scene in video.get("scenes", []):
                prompt = scene.get("image_prompt", "")
                if prompt:
                    url = await generate_image(prompt)
                    if url:
                        scene["generated_image_url"] = url

        return video
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"動画生成エラー: {e}")


@router.post("/generate-image")
async def generate_single_image(req: ImageRequest):
    url = await generate_image(req.prompt)
    return {"url": url}
