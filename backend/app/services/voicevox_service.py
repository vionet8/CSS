import httpx
import wave
from pathlib import Path

VOICEVOX_URL = "http://localhost:50021"

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


async def check_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            res = await client.get(f"{VOICEVOX_URL}/version")
            return res.status_code == 200
    except Exception:
        return False


async def generate_audio(
    text: str,
    character: str = "zundamon",
    emotion: str = "normal",
    output_path: Path = None,
) -> bool:
    speaker_id = _SPEAKER_IDS.get(character, {}).get(emotion, _DEFAULT_SPEAKER)
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.post(
                f"{VOICEVOX_URL}/audio_query",
                params={"text": text, "speaker": speaker_id},
            )
            if res.status_code != 200:
                return False
            query = res.json()
            query["speedScale"] = 1.1

            res2 = await client.post(
                f"{VOICEVOX_URL}/synthesis",
                params={"speaker": speaker_id},
                json=query,
            )
            if res2.status_code != 200:
                return False

            output_path.write_bytes(res2.content)
            return True
    except Exception:
        return False


def get_wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "r") as w:
            return w.getnframes() / w.getframerate()
    except Exception:
        return 5.0
