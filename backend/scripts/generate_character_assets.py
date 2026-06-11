"""
Run this script locally to generate character expression PNGs.
Requires: pip install psd-tools pillow

Usage:
  python scripts/generate_character_assets.py
"""

import os
import sys
from pathlib import Path
from psd_tools import PSDImage
from PIL import Image

OUTPUT_DIR = Path(__file__).parent.parent / "static" / "characters"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PSD_PATHS = {
    "zundamon": Path(r"C:\Users\vione\Downloads\ずんだもん立ち絵素材2.3\ずんだもん立ち絵素材2.3\ずんだもん立ち絵素材2.3.psd"),
    "metan":    Path(r"C:\Users\vione\Downloads\四国めたん立ち絵素材2.1\四国めたん立ち絵素材2.1\四国めたん立ち絵素材2.1.psd"),
}

# ─── ずんだもん emotion presets ───────────────────────────────────────────────
ZUNDAMON_BASE = [
    "尻尾的なアレ",
    "*服装1/*いつもの服",
    "!枝豆/*枝豆通常",
]
_ZR = "*服装1/!右腕/*基本"
_ZL = "*服装1/!左腕/*基本"
_ZEY_NORM  = ["!目/*目セット/*普通白目",  "!目/*目セット/!黒目/*カメラ目線"]
_ZEY_WIDE  = ["!目/*目セット/*見開き白目", "!目/*目セット/!黒目/*普通目"]
_ZEY_JITO  = ["!目/*ジト目"]
_ZEY_SMILE = ["!目/*にっこり"]
_ZEY_CLOSD = ["!目/*UU"]
_ZEY_SOFT  = ["!目/*なごみ目"]
_ZEY_AWAY  = ["!目/*目セット/*普通白目", "!目/*目セット/!黒目/*目逸らし"]

ZUNDAMON_EMOTIONS = {
    "normal": ZUNDAMON_BASE + _ZEY_NORM + [
        "!眉/*普通眉", "!口/*ほあ", _ZR, _ZL,
    ],
    "happy": ZUNDAMON_BASE + _ZEY_SMILE + [
        "!眉/*普通眉", "!口/*ほあ", "!顔色/*ほっぺ赤め", _ZR, _ZL,
    ],
    "very_happy": ZUNDAMON_BASE + _ZEY_CLOSD + [
        "!眉/*普通眉", "!口/*むふ", "!顔色/*ほっぺ赤め", _ZR, _ZL,
    ],
    "surprised": ZUNDAMON_BASE + _ZEY_WIDE + [
        "!眉/*上がり眉", "!口/*ほあー", _ZR, _ZL,
    ],
    "sad": ZUNDAMON_BASE + _ZEY_SOFT + [
        "!眉/*困り眉1", "!口/*むー", "!顔色/かげり", _ZR, _ZL,
    ],
    "crying": ZUNDAMON_BASE + _ZEY_SOFT + [
        "!眉/*困り眉1", "!口/*むー", "!顔色/かげり", "記号など/涙", _ZR, _ZL,
    ],
    "angry": ZUNDAMON_BASE + _ZEY_JITO + [
        "!眉/*怒り眉", "!口/*△", _ZR, _ZL,
    ],
    "thinking": ZUNDAMON_BASE + _ZEY_AWAY + [
        "!眉/*困り眉1", "!口/*んー", _ZR, "*服装1/!左腕/*考える",
    ],
    "smug": ZUNDAMON_BASE + _ZEY_JITO + [
        "!眉/*普通眉", "!口/*むふ", _ZR, _ZL,
    ],
    "embarrassed": ZUNDAMON_BASE + _ZEY_CLOSD + [
        "!眉/*困り眉1", "!口/*むー", "!顔色/*ほっぺ赤め", _ZR, _ZL,
    ],
    "explaining": ZUNDAMON_BASE + _ZEY_NORM + [
        "!眉/*普通眉", "!口/*ほあ", "*服装1/!右腕/*指差し", _ZL,
    ],
}

# ─── 四国めたん emotion presets ────────────────────────────────────────────────
METAN_BASE = [
    "*白ロリ服/!体",
]
_MR = "*白ロリ服/!右腕/*普通"
_ML = "*白ロリ服/!左腕/*普通"
_MEY_NORM  = ["!目/*目セット/*普通白目",  "!目/*目セット/!黒目/*カメラ目線"]
_MEY_WIDE  = ["!目/*目セット/*見開き白目", "!目/*目セット/!黒目/*普通目"]
_MEY_CLOSD = ["!目/*目閉じ"]
_MEY_CLOSD2= ["!目/*目閉じ2"]

METAN_EMOTIONS = {
    "normal": METAN_BASE + _MEY_NORM + [
        "!眉/*ごきげん", "!口/*ほほえみ", _MR, _ML,
    ],
    "happy": METAN_BASE + _MEY_NORM + [
        "!眉/*ごきげん", "!口/*わあー", "!顔色/*普通", _MR, _ML,
    ],
    "very_happy": METAN_BASE + _MEY_CLOSD2 + [
        "!眉/*ごきげん", "!口/*にやり", "!顔色/*赤面", _MR, _ML,
    ],
    "surprised": METAN_BASE + _MEY_WIDE + [
        "!眉/*ごきげん", "!口/*わあー", _MR, _ML,
    ],
    "sad": METAN_BASE + _MEY_CLOSD + [
        "!眉/*こまり", "!口/*うえー", "!顔色/*普通", "記号など/涙", _MR, _ML,
    ],
    "crying": METAN_BASE + _MEY_CLOSD + [
        "!眉/*こまり", "!口/*うえー", "記号など/涙", _MR, _ML,
    ],
    "angry": METAN_BASE + _MEY_NORM + [
        "!眉/*おこ", "!口/*む", _MR, _ML,
    ],
    "thinking": METAN_BASE + _MEY_NORM + [
        "!眉/*こまり", "!口/*んー", _MR, "*白ロリ服/!左腕/*口元に指",
    ],
    "smug": METAN_BASE + _MEY_NORM + [
        "!眉/*ごきげん", "!口/*にやり", _MR, _ML,
    ],
    "embarrassed": METAN_BASE + _MEY_CLOSD2 + [
        "!眉/*こまり", "!口/*んー", "!顔色/*赤面", _MR, _ML,
    ],
    "explaining": METAN_BASE + _MEY_NORM + [
        "!眉/*ごきげん", "!口/*ほほえみ", "*白ロリ服/!右腕/*指差す", _ML,
    ],
}

ALL_EMOTIONS = {
    "zundamon": ZUNDAMON_EMOTIONS,
    "metan": METAN_EMOTIONS,
}

EMOTION_LABELS = {
    "normal":     "通常",
    "happy":      "喜び",
    "very_happy": "大喜び",
    "surprised":  "驚き",
    "sad":        "悲しみ",
    "crying":     "泣き",
    "angry":      "怒り",
    "thinking":   "考え中",
    "smug":       "ドヤ顔",
    "embarrassed":"恥ずかし",
    "explaining": "説明",
}

OUTPUT_HEIGHT = 480


def build_layer_map(psd):
    layer_map = {}
    def walk(layers, prefix=""):
        for layer in layers:
            path = f"{prefix}/{layer.name}" if prefix else layer.name
            layer_map[path] = layer
            if layer.is_group():
                walk(layer, path)
    walk(psd)
    return layer_map


def composite_expression(psd, layer_map, visible_paths):
    visible_ids = {id(layer_map[p]) for p in visible_paths if p in layer_map}
    missing = [p for p in visible_paths if p not in layer_map]
    if missing:
        print(f"    ⚠ Missing layers: {missing}")

    def layer_filter(layer):
        if layer.is_group():
            return True
        return id(layer) in visible_ids

    img = psd.composite(layer_filter=layer_filter, ignore_preview=True)
    h = OUTPUT_HEIGHT
    w = int(img.width * h / img.height)
    return img.convert("RGBA").resize((w, h), Image.LANCZOS)


def generate(char_name, psd_path, emotions):
    print(f"\n── {char_name} ──────────────────")
    if not psd_path.exists():
        print(f"  PSD not found: {psd_path}")
        return

    print(f"  Loading PSD...")
    psd = PSDImage.open(psd_path)
    layer_map = build_layer_map(psd)

    for emotion, paths in emotions.items():
        out_path = OUTPUT_DIR / f"{char_name}_{emotion}.png"
        label = EMOTION_LABELS.get(emotion, emotion)
        print(f"  {label} ({emotion})...", end=" ", flush=True)
        try:
            img = composite_expression(psd, layer_map, paths)
            img.save(out_path, optimize=True)
            print(f"OK ({img.width}x{img.height})")
        except Exception as e:
            print(f"NG {e}")

    # Save metadata JSON
    meta_path = OUTPUT_DIR / f"{char_name}_emotions.json"
    meta = {
        emotion: {
            "label": EMOTION_LABELS.get(emotion, emotion),
            "file": f"{char_name}_{emotion}.png",
        }
        for emotion in emotions
    }
    import json
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  → metadata saved: {meta_path.name}")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    for char_name, emotions in ALL_EMOTIONS.items():
        if target == "all" or target == char_name:
            generate(char_name, PSD_PATHS[char_name], emotions)
    print("\n完了!")
