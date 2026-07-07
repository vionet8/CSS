from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.models.project import Project
from app.services.youtube_service import analyze_youtube_structure, fetch_youtube

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/youtube", tags=["youtube"])

MAX_ANALYSES = 20


class AnalyzeRequest(BaseModel):
    url: str


async def _get_project(project_id: str, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/analyze")
async def analyze_video(
    project_id: str, req: AnalyzeRequest, db: AsyncSession = Depends(get_db)
):
    """YouTube動画の構成を分析してプロジェクトに保存する。"""
    url = req.url.strip()
    if not url.startswith(("http://", "https://")) or (
        "youtube.com" not in url and "youtu.be" not in url
    ):
        raise HTTPException(status_code=400, detail="YouTubeのURLを指定してください")

    project = await _get_project(project_id, db)

    try:
        video = await fetch_youtube(url)
    except Exception as e:
        logger.exception("youtube fetch failed")
        raise HTTPException(status_code=400, detail=f"動画情報の取得に失敗しました: {e}")

    try:
        analysis = await analyze_youtube_structure(video)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("youtube analysis failed")
        raise HTTPException(status_code=500, detail=f"構成分析に失敗しました: {e}")

    entry = {
        "video_id": video["video_id"],
        "url": url,
        "title": video["title"],
        "channel": video["channel"],
        "duration": video["duration"],
        "view_count": video["view_count"],
        "like_count": video["like_count"],
        "upload_date": video["upload_date"],
        "transcript_text": video["transcript_text"],
        "analysis": analysis,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }

    assets = dict(project.assets or {})
    analyses = dict(assets.get("youtube_analyses") or {})
    analyses[video["video_id"]] = entry
    if len(analyses) > MAX_ANALYSES:
        raise HTTPException(status_code=400, detail=f"分析の保存上限（{MAX_ANALYSES}件）を超えます")
    assets["youtube_analyses"] = analyses
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"analysis": entry}


@router.delete("/{video_id}")
async def delete_analysis(
    project_id: str, video_id: str, db: AsyncSession = Depends(get_db)
):
    project = await _get_project(project_id, db)
    assets = dict(project.assets or {})
    analyses = dict(assets.get("youtube_analyses") or {})
    if video_id not in analyses:
        raise HTTPException(status_code=404, detail="Analysis not found")
    del analyses[video_id]
    assets["youtube_analyses"] = analyses
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
