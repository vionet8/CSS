from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.project import Project
from app.services.marketing_service import (
    ASSET_TYPES,
    FRAMEWORKS,
    extract_marketing_structure,
    generate_marketing_asset,
    options,
    structure_to_text,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["marketing"])


class MarketingProfile(BaseModel):
    product_name: str = ""
    target_audience: str = ""
    goal: str = ""
    tone: str = ""


class MarketingAnalyzeRequest(BaseModel):
    framework: str


class AssetGenerateRequest(BaseModel):
    asset_type: str


async def _get_project(project_id: str, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _touch_assets(project: Project) -> dict:
    """assets JSON列を必ず新しいdictとして返す（in-place更新は永続化されない）。"""
    return dict(project.assets or {})


@router.get("/marketing/options")
async def marketing_options():
    return options()


@router.put("/projects/{project_id}/marketing/profile")
async def save_profile(
    project_id: str, profile: MarketingProfile, db: AsyncSession = Depends(get_db)
):
    project = await _get_project(project_id, db)
    assets = _touch_assets(project)
    assets["marketing_profile"] = profile.model_dump()
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"marketing_profile": assets["marketing_profile"]}


@router.post("/projects/{project_id}/marketing/analyze")
async def analyze_marketing(
    project_id: str, req: MarketingAnalyzeRequest, db: AsyncSession = Depends(get_db)
):
    if req.framework not in FRAMEWORKS:
        raise HTTPException(
            status_code=400,
            detail=f"framework は {', '.join(FRAMEWORKS)} のいずれかを指定してください",
        )
    project = await _get_project(project_id, db)
    if not project.raw_content:
        raise HTTPException(status_code=400, detail="No content to analyze")

    profile = (project.assets or {}).get("marketing_profile")
    try:
        structure = await extract_marketing_structure(
            project.raw_content, req.framework, profile
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("marketing analyze failed")
        raise HTTPException(status_code=500, detail=f"セールス構造分析に失敗しました: {e}")

    project.logic_structure = structure
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"logic_structure": structure}


@router.post("/projects/{project_id}/marketing/assets")
async def generate_asset(
    project_id: str, req: AssetGenerateRequest, db: AsyncSession = Depends(get_db)
):
    if req.asset_type not in ASSET_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"asset_type は {', '.join(ASSET_TYPES)} のいずれかを指定してください",
        )
    project = await _get_project(project_id, db)

    # 構造があれば構造を、なければ元コンテンツを素材にする
    if project.logic_structure:
        source = structure_to_text(project.logic_structure)
    elif project.raw_content:
        source = project.raw_content
    else:
        raise HTTPException(status_code=400, detail="コンテンツまたは構造がありません")

    profile = (project.assets or {}).get("marketing_profile")
    try:
        asset = await generate_marketing_asset(source, req.asset_type, profile)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("asset generation failed")
        raise HTTPException(status_code=500, detail=f"素材生成に失敗しました: {e}")

    assets = _touch_assets(project)
    marketing_assets = dict(assets.get("marketing_assets") or {})
    marketing_assets[req.asset_type] = asset
    assets["marketing_assets"] = marketing_assets
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"asset": asset}


@router.delete("/projects/{project_id}/marketing/assets/{asset_type}")
async def delete_asset(
    project_id: str, asset_type: str, db: AsyncSession = Depends(get_db)
):
    project = await _get_project(project_id, db)
    assets = _touch_assets(project)
    marketing_assets = dict(assets.get("marketing_assets") or {})
    if asset_type not in marketing_assets:
        raise HTTPException(status_code=404, detail="Asset not found")
    del marketing_assets[asset_type]
    assets["marketing_assets"] = marketing_assets
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
