# OWNER: Member 4 - thin Gemini adapter. Raises AppError if unconfigured (no silent fake output).
from app.core.config import settings
from app.core.errors import AppError


def require_configured():
    if not settings.gemini_api_key or not settings.gemini_model:
        raise AppError("gemini_not_configured", "Set GEMINI_API_KEY and GEMINI_MODEL.", 503)


async def generate_json_from_image(prompt: str, image: bytes, mime: str) -> str:
    """TODO(M4): call Gemini (google-genai SDK) with the image + prompt, request JSON output,
    return the raw JSON string. Verify the model name is currently available."""
    require_configured()
    raise NotImplementedError


async def generate_text(prompt: str) -> str:
    require_configured()
    raise NotImplementedError
