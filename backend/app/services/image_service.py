from PIL import Image
import io
import os
from pathlib import Path
from app.core.config import settings


def get_upload_path(subdir: str, filename: str) -> Path:
    base = Path(settings.UPLOAD_DIR) / subdir
    base.mkdir(parents=True, exist_ok=True)
    return base / filename


async def save_image(file_bytes: bytes, filename: str) -> dict:
    path = get_upload_path("images", filename)
    path.write_bytes(file_bytes)

    img = Image.open(io.BytesIO(file_bytes))
    return {
        "filename": filename,
        "path": str(path),
        "width": img.width,
        "height": img.height,
        "format": img.format or "unknown",
        "size": len(file_bytes),
    }


async def resize_image(filename: str, width: int, height: int) -> dict:
    path = get_upload_path("images", filename)
    img = Image.open(path)
    resized = img.resize((width, height), Image.LANCZOS)

    stem = Path(filename).stem
    ext = Path(filename).suffix
    out_name = f"{stem}_resized_{width}x{height}{ext}"
    out_path = get_upload_path("images", out_name)
    resized.save(out_path)

    return {"filename": out_name, "width": width, "height": height}


async def crop_image(filename: str, x: int, y: int, w: int, h: int) -> dict:
    path = get_upload_path("images", filename)
    img = Image.open(path)
    cropped = img.crop((x, y, x + w, y + h))

    stem = Path(filename).stem
    ext = Path(filename).suffix
    out_name = f"{stem}_crop_{x}_{y}_{w}_{h}{ext}"
    out_path = get_upload_path("images", out_name)
    cropped.save(out_path)

    return {"filename": out_name, "width": w, "height": h}


SPLIT_PATTERNS = {
    2: [(2, 1)],   # 横2分割
    3: [(3, 1)],   # 横3分割
    4: [(2, 2)],   # 2x2
    6: [(3, 2)],   # 3x2
    9: [(3, 3)],   # 3x3
}


async def split_image(filename: str, count: int) -> list[dict]:
    if count not in SPLIT_PATTERNS:
        raise ValueError(f"Unsupported split count: {count}")

    path = get_upload_path("images", filename)
    img = Image.open(path)
    cols, rows = SPLIT_PATTERNS[count][0]

    tile_w = img.width // cols
    tile_h = img.height // rows
    stem = Path(filename).stem
    ext = Path(filename).suffix

    results = []
    for row in range(rows):
        for col in range(cols):
            x = col * tile_w
            y = row * tile_h
            tile = img.crop((x, y, x + tile_w, y + tile_h))
            idx = row * cols + col + 1
            out_name = f"{stem}_split{count}_{idx:02d}{ext}"
            out_path = get_upload_path("images", out_name)
            tile.save(out_path)
            results.append({"filename": out_name, "index": idx, "col": col, "row": row})

    return results
