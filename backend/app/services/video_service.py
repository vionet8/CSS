"""スライド→動画パイプライン。

発表者ノート → VOICEVOX音声 → スライドPNG + FFmpeg合成 → mp4 + SRT字幕。
FFmpeg / VOICEVOX はユーザー環境のローカルツールを使うため、
実行前に check_tools() で利用可否を検出し、無ければ導入方法を案内する。
"""
import asyncio
import shutil
import wave
from pathlib import Path

import httpx

from app.core.config import settings

# VOICEVOX の話者ID（ノーマルスタイル）
SPEAKERS = {"zundamon": 3, "metan": 2}

# 字幕の長さ推定: 日本語読み上げ ≒ 7文字/秒
CHARS_PER_SEC = 7.0
MIN_SLIDE_SEC = 2.0


async def check_tools() -> dict:
    ffmpeg = shutil.which("ffmpeg") is not None
    voicevox = False
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{settings.VOICEVOX_URL}/version")
            voicevox = r.status_code == 200
    except Exception:
        pass
    return {"ffmpeg": ffmpeg, "voicevox": voicevox}


async def synthesize(text: str, speaker_id: int) -> bytes:
    """VOICEVOX で音声合成して WAV バイト列を返す。"""
    async with httpx.AsyncClient(timeout=120) as client:
        q = await client.post(
            f"{settings.VOICEVOX_URL}/audio_query",
            params={"text": text, "speaker": speaker_id},
        )
        q.raise_for_status()
        r = await client.post(
            f"{settings.VOICEVOX_URL}/synthesis",
            params={"speaker": speaker_id},
            json=q.json(),
        )
        r.raise_for_status()
        return r.content


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate()


def slide_narration(slide: dict) -> str:
    return (slide.get("speaker_notes") or slide.get("body") or slide.get("title") or "").strip()


def _fmt_ts(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, rem = divmod(ms, 3600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def estimate_duration(text: str) -> float:
    return max(MIN_SLIDE_SEC, len(text) / CHARS_PER_SEC)


def slides_to_srt(slides: list[dict], durations: dict[str, float] | None = None) -> str:
    """発表者ノートからSRT字幕を組み立てる。

    durations: slide id → 秒。無い場合は文字数から推定する。
    """
    entries = []
    t = 0.0
    idx = 1
    for slide in sorted(slides, key=lambda s: s.get("order", 0)):
        text = slide_narration(slide)
        if not text:
            continue
        dur = (durations or {}).get(slide.get("id", "")) or estimate_duration(text)
        entries.append(f"{idx}\n{_fmt_ts(t)} --> {_fmt_ts(t + dur)}\n{text}\n")
        t += dur
        idx += 1
    return "\n".join(entries)


async def _run_ffmpeg(*args: str):
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-loglevel", "error", *args,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg失敗: {stderr.decode(errors='replace')[:500]}")


async def render_video(work_dir: Path, slides: list[dict], speaker_id: int) -> dict:
    """フレームPNG + VOICEVOX音声から mp4 と SRT を生成する。

    work_dir には {order:03d}.png が事前アップロードされていること。
    戻り値: {"video": Path, "srt": Path, "duration": 秒, "slide_count": n}
    """
    ordered = sorted(slides, key=lambda s: s.get("order", 0))
    segments = []
    durations: dict[str, float] = {}

    for slide in ordered:
        order = slide.get("order", 0)
        frame = work_dir / f"{order:03d}.png"
        if not frame.exists():
            raise ValueError(f"スライド{order}のフレーム画像がありません。先にPNGをアップロードしてください")
        text = slide_narration(slide)
        seg = work_dir / f"seg_{order:03d}.mp4"

        if text:
            wav = work_dir / f"voice_{order:03d}.wav"
            wav.write_bytes(await synthesize(text, speaker_id))
            durations[slide.get("id", "")] = wav_duration(wav)
            await _run_ffmpeg(
                "-loop", "1", "-i", str(frame), "-i", str(wav),
                "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
                "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                "-c:a", "aac", "-shortest", str(seg),
            )
        else:
            durations[slide.get("id", "")] = MIN_SLIDE_SEC
            await _run_ffmpeg(
                "-loop", "1", "-t", str(MIN_SLIDE_SEC), "-i", str(frame),
                "-f", "lavfi", "-t", str(MIN_SLIDE_SEC), "-i", "anullsrc=r=24000:cl=mono",
                "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
                "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                "-c:a", "aac", "-shortest", str(seg),
            )
        segments.append(seg)

    concat_list = work_dir / "concat.txt"
    concat_list.write_text(
        "\n".join(f"file '{s.name}'" for s in segments), encoding="utf-8"
    )
    out = work_dir / "output.mp4"
    await _run_ffmpeg(
        "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(out)
    )

    srt_path = work_dir / "output.srt"
    srt_path.write_text(slides_to_srt(ordered, durations), encoding="utf-8")
    return {
        "video": out,
        "srt": srt_path,
        "duration": round(sum(durations.values()), 2),
        "slide_count": len(ordered),
    }
