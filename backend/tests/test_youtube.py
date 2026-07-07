from app.services.youtube_service import parse_json3_captions, transcript_for_prompt

VIDEO = {
    "video_id": "abc123",
    "title": "伸びる動画の作り方",
    "channel": "テストch",
    "duration": 600,
    "view_count": 100000,
    "like_count": 5000,
    "upload_date": "20260101",
    "description": "説明文",
    "chapters": [],
    "transcript_segments": [{"start": 0.0, "end": 2.0, "text": "こんにちは"}],
    "transcript_text": "こんにちは",
}

ANALYSIS = {
    "summary": "要約",
    "hook": "冒頭で問いかけ",
    "sections": [{"label": "導入", "start_sec": 0, "end_sec": 60, "share_pct": 100, "purpose": "掴み"}],
    "techniques": ["テンポの良いカット"],
    "cta": "チャンネル登録",
    "takeaways": ["冒頭3秒で結論"],
}


def test_parse_json3_captions():
    data = {"events": [
        {"tStartMs": 0, "dDurationMs": 1500, "segs": [{"utf8": "こんに"}, {"utf8": "ちは"}]},
        {"tStartMs": 2000, "segs": [{"utf8": "\n"}]},  # 空はスキップ
        {"tStartMs": 3000, "dDurationMs": 1000, "segs": [{"utf8": "次の行"}]},
    ]}
    segs = parse_json3_captions(data)
    assert segs == [
        {"start": 0.0, "end": 1.5, "text": "こんにちは"},
        {"start": 3.0, "end": 4.0, "text": "次の行"},
    ]


def test_transcript_for_prompt_truncates():
    segments = [{"start": i, "end": i + 1, "text": "あ" * 100} for i in range(200)]
    out = transcript_for_prompt(segments)
    assert len(out) < 9000
    assert "省略" in out
    assert out.startswith("[00:00]")


async def create_project(client):
    res = await client.post("/projects/", json={"title": "YT"})
    return res.json()


async def test_analyze_rejects_non_youtube_url(client):
    p = await create_project(client)
    for url in ["https://example.com/watch?v=x", "ftp://youtube.com/x", "text"]:
        res = await client.post(f"/projects/{p['id']}/youtube/analyze", json={"url": url})
        assert res.status_code == 400, url


async def test_analyze_stores_and_persists(client, monkeypatch):
    async def fake_fetch(url):
        return VIDEO

    async def fake_analyze(video):
        return ANALYSIS

    monkeypatch.setattr("app.api.youtube.fetch_youtube", fake_fetch)
    monkeypatch.setattr("app.api.youtube.analyze_youtube_structure", fake_analyze)
    p = await create_project(client)
    res = await client.post(
        f"/projects/{p['id']}/youtube/analyze",
        json={"url": "https://www.youtube.com/watch?v=abc123"},
    )
    assert res.status_code == 200
    assert res.json()["analysis"]["analysis"]["hook"] == "冒頭で問いかけ"

    res = await client.get(f"/projects/{p['id']}")
    stored = res.json()["assets"]["youtube_analyses"]
    assert stored["abc123"]["title"] == "伸びる動画の作り方"
    assert stored["abc123"]["transcript_text"] == "こんにちは"


async def test_delete_analysis(client, monkeypatch):
    async def fake_fetch(url):
        return VIDEO

    async def fake_analyze(video):
        return ANALYSIS

    monkeypatch.setattr("app.api.youtube.fetch_youtube", fake_fetch)
    monkeypatch.setattr("app.api.youtube.analyze_youtube_structure", fake_analyze)
    p = await create_project(client)
    await client.post(
        f"/projects/{p['id']}/youtube/analyze",
        json={"url": "https://youtu.be/abc123"},
    )
    res = await client.delete(f"/projects/{p['id']}/youtube/abc123")
    assert res.status_code == 200
    res = await client.delete(f"/projects/{p['id']}/youtube/abc123")
    assert res.status_code == 404


async def test_fetch_failure_returns_400(client, monkeypatch):
    async def broken_fetch(url):
        raise RuntimeError("Video unavailable")

    monkeypatch.setattr("app.api.youtube.fetch_youtube", broken_fetch)
    p = await create_project(client)
    res = await client.post(
        f"/projects/{p['id']}/youtube/analyze",
        json={"url": "https://www.youtube.com/watch?v=gone"},
    )
    assert res.status_code == 400
