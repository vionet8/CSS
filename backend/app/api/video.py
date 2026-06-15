import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.project import Project
from app.services import video_service, voicevox_service

router = APIRouter(prefix="/video", tags=["video"])


class ExportRequest(BaseModel):
    character: Optional[str] = "zundamon"
    slide_duration: float = 5.0
    resolution: str = "1280x720"
    with_narration: bool = True


class TrimRequest(BaseModel):
    filename: str
    start: float
    end: float


class ConcatRequest(BaseModel):
    filenames: list[str]


class AddAudioRequest(BaseModel):
    video_filename: str
    audio_filename: str


@router.get("/voicevox/status")
async def voicevox_status():
    ok = await voicevox_service.check_available()
    return {"available": ok}


@router.post("/projects/{project_id}/export")
async def export_video(
    project_id: str,
    req: ExportRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project or not project.slides:
        raise HTTPException(status_code=404, detail="Project or slides not found")

    slides = sorted(project.slides, key=lambda s: s.get("order", 0))

    try:
        w, h = map(int, req.resolution.split("x"))
        resolution = (w, h)
    except Exception:
        resolution = (1280, 720)

    temp_id = uuid.uuid4().hex
    temp_dir = video_service.TEMP_DIR / temp_id
    temp_dir.mkdir(parents=True)

    try:
        voicevox_ok = False
        if req.with_narration:
            voicevox_ok = await voicevox_service.check_available()

        clip_paths = []
        for i, slide in enumerate(slides):
            audio_path = None

            if voicevox_ok:
                notes = (slide.get("speaker_notes") or "").strip()
                if notes:
                    ap = temp_dir / f"audio_{i:04d}.wav"
                    ok = await voicevox_service.generate_audio(
                        text=notes,
                        character=req.character or "zundamon",
                        emotion=slide.get("character_emotion", "normal"),
                        output_path=ap,
                    )
                    if ok:
                        audio_path = ap

            clip = await video_service.create_slide_clip(
                slide=slide,
                index=i,
                audio_path=audio_path,
                temp_dir=temp_dir,
                default_duration=req.slide_duration,
                resolution=resolution,
            )
            clip_paths.append(clip)

        out_name = f"{uuid.uuid4().hex}_export.mp4"
        out_path = video_service.VIDEOS_DIR / out_name
        await video_service.concat_clips(clip_paths, out_path)

        return {
            "filename": out_name,
            "url": f"/video/file/{out_name}",
            "slide_count": len(slides),
            "narration": voicevox_ok,
        }

    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    ext = Path(file.filename or "video.mp4").suffix or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = video_service.VIDEOS_DIR / filename
    path.write_bytes(await file.read())
    return {"filename": filename}


@router.get("/file/{filename}")
async def get_video(filename: str):
    path = video_service.VIDEOS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)


@router.post("/trim")
async def trim(req: TrimRequest):
    try:
        out = await video_service.trim_video(req.filename, req.start, req.end)
        return {"filename": out, "url": f"/video/file/{out}"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/concat")
async def concat(req: ConcatRequest):
    if len(req.filenames) < 2:
        raise HTTPException(status_code=400, detail="At least 2 videos required")
    try:
        out = await video_service.concat_videos(req.filenames)
        return {"filename": out, "url": f"/video/file/{out}"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-audio")
async def add_audio_to_video(req: AddAudioRequest):
    try:
        out = await video_service.add_audio(req.video_filename, req.audio_filename)
        return {"filename": out, "url": f"/video/file/{out}"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    ext = Path(file.filename or "audio.wav").suffix or ".wav"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = video_service.AUDIO_DIR / filename
    path.write_bytes(await file.read())
    return {"filename": filename}
