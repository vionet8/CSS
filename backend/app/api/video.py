from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from pathlib import Path
import logging

from app.core.config import settings
from app.core.database import get_db
from app.models.project import Project
from app.services.video_service import (
    SPEAKERS,
    check_tools,
    render_video,
    slides_to_srt,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/video", tags=["video"])

MAX_FRAME_BYTES = 10 * 1024 * 1024


class RenderRequest(BaseModel):
    character: str = "zundamon"


async def _get_project(project_id: str, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _work_dir(project_id: str) -> Path:
    d = Path(settings.UPLOAD_DIR) / "videos" / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.get("/tools")
async def video_tools():
    """FFmpeg / VOICEVOX の利用可否と導入方法を返す。"""
    tools = await check_tools()
    hints = {}
    if not tools["ffmpeg"]:
        hints["ffmpeg"] = "winget install Gyan.FFmpeg でインストール後、ターミナルを再起動してください"
    if not tools["voicevox"]:
        hints["voicevox"] = "https://voicevox.hiroshiba.jp/ からインストールし、VOICEVOXを起動しておいてください"
    return {**tools, "hints": hints, "speakers": list(SPEAKERS)}


@router.post("/frames")
async def upload_frame(
    project_id: str,
    order: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """フロントで描画したスライドPNGを1枚アップロードする。"""
    await _get_project(project_id, db)
    if order < 0 or order > 999:
        raise HTTPException(status_code=400, detail="order は 0〜999 で指定してください")
    if (file.content_type or "") != "image/png":
        raise HTTPException(status_code=400, detail="PNGのみアップロードできます")
    content = await file.read()
    if len(content) > MAX_FRAME_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    if not content.startswith(b"\x89PNG"):
        raise HTTPException(status_code=400, detail="PNGファイルではありません")
    path = _work_dir(project_id) / f"{order:03d}.png"
    path.write_bytes(content)
    return {"ok": True, "order": order}


@router.get("/subtitles.srt", response_class=PlainTextResponse)
async def export_srt(project_id: str, db: AsyncSession = Depends(get_db)):
    """発表者ノートからSRT字幕を生成する（動画ツール不要・長さは推定）。"""
    project = await _get_project(project_id, db)
    if not project.slides:
        raise HTTPException(status_code=400, detail="スライドがありません")
    srt = slides_to_srt(project.slides)
    if not srt:
        raise HTTPException(status_code=400, detail="発表者ノートが空です")
    return PlainTextResponse(srt, media_type="text/plain; charset=utf-8")


@router.post("/render")
async def render(
    project_id: str, req: RenderRequest, db: AsyncSession = Depends(get_db)
):
    """フレームPNG + VOICEVOX音声からmp4を合成する。"""
    if req.character not in SPEAKERS:
        raise HTTPException(
            status_code=400, detail=f"character は {', '.join(SPEAKERS)} のいずれか"
        )
    project = await _get_project(project_id, db)
    if not project.slides:
        raise HTTPException(status_code=400, detail="スライドがありません")

    tools = await check_tools()
    missing = [k for k, ok in tools.items() if not ok]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"必要なツールが見つかりません: {', '.join(missing)}。/video/tools で導入方法を確認してください",
        )

    try:
        result = await render_video(
            _work_dir(project_id), project.slides, SPEAKERS[req.character]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("video render failed")
        raise HTTPException(status_code=500, detail=f"動画生成に失敗しました: {e}")

    return {
        "ok": True,
        "duration": result["duration"],
        "slide_count": result["slide_count"],
        "video_url": f"/projects/{project_id}/video/file",
        "srt_url": f"/projects/{project_id}/video/file.srt",
    }


@router.get("/file")
async def video_file(project_id: str, db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, db)
    path = _work_dir(project_id) / "output.mp4"
    if not path.exists():
        raise HTTPException(status_code=404, detail="動画がまだ生成されていません")
    return FileResponse(str(path), media_type="video/mp4", filename="slides.mp4")


@router.get("/file.srt")
async def srt_file(project_id: str, db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, db)
    path = _work_dir(project_id) / "output.srt"
    if not path.exists():
        raise HTTPException(status_code=404, detail="字幕がまだ生成されていません")
    return FileResponse(str(path), media_type="text/plain", filename="slides.srt")
