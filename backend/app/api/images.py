from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import uuid
from app.services.image_service import save_image, resize_image, crop_image, split_image, get_upload_path

router = APIRouter(prefix="/images", tags=["images"])


class ResizeRequest(BaseModel):
    filename: str
    width: int
    height: int


class CropRequest(BaseModel):
    filename: str
    x: int
    y: int
    width: int
    height: int


class SplitRequest(BaseModel):
    filename: str
    count: int


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    content = await file.read()
    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    info = await save_image(content, filename)
    return info


@router.get("/file/{filename}")
async def get_image(filename: str):
    path = get_upload_path("images", filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(path))


@router.post("/resize")
async def resize(req: ResizeRequest):
    return await resize_image(req.filename, req.width, req.height)


@router.post("/crop")
async def crop(req: CropRequest):
    return await crop_image(req.filename, req.x, req.y, req.width, req.height)


@router.post("/split")
async def split(req: SplitRequest):
    if req.count not in [2, 3, 4, 6, 9]:
        raise HTTPException(status_code=400, detail="count must be 2, 3, 4, 6, or 9")
    return await split_image(req.filename, req.count)
