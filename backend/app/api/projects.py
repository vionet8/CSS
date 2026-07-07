from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging
import uuid
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.project import Project
from app.services.ai_service import extract_logic_structure, generate_slides_from_structure, improve_slide

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


def project_to_dict(p: Project) -> dict:
    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "raw_content": p.raw_content,
        "logic_structure": p.logic_structure,
        "slides": p.slides,
        "assets": p.assets,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


class ProjectCreate(BaseModel):
    title: str
    description: str = ""
    raw_content: str = ""


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    raw_content: Optional[str] = None
    logic_structure: Optional[dict] = None
    slides: Optional[list] = None
    assets: Optional[dict] = None


class SlideImproveRequest(BaseModel):
    slide_id: str
    instruction: str


class ProjectImport(BaseModel):
    title: str
    description: str = ""
    raw_content: str = ""
    logic_structure: Optional[dict] = None
    slides: Optional[list] = None
    assets: Optional[dict] = None


@router.get("/")
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.updated_at.desc()))
    projects = result.scalars().all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "has_structure": p.logic_structure is not None,
            "slide_count": len(p.slides) if p.slides else 0,
        }
        for p in projects
    ]


@router.post("/")
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(
        id=str(uuid.uuid4()),
        title=data.title,
        description=data.description,
        raw_content=data.raw_content,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project_to_dict(project)


@router.post("/import")
async def import_project(data: ProjectImport, db: AsyncSession = Depends(get_db)):
    """エクスポートしたJSONからプロジェクトを復元する（IDは新規発行）。"""
    project = Project(
        id=str(uuid.uuid4()),
        title=data.title,
        description=data.description,
        raw_content=data.raw_content,
        logic_structure=data.logic_structure,
        slides=data.slides,
        assets=data.assets,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project_to_dict(project)


@router.get("/{project_id}/export")
async def export_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """プロジェクト全体をJSONとしてエクスポートする。"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    data = project_to_dict(project)
    data["export_version"] = 1
    return data


@router.get("/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_to_dict(project)


@router.patch("/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(project)
    return project_to_dict(project)


@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return {"ok": True}


@router.post("/{project_id}/analyze")
async def analyze_content(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.raw_content:
        raise HTTPException(status_code=400, detail="No content to analyze")

    try:
        structure = await extract_logic_structure(project.raw_content)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("analyze failed")
        raise HTTPException(status_code=500, detail=f"構造分析に失敗しました: {e}")
    project.logic_structure = structure
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return {"logic_structure": structure}


@router.post("/{project_id}/generate-slides")
async def generate_slides(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.logic_structure:
        raise HTTPException(status_code=400, detail="Run /analyze first")

    try:
        slides = await generate_slides_from_structure(project.logic_structure)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("generate-slides failed")
        raise HTTPException(status_code=500, detail=f"スライド生成に失敗しました: {e}")
    project.slides = slides
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return {"slides": slides}


@router.post("/{project_id}/slides/improve")
async def improve_single_slide(
    project_id: str, req: SlideImproveRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project or not project.slides:
        raise HTTPException(status_code=404, detail="Project or slides not found")

    slides = list(project.slides)
    target = next((s for s in slides if s["id"] == req.slide_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Slide not found")

    try:
        improved = await improve_slide(target, req.instruction)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("improve-slide failed")
        raise HTTPException(status_code=500, detail=f"スライド改善に失敗しました: {e}")
    idx = slides.index(target)
    slides[idx] = improved
    project.slides = slides
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"slide": improved}


@router.patch("/{project_id}/slides/{slide_id}")
async def update_slide(
    project_id: str, slide_id: str, data: dict, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project or not project.slides:
        raise HTTPException(status_code=404, detail="Not found")

    # 注意: 既存 dict をその場で更新すると SQLAlchemy が変更を検知できず
    # DB に保存されないため、必ず新しい dict / list を作って代入する
    slides = list(project.slides)
    idx = next((i for i, s in enumerate(slides) if s["id"] == slide_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Slide not found")

    updated = {**slides[idx], **data, "id": slide_id}
    slides[idx] = updated
    project.slides = slides
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"slide": updated}
