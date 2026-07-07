from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import logging
import uuid

from app.services.media_service import (
    ALLOWED_MEDIA_EXTENSIONS,
    cut_media,
    extract_audio,
    ffmpeg_available,
    media_dir,
    media_path,
    transcribe_media,
    whisper_available,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["media"])

MAX_MEDIA_BYTES = 500 * 1024 * 1024  # 500MB
CHUNK = 1024 * 1024


class CutRequest(BaseModel):
    filename: str
    start: float
    end: float


class FilenameRequest(BaseModel):
    filename: str


class TranscribeRequest(BaseModel):
    filename: str
    language: str = "ja"
    model_size: str = "small"


def _existing(filename: str) -> Path:
    try:
        path = media_path(filename)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not path.exists():
        raise HTTPException(status_code=404, detail="Media not found")
    return path


@router.get("/tools")
async def media_tools():
    tools = {"ffmpeg": ffmpeg_available(), "whisper": whisper_available()}
    hints = {}
    if not tools["ffmpeg"]:
        hints["ffmpeg"] = "winget install Gyan.FFmpeg でインストールしてください（カット・音声抽出に必要）"
    if not tools["whisper"]:
        hints["whisper"] = "backend/.venv で pip install faster-whisper を実行してください（文字起こしに必要）"
    return {**tools, "hints": hints}


@router.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"対応形式: {', '.join(sorted(ALLOWED_MEDIA_EXTENSIONS))}",
        )
    filename = f"{uuid.uuid4()}{ext}"
    path = media_path(filename)
    size = 0
    with path.open("wb") as f:
        while chunk := await file.read(CHUNK):
            size += len(chunk)
            if size > MAX_MEDIA_BYTES:
                f.close()
                path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File too large (max 500MB)")
            f.write(chunk)
    return {"filename": filename, "size": size, "original_name": file.filename}


@router.get("/")
async def list_media():
    files = []
    for p in sorted(media_dir().iterdir()):
        if p.is_file() and p.suffix.lower() in ALLOWED_MEDIA_EXTENSIONS | {".wav"}:
            files.append({"filename": p.name, "size": p.stat().st_size})
    return files


@router.get("/file/{filename}")
async def get_media(filename: str):
    return FileResponse(str(_existing(filename)))


@router.post("/cut")
async def cut(req: CutRequest):
    _existing(req.filename)
    if not ffmpeg_available():
        raise HTTPException(status_code=503, detail="FFmpegが見つかりません。/media/tools を確認してください")
    try:
        return await cut_media(req.filename, req.start, req.end)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("cut failed")
        raise HTTPException(status_code=500, detail=f"カットに失敗しました: {e}")


@router.post("/extract-audio")
async def extract(req: FilenameRequest):
    _existing(req.filename)
    if not ffmpeg_available():
        raise HTTPException(status_code=503, detail="FFmpegが見つかりません。/media/tools を確認してください")
    try:
        return await extract_audio(req.filename)
    except Exception as e:
        logger.exception("extract-audio failed")
        raise HTTPException(status_code=500, detail=f"音声抽出に失敗しました: {e}")


@router.post("/transcribe")
async def transcribe(req: TranscribeRequest):
    _existing(req.filename)
    if not whisper_available():
        raise HTTPException(
            status_code=503,
            detail="faster-whisper がインストールされていません。/media/tools を確認してください",
        )
    if req.model_size not in {"tiny", "base", "small", "medium"}:
        raise HTTPException(status_code=400, detail="model_size は tiny/base/small/medium")
    try:
        return await transcribe_media(req.filename, req.language, req.model_size)
    except Exception as e:
        logger.exception("transcribe failed")
        raise HTTPException(status_code=500, detail=f"文字起こしに失敗しました: {e}")
