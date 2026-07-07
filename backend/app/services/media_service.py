"""動画・音声の取り込み: カット、音声抽出、Whisper文字起こし。

FFmpeg はローカルツール、Whisper は faster-whisper（任意依存）を使う。
どちらも無ければ tools エンドポイントで導入方法を案内する。
"""
import asyncio
import importlib.util
import shutil
from pathlib import Path

from app.core.config import settings
from app.services.image_service import safe_filename
from app.services.video_service import _fmt_ts, _run_ffmpeg

ALLOWED_MEDIA_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".mp3", ".wav", ".m4a", ".aac"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}


def media_dir() -> Path:
    d = Path(settings.UPLOAD_DIR) / "media"
    d.mkdir(parents=True, exist_ok=True)
    return d


def media_path(filename: str) -> Path:
    safe_filename(filename)
    return media_dir() / filename


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def whisper_available() -> bool:
    return importlib.util.find_spec("faster_whisper") is not None


async def cut_media(filename: str, start: float, end: float) -> dict:
    """前後カット（再エンコード無しのストリームコピー）。"""
    if start < 0 or end <= start:
        raise ValueError("start >= 0 かつ end > start で指定してください")
    src = media_path(filename)
    out_name = f"{src.stem}_cut_{int(start * 1000)}_{int(end * 1000)}{src.suffix}"
    out = media_path(out_name)
    await _run_ffmpeg("-ss", str(start), "-to", str(end), "-i", str(src), "-c", "copy", str(out))
    return {"filename": out_name, "start": start, "end": end}


async def extract_audio(filename: str) -> dict:
    """音声をWhisper向けWAV（16kHzモノラル）で抽出する。"""
    src = media_path(filename)
    out_name = f"{src.stem}_audio.wav"
    out = media_path(out_name)
    await _run_ffmpeg("-i", str(src), "-vn", "-ac", "1", "-ar", "16000", str(out))
    return {"filename": out_name}


def _transcribe_sync(path: Path, language: str, model_size: str) -> dict:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments_iter, info = model.transcribe(str(path), language=language or None)
    segments = [
        {"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
        for s in segments_iter
    ]
    text = "\n".join(s["text"] for s in segments)
    srt = "\n".join(
        f"{i + 1}\n{_fmt_ts(s['start'])} --> {_fmt_ts(s['end'])}\n{s['text']}\n"
        for i, s in enumerate(segments)
    )
    return {
        "text": text,
        "segments": segments,
        "srt": srt,
        "language": info.language,
        "duration": round(info.duration, 2),
    }


async def transcribe_media(filename: str, language: str = "ja", model_size: str = "small") -> dict:
    """faster-whisper で文字起こしする（動画はそのままデコードされる）。"""
    if not whisper_available():
        raise RuntimeError("faster-whisper がインストールされていません")
    path = media_path(filename)
    # モデル読み込み+推論はブロッキングなのでスレッドに逃がす
    return await asyncio.to_thread(_transcribe_sync, path, language, model_size)
