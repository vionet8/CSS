from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from app.services.content_service import fetch_url_content, parse_markdown, extract_pdf_text

router = APIRouter(prefix="/content", tags=["content"])

MAX_PDF_BYTES = 50 * 1024 * 1024  # 50MB


class URLFetchRequest(BaseModel):
    url: str


class MarkdownParseRequest(BaseModel):
    text: str


@router.post("/fetch-url")
async def fetch_url(req: URLFetchRequest):
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URLは http:// または https:// で始めてください")
    try:
        result = await fetch_url_content(url)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URLの取得に失敗しました: {e}")


@router.post("/parse-markdown")
async def parse_md(req: MarkdownParseRequest):
    text = await parse_markdown(req.text)
    return {"text": text}


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF only")
    content = await file.read()
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")
    try:
        text = await extract_pdf_text(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDFの解析に失敗しました: {e}")
    return {"text": text, "filename": filename}
