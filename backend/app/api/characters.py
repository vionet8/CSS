from fastapi import APIRouter, HTTPException
from app.services.character_service import list_characters, get_character_metadata

router = APIRouter(prefix="/characters", tags=["characters"])


@router.get("/")
async def get_characters():
    return list_characters()


@router.get("/{character}/emotions")
async def get_emotions(character: str):
    meta = get_character_metadata(character)
    if not meta:
        raise HTTPException(status_code=404, detail="Character not found")
    return meta
