import io
from PIL import Image

from app.services.video_service import _fmt_ts, estimate_duration, slides_to_srt

SLIDES = [
    {"id": "s1", "order": 1, "title": "T1", "speaker_notes": "こんにちは、ずんだもんなのだ。"},
    {"id": "s2", "order": 2, "title": "T2", "speaker_notes": "次のスライドの説明です。"},
    {"id": "s3", "order": 3, "title": "", "speaker_notes": ""},  # 完全に空 → スキップ
]


def make_png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 36), (10, 20, 30)).save(buf, format="PNG")
    return buf.getvalue()


async def create_project(client, **kwargs):
    res = await client.post("/projects/", json={"title": "動画", **kwargs})
    p = res.json()
    if kwargs.get("slides") is not None:
        await client.patch(f"/projects/{p['id']}", json={"slides": kwargs["slides"]})
    return p


# ---- SRT ----


def test_fmt_ts():
    assert _fmt_ts(0) == "00:00:00,000"
    assert _fmt_ts(61.5) == "00:01:01,500"
    assert _fmt_ts(3600) == "01:00:00,000"


def test_slides_to_srt_estimates_and_skips_empty():
    srt = slides_to_srt(SLIDES)
    assert "1\n00:00:00,000 --> " in srt
    assert "こんにちは、ずんだもんなのだ。" in srt
    assert srt.count("-->") == 2  # 空スライドはスキップ


def test_slides_to_srt_uses_real_durations():
    srt = slides_to_srt(SLIDES[:1], {"s1": 5.0})
    assert "00:00:00,000 --> 00:00:05,000" in srt


def test_estimate_duration_minimum():
    assert estimate_duration("短い") == 2.0


# ---- API ----


async def test_srt_endpoint(client):
    p = await create_project(client, slides=SLIDES)
    res = await client.get(f"/projects/{p['id']}/video/subtitles.srt")
    assert res.status_code == 200
    assert "ずんだもん" in res.text

    empty = await create_project(client)
    res = await client.get(f"/projects/{empty['id']}/video/subtitles.srt")
    assert res.status_code == 400


async def test_frame_upload_validation(client):
    p = await create_project(client)
    pid = p["id"]

    res = await client.post(
        f"/projects/{pid}/video/frames",
        data={"order": 1},
        files={"file": ("f.png", make_png(), "image/png")},
    )
    assert res.status_code == 200

    res = await client.post(
        f"/projects/{pid}/video/frames",
        data={"order": 2},
        files={"file": ("f.jpg", b"xx", "image/jpeg")},
    )
    assert res.status_code == 400

    res = await client.post(
        f"/projects/{pid}/video/frames",
        data={"order": 3},
        files={"file": ("f.png", b"not png", "image/png")},
    )
    assert res.status_code == 400


async def test_render_reports_missing_tools(client, monkeypatch):
    async def no_tools():
        return {"ffmpeg": False, "voicevox": False}

    monkeypatch.setattr("app.api.video.check_tools", no_tools)
    p = await create_project(client, slides=SLIDES)
    res = await client.post(f"/projects/{p['id']}/video/render", json={"character": "zundamon"})
    assert res.status_code == 503
    assert "ffmpeg" in res.json()["detail"]


async def test_render_success_path(client, monkeypatch, tmp_path):
    async def ok_tools():
        return {"ffmpeg": True, "voicevox": True}

    async def fake_render(work_dir, slides, speaker_id):
        assert speaker_id == 2  # metan
        return {"video": tmp_path / "o.mp4", "srt": tmp_path / "o.srt",
                "duration": 12.3, "slide_count": len(slides)}

    monkeypatch.setattr("app.api.video.check_tools", ok_tools)
    monkeypatch.setattr("app.api.video.render_video", fake_render)
    p = await create_project(client, slides=SLIDES)
    res = await client.post(f"/projects/{p['id']}/video/render", json={"character": "metan"})
    assert res.status_code == 200
    body = res.json()
    assert body["duration"] == 12.3
    assert body["video_url"].endswith("/video/file")

    res = await client.post(f"/projects/{p['id']}/video/render", json={"character": "dog"})
    assert res.status_code == 400


async def test_video_file_404_before_render(client):
    p = await create_project(client)
    res = await client.get(f"/projects/{p['id']}/video/file")
    assert res.status_code == 404


async def test_tools_endpoint(client):
    res = await client.get("/projects/x/video/tools")
    assert res.status_code == 200
    body = res.json()
    assert set(body["speakers"]) == {"zundamon", "metan"}
    assert "ffmpeg" in body
