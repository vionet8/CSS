from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.project import Project
from app.services.lp_service import render_lp_html
from app.services.marketing_service import (
    ASSET_TYPES,
    FRAMEWORKS,
    audit_profile_from_content,
    decompose_material,
    extract_marketing_structure,
    generate_marketing_asset,
    options,
    structure_to_text,
)

# 保存できる素材断片の上限
MAX_STORED_FRAGMENTS = 200

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


class MaterialImportRequest(BaseModel):
    text: str
    source_name: str = ""


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


@router.post("/projects/{project_id}/marketing/profile/audit")
async def audit_profile(project_id: str, db: AsyncSession = Depends(get_db)):
    """LP・素材テキストからターゲット設計を抽出して審査する。

    読み取れた項目は品質評価つきで返し、読み取れない項目は
    ユーザーへの確認質問として返す（プロファイルへの反映はUI側で確認後に行う）。
    """
    project = await _get_project(project_id, db)
    if not project.raw_content:
        raise HTTPException(
            status_code=400,
            detail="審査する素材がありません。コンテンツ入力タブにLPや素材を貼り付けて保存してください",
        )
    current_profile = (project.assets or {}).get("marketing_profile")
    try:
        audit = await audit_profile_from_content(project.raw_content, current_profile)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("profile audit failed")
        raise HTTPException(status_code=500, detail=f"プロファイル審査に失敗しました: {e}")

    assets = _touch_assets(project)
    assets["profile_audit"] = audit
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"audit": audit}


@router.post("/projects/{project_id}/marketing/materials")
async def import_material(
    project_id: str, req: MaterialImportRequest, db: AsyncSession = Depends(get_db)
):
    """外部AI（ChatGPT等）で作った素材を断片に分解して蓄積する。

    蓄積された断片は、以降のセールス構造分析・販促素材生成の
    プロンプトに自動的に散りばめられる。
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="素材テキストが空です")
    try:
        new_fragments = await decompose_material(req.text, req.source_name)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("material decompose failed")
        raise HTTPException(status_code=500, detail=f"素材の分解に失敗しました: {e}")

    project = await _get_project(project_id, db)
    assets = _touch_assets(project)
    fragments = list(assets.get("material_fragments") or [])
    fragments.extend(new_fragments)
    if len(fragments) > MAX_STORED_FRAGMENTS:
        raise HTTPException(
            status_code=400,
            detail=f"断片の保存上限（{MAX_STORED_FRAGMENTS}件）を超えます。不要な断片を削除してください",
        )
    assets["material_fragments"] = fragments
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"fragments": new_fragments, "total": len(fragments)}


@router.delete("/projects/{project_id}/marketing/materials/{fragment_id}")
async def delete_material_fragment(
    project_id: str, fragment_id: str, db: AsyncSession = Depends(get_db)
):
    project = await _get_project(project_id, db)
    assets = _touch_assets(project)
    fragments = list(assets.get("material_fragments") or [])
    remaining = [f for f in fragments if f.get("id") != fragment_id]
    if len(remaining) == len(fragments):
        raise HTTPException(status_code=404, detail="Fragment not found")
    assets["material_fragments"] = remaining
    project.assets = assets
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True, "total": len(remaining)}


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

    project_assets = project.assets or {}
    profile = project_assets.get("marketing_profile")
    fragments = project_assets.get("material_fragments")
    try:
        structure = await extract_marketing_structure(
            project.raw_content, req.framework, profile, fragments
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

    project_assets = project.assets or {}
    profile = project_assets.get("marketing_profile")
    fragments = project_assets.get("material_fragments")
    try:
        asset = await generate_marketing_asset(source, req.asset_type, profile, fragments)
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


@router.get("/projects/{project_id}/marketing/lp.html", response_class=HTMLResponse)
async def export_lp_html(
    project_id: str,
    cta_url: str = "#",
    accent: str = "#6366f1",
    db: AsyncSession = Depends(get_db),
):
    """生成済みのLPコピーから、そのまま公開できる一枚HTMLのLPを書き出す。"""
    project = await _get_project(project_id, db)
    lp_asset = ((project.assets or {}).get("marketing_assets") or {}).get("lp_copy")
    if not lp_asset:
        raise HTTPException(
            status_code=400, detail="先に販促素材の「LPコピー」を生成してください"
        )
    profile = (project.assets or {}).get("marketing_profile")
    try:
        html_text = render_lp_html(lp_asset, profile, cta_url=cta_url, accent=accent)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return HTMLResponse(html_text)


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
