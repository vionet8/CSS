from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from pathlib import Path
import uuid
from app.services.image_service import (
    ALLOWED_IMAGE_EXTENSIONS,
    save_image,
    resize_image,
    crop_image,
    split_image,
    get_upload_path,
)

router = APIRouter(prefix="/images", tags=["images"])

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB
MAX_DIMENSION = 8192


class ResizeRequest(BaseModel):
    filename: str
    width: int = Field(gt=0, le=MAX_DIMENSION)
    height: int = Field(gt=0, le=MAX_DIMENSION)


class CropRequest(BaseModel):
    filename: str
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0, le=MAX_DIMENSION)
    height: int = Field(gt=0, le=MAX_DIMENSION)


class SplitRequest(BaseModel):
    filename: str
    count: int


def _validated_path(filename: str) -> Path:
    try:
        path = get_upload_path("images", filename)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return path


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 20MB)")
    filename = f"{uuid.uuid4()}{ext}"
    try:
        info = await save_image(content, filename)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")
    return info


@router.get("/file/{filename}")
async def get_image(filename: str):
    path = _validated_path(filename)
    return FileResponse(str(path))


@router.post("/resize")
async def resize(req: ResizeRequest):
    _validated_path(req.filename)
    return await resize_image(req.filename, req.width, req.height)


@router.post("/crop")
async def crop(req: CropRequest):
    _validated_path(req.filename)
    return await crop_image(req.filename, req.x, req.y, req.width, req.height)


@router.post("/split")
async def split(req: SplitRequest):
    if req.count not in [2, 3, 4, 6, 9]:
        raise HTTPException(status_code=400, detail="count must be 2, 3, 4, 6, or 9")
    _validated_path(req.filename)
    return await split_image(req.filename, req.count)
