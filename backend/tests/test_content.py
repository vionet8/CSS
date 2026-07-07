async def test_parse_markdown(client):
    res = await client.post("/content/parse-markdown", json={"text": "# 見出し\n\n- 項目1\n- 項目2"})
    assert res.status_code == 200
    text = res.json()["text"]
    assert "見出し" in text
    assert "#" not in text


async def test_fetch_url_rejects_invalid_scheme(client):
    for url in ["ftp://example.com", "file:///etc/passwd", "javascript:alert(1)", "not-a-url"]:
        res = await client.post("/content/fetch-url", json={"url": url})
        assert res.status_code == 400, url


async def test_upload_pdf_rejects_non_pdf(client):
    res = await client.post("/content/upload-pdf", files={"file": ("doc.txt", b"hello", "text/plain")})
    assert res.status_code == 400


async def test_upload_pdf_accepts_uppercase_extension(client):
    # 拡張子チェックが大文字小文字を区別しないこと（中身が不正なので400だがPDF onlyではない）
    res = await client.post("/content/upload-pdf", files={"file": ("DOC.PDF", b"broken", "application/pdf")})
    assert res.status_code == 400
    assert res.json()["detail"] != "PDF only"
