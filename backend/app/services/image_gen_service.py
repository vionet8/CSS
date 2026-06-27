import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


async def generate_image(prompt: str) -> str | None:
    """Generate an image via DALL-E 3. Returns a data-URL or None if unavailable."""
    if not settings.OPENAI_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "dall-e-3",
                    "prompt": prompt,
                    "n": 1,
                    "size": "1024x576",
                    "response_format": "url",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["data"][0]["url"]
    except Exception as exc:
        logger.warning("Image generation failed: %s", exc)
        return None
