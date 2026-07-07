async def upload(client, name="clip.mp4", data=b"\x00" * 100, mime="video/mp4"):
    return await client.post("/media/upload", files={"file": (name, data, mime)})


async def test_upload_and_list(client):
    res = await upload(client)
    assert res.status_code == 200
    info = res.json()
    assert info["filename"].endswith(".mp4")
    assert info["size"] == 100

    res = await client.get("/media/")
    assert any(f["filename"] == info["filename"] for f in res.json())

    res = await client.get(f"/media/file/{info['filename']}")
    assert res.status_code == 200


async def test_upload_rejects_unknown_extension(client):
    res = await upload(client, name="run.exe")
    assert res.status_code == 400


async def test_file_path_traversal_rejected(client):
    res = await client.get("/media/file/..%2Fsecret.mp4")
    assert res.status_code in (400, 404)
    res = await client.post("/media/cut", json={"filename": "../x.mp4", "start": 0, "end": 1})
    assert res.status_code == 400


async def test_cut_validation_and_missing_ffmpeg(client, monkeypatch):
    info = (await upload(client)).json()

    monkeypatch.setattr("app.api.media.ffmpeg_available", lambda: False)
    res = await client.post("/media/cut", json={"filename": info["filename"], "start": 0, "end": 5})
    assert res.status_code == 503

    monkeypatch.setattr("app.api.media.ffmpeg_available", lambda: True)

    async def fake_cut(filename, start, end):
        return {"filename": "cut.mp4", "start": start, "end": end}

    monkeypatch.setattr("app.api.media.cut_media", fake_cut)
    res = await client.post("/media/cut", json={"filename": info["filename"], "start": 1, "end": 5})
    assert res.status_code == 200
    assert res.json()["filename"] == "cut.mp4"


async def test_cut_rejects_bad_range(client, monkeypatch):
    info = (await upload(client)).json()
    monkeypatch.setattr("app.api.media.ffmpeg_available", lambda: True)
    res = await client.post("/media/cut", json={"filename": info["filename"], "start": 5, "end": 2})
    assert res.status_code == 400


async def test_transcribe_missing_whisper(client, monkeypatch):
    info = (await upload(client)).json()
    monkeypatch.setattr("app.api.media.whisper_available", lambda: False)
    res = await client.post("/media/transcribe", json={"filename": info["filename"]})
    assert res.status_code == 503
    assert "faster-whisper" in res.json()["detail"]


async def test_transcribe_success(client, monkeypatch):
    info = (await upload(client)).json()
    monkeypatch.setattr("app.api.media.whisper_available", lambda: True)

    async def fake_transcribe(filename, language="ja", model_size="small"):
        return {
            "text": "こんにちは\n動画の内容です",
            "segments": [{"start": 0.0, "end": 2.0, "text": "こんにちは"}],
            "srt": "1\n00:00:00,000 --> 00:00:02,000\nこんにちは\n",
            "language": "ja",
            "duration": 2.0,
        }

    monkeypatch.setattr("app.api.media.transcribe_media", fake_transcribe)
    res = await client.post(
        "/media/transcribe", json={"filename": info["filename"], "model_size": "small"}
    )
    assert res.status_code == 200
    assert "こんにちは" in res.json()["text"]

    res = await client.post(
        "/media/transcribe", json={"filename": info["filename"], "model_size": "huge"}
    )
    assert res.status_code == 400


async def test_media_tools(client):
    res = await client.get("/media/tools")
    assert res.status_code == 200
    assert "ffmpeg" in res.json() and "whisper" in res.json()
