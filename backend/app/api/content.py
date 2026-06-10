from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from app.services.content_service import fetch_url_content, parse_markdown, extract_pdf_text

router = APIRouter(prefix="/content", tags=["content"])


class URLFetchRequest(BaseModel):
    url: str


class MarkdownParseRequest(BaseModel):
    text: str


@router.post("/fetch-url")
async def fetch_url(req: URLFetchRequest):
    try:
        result = await fetch_url_content(req.url)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/parse-markdown")
async def parse_md(req: MarkdownParseRequest):
    text = await parse_markdown(req.text)
    return {"text": text}


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF only")
    content = await file.read()
    text = await extract_pdf_text(content)
    return {"text": text, "filename": file.filename}
