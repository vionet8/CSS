from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.video_service import generate_promo_video
from app.services.image_gen_service import generate_image

router = APIRouter(prefix="/video", tags=["video"])


class PromoRequest(BaseModel):
    app_name: str
    features: str
    target: str
    tone: str = "親しみやすく・テンポよく"
    generate_images: bool = False


class ImageRequest(BaseModel):
    prompt: str


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
