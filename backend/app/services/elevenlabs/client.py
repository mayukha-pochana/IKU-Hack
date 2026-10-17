# OWNER: Member 4
from app.core.config import settings
from app.core.errors import AppError


async def synthesize(text: str, language: str = "en") -> bytes:
    """TODO(M4): POST to the ElevenLabs text-to-speech endpoint with httpx using
    settings.elevenlabs_api_key / elevenlabs_voice_id; return MP3 bytes.
    Pick a multilingual model for a second language if feasible."""
    if not settings.elevenlabs_api_key:
        raise AppError("elevenlabs_not_configured", "Set ELEVENLABS_API_KEY.", 503)
    raise NotImplementedError
