from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.models.project import Project
from app.services.fprl_service import FPRL_STAGES, analyze_fprl
from app.services.marketing_service import structure_to_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/fprl", tags=["fprl"])


async def _get_project(project_id: str, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/stages")
async def fprl_stages():
    return {"stages": FPRL_STAGES}


@router.post("/analyze")
async def analyze(project_id: str, db: AsyncSession = Depends(get_db)):
    """コンテンツ（または構造）を読者の認知変化設計として審査する。"""
    project = await _get_project(project_id, db)
    if project.raw_content:
        source = project.raw_content
    elif project.logic_structure:
        source = structure_to_text(project.logic_structure)
    else:
        raise HTTPException(status_code=400, detail="分析するコンテンツがありません")

    profile = (project.assets or {}).get("marketing_profile")
    try:
        analysis = await analyze_fprl(source, profile)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("fprl analysis failed")
        raise HTTPException(status_code=500, detail=f"FPRL分析に失敗しました: {e}")

    analysis["analyzed_at"] = datetime.now(timezone.utc).isoformat()
    assets = dict(project.assets or {})
    assets["fprl_analysis"] = analysis
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"analysis": analysis}
