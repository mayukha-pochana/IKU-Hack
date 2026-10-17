# OWNER: Member 4
import re

import httpx

from app.core.config import settings
from app.core.errors import AppError


async def synthesize(text: str, language: str = "en") -> bytes:
    """Return MP3 bytes for text. The multilingual model detects the language from the text itself."""
    voice = settings.elevenlabs_voice_id
    if not settings.elevenlabs_api_key or not re.fullmatch(r"[A-Za-z0-9_-]+", voice):
        raise AppError("elevenlabs_not_configured", "Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.", 503)
    try:
        async with httpx.AsyncClient(timeout=45) as c:
            r = await c.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
                             params={"output_format": "mp3_44100_128"},
                             headers={"xi-api-key": settings.elevenlabs_api_key},
                             json={"text": text, "model_id": settings.elevenlabs_model_id})
            r.raise_for_status()
            if not r.headers.get("content-type", "").startswith("audio/") or not r.content:
                raise ValueError("No audio returned")
            return r.content
    except httpx.TimeoutException:
        raise AppError("elevenlabs_timeout", "Voice generation timed out; please retry.", 504)
    except (httpx.HTTPError, ValueError) as e:
        raise AppError("elevenlabs_unavailable", "Voice generation failed.", 502, {"reason": type(e).__name__})
