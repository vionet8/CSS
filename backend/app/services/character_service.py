import json
from pathlib import Path

STATIC_DIR = Path(__file__).parent.parent.parent / "static" / "characters"

CHARACTERS = ["zundamon", "metan"]

CHARACTER_LABELS = {
    "zundamon": "ずんだもん",
    "metan": "四国めたん",
}

EMOTION_LABELS = {
    "normal":      "通常",
    "happy":       "喜び",
    "very_happy":  "大喜び",
    "surprised":   "驚き",
    "sad":         "悲しみ",
    "crying":      "泣き",
    "angry":       "怒り",
    "thinking":    "考え中",
    "smug":        "ドヤ顔",
    "embarrassed": "恥ずかし",
    "explaining":  "説明",
}

# Maps slide content tone to emotion
TONE_TO_EMOTION = {
    "positive":   "happy",
    "exciting":   "very_happy",
    "warning":    "surprised",
    "problem":    "sad",
    "critical":   "angry",
    "thinking":   "thinking",
    "conclusion": "smug",
    "title":      "normal",
    "explain":    "explaining",
    "default":    "normal",
}


def get_character_metadata(character: str) -> dict | None:
    meta_path = STATIC_DIR / f"{character}_emotions.json"
    if not meta_path.exists():
        return None
    return json.loads(meta_path.read_text(encoding="utf-8"))


def list_characters() -> list[dict]:
    result = []
    for char in CHARACTERS:
        meta = get_character_metadata(char)
        if meta:
            result.append({
                "id": char,
                "label": CHARACTER_LABELS.get(char, char),
                "emotions": list(meta.keys()),
            })
    return result


def emotion_for_tone(tone: str) -> str:
    return TONE_TO_EMOTION.get(tone, "normal")
