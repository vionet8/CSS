import httpx
import wave
from pathlib import Path
from app.core.config import settings

# Speaker ID mapping: character -> emotion -> VOICEVOX speaker_id
_SPEAKER_IDS: dict[str, dict[str, int]] = {
    "zundamon": {
        "normal": 3,
        "happy": 1,
        "very_happy": 1,
        "surprised": 3,
        "sad": 5,
        "crying": 5,
        "angry": 7,
        "thinking": 3,
        "smug": 3,
        "embarrassed": 3,
        "explaining": 3,
    },
    "metan": {
        "normal": 2,
        "happy": 0,
        "very_happy": 0,
        "surprised": 2,
        "sad": 6,
        "crying": 6,
        "angry": 4,
        "thinking": 2,
        "smug": 2,
        "embarrassed": 2,
        "explaining": 2,
    },
}
_DEFAULT_SPEAKER = 3


def _speaker_id(character: str, emotion: str) -> int:
    return _SPEAKER_IDS.get(character, {}).get(emotion, _DEFAULT_SPEAKER)


async def check_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            res = await client.get(f"{settings.VOICEVOX_URL}/version")
            return res.status_code == 200
    except Exception:
        return False


async def synthesize(text: str, character: str = "zundamon", emotion: str = "normal") -> bytes:
    """Returns raw WAV bytes. Raises on failure."""
    speaker_id = _speaker_id(character, emotion)
    async with httpx.AsyncClient(timeout=60) as client:
        q_res = await client.post(
            f"{settings.VOICEVOX_URL}/audio_query",
            params={"text": text, "speaker": speaker_id},
        )
        q_res.raise_for_status()
        query = q_res.json()
        query["speedScale"] = 1.1

        s_res = await client.post(
            f"{settings.VOICEVOX_URL}/synthesis",
            params={"speaker": speaker_id},
            json=query,
        )
        s_res.raise_for_status()
        return s_res.content


async def generate_audio(
    text: str,
    character: str = "zundamon",
    emotion: str = "normal",
    output_path: Path = None,
) -> bool:
    try:
        data = await synthesize(text, character, emotion)
        output_path.write_bytes(data)
        return True
    except Exception:
        return False


def get_wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "r") as w:
            return w.getnframes() / w.getframerate()
    except Exception:
        return 5.0
