"""YouTube人気動画分析（Phase 4）。

yt-dlp でメタデータと字幕を取得し（動画本体はダウンロードしない）、
AIで構成・時間配分・フック・CTAを分析する。
"""
import asyncio
import json

import httpx

from app.services.ai_service import _call_claude, _parse_ai_json

MAX_TRANSCRIPT_CHARS = 8000


def _pick_caption_url(info: dict) -> str | None:
    """日本語優先で json3 形式の字幕トラックURLを選ぶ（手動字幕→自動字幕）。"""
    for source in [info.get("subtitles") or {}, info.get("automatic_captions") or {}]:
        for lang in ["ja", "ja-orig", "en"]:
            for track in source.get(lang) or []:
                if track.get("ext") == "json3" and track.get("url"):
                    return track["url"]
    return None


def parse_json3_captions(data: dict) -> list[dict]:
    """YouTube json3 字幕をセグメント配列に変換する。"""
    segments = []
    for ev in data.get("events") or []:
        text = "".join(seg.get("utf8", "") for seg in ev.get("segs") or []).strip()
        if not text or text == "\n":
            continue
        start = (ev.get("tStartMs") or 0) / 1000
        dur = (ev.get("dDurationMs") or 0) / 1000
        segments.append({"start": round(start, 2), "end": round(start + dur, 2), "text": text})
    return segments


def transcript_for_prompt(segments: list[dict]) -> str:
    """タイムスタンプ付き文字起こしをプロンプト用に整形・切り詰める。"""
    lines = []
    total = 0
    for s in segments:
        m, sec = divmod(int(s["start"]), 60)
        line = f"[{m:02d}:{sec:02d}] {s['text']}"
        total += len(line) + 1
        if total > MAX_TRANSCRIPT_CHARS:
            lines.append("…（以降省略）")
            break
        lines.append(line)
    return "\n".join(lines)


def _extract_sync(url: str) -> dict:
    import yt_dlp

    opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


async def fetch_youtube(url: str) -> dict:
    """メタデータ+字幕を取得する（動画はダウンロードしない）。"""
    info = await asyncio.to_thread(_extract_sync, url)

    segments: list[dict] = []
    caption_url = _pick_caption_url(info)
    if caption_url:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(caption_url)
                r.raise_for_status()
                segments = parse_json3_captions(r.json())
        except Exception:
            segments = []

    return {
        "video_id": info.get("id", ""),
        "title": info.get("title", ""),
        "channel": info.get("channel") or info.get("uploader", ""),
        "duration": info.get("duration") or 0,
        "view_count": info.get("view_count") or 0,
        "like_count": info.get("like_count") or 0,
        "upload_date": info.get("upload_date", ""),
        "description": (info.get("description") or "")[:1000],
        "chapters": [
            {"title": c.get("title", ""), "start": c.get("start_time", 0)}
            for c in info.get("chapters") or []
        ],
        "transcript_segments": segments,
        "transcript_text": "\n".join(s["text"] for s in segments),
    }


async def analyze_youtube_structure(video: dict) -> dict:
    """取得済みのメタデータ+字幕から構成を分析する。"""
    chapters = "\n".join(f"- {c['start']}秒: {c['title']}" for c in video.get("chapters") or [])
    chapters_block = f"チャプター:\n{chapters}" if chapters else ""
    transcript = transcript_for_prompt(video.get("transcript_segments") or [])
    if not transcript and not video.get("description"):
        raise ValueError("字幕・説明文が取得できず、分析できません")

    prompt = f"""あなたは動画マーケティングの分析者です。以下のYouTube動画の構成を分析してください。

タイトル: {video.get('title')}
チャンネル: {video.get('channel')} / 再生数: {video.get('view_count')} / 長さ: {video.get('duration')}秒
{chapters_block}
説明文（冒頭）: {video.get('description', '')[:500]}

字幕（タイムスタンプ付き）:
{transcript}

以下のJSON形式で出力してください（コードブロックなし、JSONのみ）:
{{
  "summary": "動画の要約（2〜3文）",
  "hook": "冒頭のフック手法の分析（最初の30秒で何をしているか）",
  "sections": [
    {{"label": "セクション名", "start_sec": 0, "end_sec": 60, "share_pct": 10, "purpose": "このセクションの役割"}}
  ],
  "techniques": ["視聴維持・訴求のテクニック（具体的に）"],
  "cta": "CTA（視聴者への行動喚起）の分析。無ければ「なし」",
  "takeaways": ["自分のコンテンツに転用できる学び（具体的に3〜5個）"]
}}

ルール:
- sections は動画全体をカバーし、share_pct の合計を100にする
- start_sec/end_sec は字幕のタイムスタンプやチャプターから推定する"""

    raw = await _call_claude(prompt)
    result = _parse_ai_json(raw, r"\{[\s\S]*\}", "youtube-analysis")
    if not isinstance(result, dict) or not isinstance(result.get("sections"), list):
        raise ValueError("AI応答が想定形式（分析JSON）ではありません")
    return result
