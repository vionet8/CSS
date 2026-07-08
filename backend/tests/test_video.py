import io
from pathlib import Path

import pytest
from PIL import Image

from app.services import video_service
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
        return {"ffmpeg": False, "voicevox": False, "aquestalk": False}

    monkeypatch.setattr("app.api.video.check_tools", no_tools)
    p = await create_project(client, slides=SLIDES)
    res = await client.post(f"/projects/{p['id']}/video/render", json={"character": "zundamon"})
    assert res.status_code == 503
    assert "ffmpeg" in res.json()["detail"]


async def test_render_only_requires_relevant_engine(client, monkeypatch):
    """ffmpeg+voicevoxはあるがaquestalkが無い場合、zundamon(voicevox)は通り、reimu(aquestalk)は弾かれる。"""
    async def partial_tools():
        return {"ffmpeg": True, "voicevox": True, "aquestalk": False}

    async def fake_render(work_dir, slides, character):
        return {"video": None, "srt": None, "duration": 1.0, "slide_count": len(slides)}

    monkeypatch.setattr("app.api.video.check_tools", partial_tools)
    monkeypatch.setattr("app.api.video.render_video", fake_render)
    p = await create_project(client, slides=SLIDES)

    res = await client.post(f"/projects/{p['id']}/video/render", json={"character": "zundamon"})
    assert res.status_code == 200

    res = await client.post(f"/projects/{p['id']}/video/render", json={"character": "reimu"})
    assert res.status_code == 503
    assert "aquestalk" in res.json()["detail"]


async def test_render_success_path(client, monkeypatch, tmp_path):
    async def ok_tools():
        return {"ffmpeg": True, "voicevox": True, "aquestalk": True}

    async def fake_render(work_dir, slides, character):
        assert character == "metan"
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
    assert set(body["characters"]) == {"zundamon", "metan", "reimu", "marisa"}
    assert "ffmpeg" in body
    assert "aquestalk" in body


# ---- 音声エンジンの振り分け ----


async def test_synthesize_dispatches_by_character(monkeypatch):
    calls = []

    async def fake_vv(text, voice):
        calls.append(("voicevox", voice))
        return b"v"

    async def fake_aq(text, voice):
        calls.append(("aquestalk", voice))
        return b"a"

    monkeypatch.setattr(video_service, "_synthesize_voicevox", fake_vv)
    monkeypatch.setattr(video_service, "_synthesize_aquestalk", fake_aq)

    assert await video_service.synthesize("こんにちは", "zundamon") == b"v"
    assert calls[-1] == ("voicevox", 3)

    assert await video_service.synthesize("ゆっくりしていってね", "reimu") == b"a"
    assert calls[-1] == ("aquestalk", "れいむ")

    assert await video_service.synthesize("霊夢", "marisa") == b"a"
    assert calls[-1] == ("aquestalk", "まりさ")


async def test_synthesize_unknown_character_raises():
    with pytest.raises(ValueError):
        await video_service.synthesize("text", "unknown")


def test_aquestalk_available(monkeypatch, tmp_path):
    monkeypatch.setattr(video_service.settings, "AQUESTALK_PLAYER_PATH", "")
    assert video_service.aquestalk_available() is False

    exe = tmp_path / "AquesTalkPlayer.exe"
    exe.write_bytes(b"x")
    monkeypatch.setattr(video_service.settings, "AQUESTALK_PLAYER_PATH", str(exe))
    assert video_service.aquestalk_available() is True

    monkeypatch.setattr(video_service.settings, "AQUESTALK_PLAYER_PATH", str(tmp_path / "missing.exe"))
    assert video_service.aquestalk_available() is False


async def test_synthesize_aquestalk_requires_configured_path(monkeypatch):
    monkeypatch.setattr(video_service.settings, "AQUESTALK_PLAYER_PATH", "")
    with pytest.raises(RuntimeError, match="AQUESTALK_PLAYER_PATH"):
        await video_service._synthesize_aquestalk("text", "れいむ")


async def test_synthesize_aquestalk_invokes_player_with_preset(monkeypatch):
    monkeypatch.setattr(video_service.settings, "AQUESTALK_PLAYER_PATH", "/fake/AquesTalkPlayer.exe")
    captured = {}

    class FakeProc:
        returncode = 0

        async def communicate(self):
            return b"", b""

    async def fake_exec(*args, **kwargs):
        captured["args"] = args
        out_path = Path(args[args.index("/W") + 1])
        out_path.write_bytes(b"RIFFDATA")
        return FakeProc()

    monkeypatch.setattr(video_service.asyncio, "create_subprocess_exec", fake_exec)
    data = await video_service._synthesize_aquestalk("ゆっくりしていってね", "れいむ")
    assert data == b"RIFFDATA"
    assert "/P" in captured["args"]
    assert "れいむ" in captured["args"]
    assert "/T" in captured["args"]


async def test_synthesize_aquestalk_raises_on_failure(monkeypatch):
    monkeypatch.setattr(video_service.settings, "AQUESTALK_PLAYER_PATH", "/fake/AquesTalkPlayer.exe")

    class FakeProc:
        returncode = 1

        async def communicate(self):
            return b"", b"error occurred"

    async def fake_exec(*args, **kwargs):
        return FakeProc()

    monkeypatch.setattr(video_service.asyncio, "create_subprocess_exec", fake_exec)
    with pytest.raises(RuntimeError, match="AquesTalkPlayer"):
        await video_service._synthesize_aquestalk("text", "まりさ")
