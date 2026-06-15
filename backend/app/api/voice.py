from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from app.services import voicevox_service

router = APIRouter(prefix="/api/voice", tags=["voice"])


class SynthesizeRequest(BaseModel):
    text: str
    character: str = "zundamon"
    emotion: str = "normal"


@router.get("/status")
async def voice_status():
    available = await voicevox_service.check_available()
    return {"available": available}


@router.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    if not req.text.strip():
        raise HTTPException(400, "text is required")
    try:
        wav_bytes = await voicevox_service.synthesize(req.text, req.character, req.emotion)
    except Exception as e:
        raise HTTPException(503, f"VOICEVOX error: {e}")
    return Response(content=wav_bytes, media_type="audio/wav")
