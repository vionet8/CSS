import asyncio
import shutil
import textwrap
import uuid
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
VIDEOS_DIR = UPLOADS_DIR / "videos"
AUDIO_DIR = UPLOADS_DIR / "audio"
TEMP_DIR = UPLOADS_DIR / "temp"

for _d in [VIDEOS_DIR, AUDIO_DIR, TEMP_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

_FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/opentype/unifont/unifont_jp.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
_FONT_PATH: Optional[str] = next((p for p in _FONT_CANDIDATES if Path(p).exists()), None)


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if _FONT_PATH:
        try:
            return ImageFont.truetype(_FONT_PATH, size)
        except Exception:
            pass
    return ImageFont.load_default(size=size)


def _hex_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    try:
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except Exception:
        return (99, 102, 241)


def _lighten(rgb: tuple, f: float = 0.5) -> tuple:
    return tuple(int(c + (255 - c) * f) for c in rgb)


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font, x: int, y: int,
               max_width: int, line_height: int, fill, max_lines: int = 999) -> int:
    lines = []
    for para in text.split("\n"):
        if not para.strip():
            lines.append("")
            continue
        wrapped = textwrap.wrap(para, width=max(1, max_width // (font.size // 2 + 1)))
        lines.extend(wrapped or [""])
    for i, line in enumerate(lines[:max_lines]):
        if not line:
            y += line_height // 2
            continue
        draw.text((x, y), line, font=font, fill=fill)
        y += line_height
    return y


def render_slide_image(slide: dict, size: tuple = (1280, 720)) -> Image.Image:
    W, H = size
    bg = (15, 23, 42)
    img = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(img)

    accent_hex = slide.get("accent_color", "#6366f1")
    accent = _hex_rgb(accent_hex)
    light = _lighten(accent, 0.6)

    # Subtle accent tint in top-right corner
    overlay = Image.new("RGB", size, accent)
    img = Image.blend(img, overlay, alpha=0.04)
    draw = ImageDraw.Draw(img)

    # Left accent bar
    draw.rectangle([0, 0, 8, H], fill=accent)

    phase = slide.get("phase", "jo")
    title = slide.get("title", "")
    subtitle = slide.get("subtitle", "")
    body = slide.get("body", "")
    items = slide.get("items") or []

    PAD = max(48, W // 24)

    if phase == "jo" or slide.get("type") in ("title",):
        # Hero: large centered title
        f_title = _font(max(48, W // 20))
        f_sub = _font(max(24, W // 42))

        lines = textwrap.wrap(title, width=22) or [""]
        lh = max(56, W // 18)
        total_h = len(lines) * lh
        y = (H - total_h) // 2 - lh // 2
        for line in lines:
            bb = draw.textbbox((0, 0), line, font=f_title)
            tw = bb[2] - bb[0]
            draw.text(((W - tw) // 2, y), line, font=f_title, fill=(255, 255, 255))
            y += lh

        if subtitle:
            bb = draw.textbbox((0, 0), subtitle, font=f_sub)
            sw = bb[2] - bb[0]
            draw.text(((W - sw) // 2, y + 20), subtitle, font=f_sub, fill=light)

        # Accent rule under title
        ry = H * 11 // 16
        draw.rectangle([W // 4, ry, W * 3 // 4, ry + 3], fill=accent)

    else:
        # Content slide
        f_title = _font(max(36, W // 28))
        f_sub = _font(max(20, W // 56))
        f_body = _font(max(22, W // 46))
        f_badge = _font(max(18, W // 64))

        # Phase badge
        phase_label = {"jo": "序", "ha": "破", "kyu": "急"}.get(phase, phase)
        draw.text((PAD, 36), phase_label, font=f_badge, fill=accent)

        if subtitle:
            draw.text((PAD, 36 + f_badge.size + 6), subtitle, font=f_sub, fill=light)

        # Title
        title_y = 36 + f_badge.size + (f_sub.size + 12 if subtitle else 0) + 16
        for line in (textwrap.wrap(title, width=30) or [""]):
            draw.text((PAD, title_y), line, font=f_title, fill=(255, 255, 255))
            title_y += f_title.size + 8

        # Divider
        div_y = title_y + 16
        draw.rectangle([PAD, div_y, PAD + 64, div_y + 3], fill=accent)
        content_y = div_y + 24

        if items:
            # Grid items
            n = min(len(items), 6)
            cols = 3 if n >= 3 else n
            rows = (n + cols - 1) // cols
            cell_w = (W - PAD * 2 - 16 * (cols - 1)) // cols
            cell_h = min(160, (H - content_y - PAD) // rows)
            f_it = _font(max(18, W // 58))
            f_ib = _font(max(15, W // 72))

            for i, item in enumerate(items[:n]):
                col = i % cols
                row = i // cols
                cx = PAD + col * (cell_w + 16)
                cy = content_y + row * (cell_h + 12)
                draw.rectangle([cx, cy, cx + cell_w, cy + cell_h - 4],
                                fill=(30, 41, 59), outline=(*accent, 80), width=1)
                draw.text((cx + 12, cy + 10), item.get("title", ""), font=f_it, fill=(255, 255, 255))
                blines = textwrap.wrap(item.get("body", ""), width=max(1, cell_w // (f_ib.size // 2)))
                by = cy + 10 + f_it.size + 8
                for bl in blines[:3]:
                    draw.text((cx + 12, by), bl, font=f_ib, fill=(180, 195, 210))
                    by += f_ib.size + 4
        elif body:
            # Body text
            _wrap_text(draw, body, f_body, PAD, content_y,
                       max_width=W - PAD * 2, line_height=f_body.size + 10,
                       fill=(200, 210, 225), max_lines=12)

    return img


async def _run_ffmpeg(*args) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    return proc.returncode, stderr.decode(errors="replace")


async def create_slide_clip(
    slide: dict,
    index: int,
    audio_path: Optional[Path],
    temp_dir: Path,
    default_duration: float,
    resolution: tuple,
) -> Path:
    img = render_slide_image(slide, size=resolution)
    img_path = temp_dir / f"slide_{index:04d}.png"
    img.save(str(img_path))

    clip_path = temp_dir / f"clip_{index:04d}.mp4"
    W, H = resolution

    if audio_path and audio_path.exists():
        from app.services.voicevox_service import get_wav_duration
        dur = max(get_wav_duration(audio_path) + 0.5, default_duration)
        code, err = await _run_ffmpeg(
            "-loop", "1", "-i", str(img_path),
            "-i", str(audio_path),
            "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-t", str(dur),
            "-pix_fmt", "yuv420p",
            "-vf", f"scale={W}:{H}",
            str(clip_path),
        )
    else:
        code, err = await _run_ffmpeg(
            "-loop", "1", "-i", str(img_path),
            "-c:v", "libx264",
            "-t", str(default_duration),
            "-pix_fmt", "yuv420p",
            "-vf", f"scale={W}:{H}",
            str(clip_path),
        )

    if code != 0:
        raise RuntimeError(f"FFmpeg slide {index} error: {err[-500:]}")
    return clip_path


async def concat_clips(clip_paths: list[Path], output_path: Path) -> None:
    list_file = output_path.parent / f"_concat_{uuid.uuid4().hex}.txt"
    list_file.write_text("\n".join(f"file '{p.absolute()}'" for p in clip_paths))
    code, err = await _run_ffmpeg(
        "-f", "concat", "-safe", "0",
        "-i", str(list_file),
        "-c", "copy",
        str(output_path),
    )
    list_file.unlink(missing_ok=True)
    if code != 0:
        raise RuntimeError(f"FFmpeg concat error: {err[-500:]}")


async def trim_video(filename: str, start: float, end: float) -> str:
    src = VIDEOS_DIR / filename
    if not src.exists():
        raise FileNotFoundError(f"Video not found: {filename}")
    out = f"{uuid.uuid4().hex}_trimmed.mp4"
    code, err = await _run_ffmpeg(
        "-ss", str(start), "-i", str(src),
        "-t", str(end - start),
        "-c", "copy",
        str(VIDEOS_DIR / out),
    )
    if code != 0:
        raise RuntimeError(f"Trim error: {err[-500:]}")
    return out


async def concat_videos(filenames: list[str]) -> str:
    paths = []
    for fn in filenames:
        p = VIDEOS_DIR / fn
        if not p.exists():
            raise FileNotFoundError(f"Video not found: {fn}")
        paths.append(p)
    out = f"{uuid.uuid4().hex}_concat.mp4"
    await concat_clips(paths, VIDEOS_DIR / out)
    return out


async def add_audio(video_filename: str, audio_filename: str) -> str:
    vp = VIDEOS_DIR / video_filename
    ap = AUDIO_DIR / audio_filename
    if not vp.exists():
        raise FileNotFoundError(f"Video not found: {video_filename}")
    if not ap.exists():
        raise FileNotFoundError(f"Audio not found: {audio_filename}")
    out = f"{uuid.uuid4().hex}_with_audio.mp4"
    code, err = await _run_ffmpeg(
        "-i", str(vp), "-i", str(ap),
        "-c:v", "copy", "-c:a", "aac",
        "-map", "0:v:0", "-map", "1:a:0",
        "-shortest",
        str(VIDEOS_DIR / out),
    )
    if code != 0:
        raise RuntimeError(f"Add audio error: {err[-500:]}")
    return out
