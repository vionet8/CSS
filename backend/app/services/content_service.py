import httpx
from bs4 import BeautifulSoup
import markdown
import re


async def fetch_url_content(url: str) -> dict:
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    title = ""
    if soup.title:
        title = soup.title.string or ""

    # OGP title優先
    og_title = soup.find("meta", property="og:title")
    if og_title:
        title = og_title.get("content", title)

    # 本文抽出: article > main > body順
    body_tag = soup.find("article") or soup.find("main") or soup.body
    if body_tag:
        for tag in body_tag(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()
        text = body_tag.get_text(separator="\n", strip=True)
    else:
        text = soup.get_text(separator="\n", strip=True)

    # 空行を圧縮
    text = re.sub(r"\n{3,}", "\n\n", text)

    return {"title": title.strip(), "content": text.strip(), "url": url}


async def parse_markdown(text: str) -> str:
    html = markdown.markdown(text)
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text(separator="\n", strip=True)


async def extract_pdf_text(file_bytes: bytes) -> str:
    import io
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    texts = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            texts.append(t)
    return "\n\n".join(texts)
