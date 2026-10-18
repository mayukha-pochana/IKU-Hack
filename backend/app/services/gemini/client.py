# OWNER: Member 4 - thin Gemini REST adapter. Raises AppError if unconfigured (no silent fake output).
import asyncio
import base64
import re

import httpx

from app.core.config import settings
from app.core.errors import AppError

BASE = "https://generativelanguage.googleapis.com/v1beta/models"
RETRY_STATUSES = {429, 500, 502, 503, 504}   # rate limit / overload: transient, worth one retry
RETRY_DELAY_SECONDS = 1.5


def require_configured():
    if not settings.gemini_api_key or not re.fullmatch(r"[A-Za-z0-9._-]+", settings.gemini_model):
        raise AppError("gemini_not_configured", "Set GEMINI_API_KEY and GEMINI_MODEL.", 503)


def gemini_schema(schema: dict) -> dict:
    """Inline $defs and drop maxItems, which Gemini rejects (HTTP 400); Pydantic still enforces limits."""
    defs = schema.get("$defs", {})

    def expand(node):
        if isinstance(node, dict):
            if "$ref" in node:
                return expand(defs[node["$ref"].rsplit("/", 1)[-1]])
            return {k: expand(v) for k, v in node.items() if k not in {"$defs", "maxItems"}}
        if isinstance(node, list):
            return [expand(item) for item in node]
        return node
    return expand(schema)


async def _generate(parts: list[dict], schema: dict | None = None) -> str:
    require_configured()
    config = {"responseMimeType": "application/json", "responseJsonSchema": gemini_schema(schema)} if schema else {}
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            for attempt in range(2):
                r = await c.post(f"{BASE}/{settings.gemini_model}:generateContent",
                                 headers={"x-goog-api-key": settings.gemini_api_key},
                                 json={"contents": [{"parts": parts}], "generationConfig": config})
                if r.status_code not in RETRY_STATUSES or attempt:
                    break
                await asyncio.sleep(RETRY_DELAY_SECONDS)
            r.raise_for_status()
            candidate = r.json()["candidates"][0]
            if candidate.get("finishReason") != "STOP":
                raise ValueError(f"finishReason={candidate.get('finishReason')}")
            # Skip thought parts so only the answer is returned.
            return "".join(p.get("text", "") for p in candidate["content"]["parts"] if not p.get("thought"))
    except httpx.TimeoutException:
        raise AppError("gemini_timeout", "Gemini timed out; please retry.", 504)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as e:
        # Never echo the response body: it can contain the prompt (patient data).
        raise AppError("gemini_unavailable", "Gemini could not complete the request.", 502, {"reason": type(e).__name__})


async def generate_json_from_image(prompt: str, image: bytes, mime: str, schema: dict | None = None) -> str:
    return await _generate([{"text": prompt}, {"inlineData": {"mimeType": mime, "data": base64.b64encode(image).decode()}}],
                           schema)


async def generate_json_from_images(prompt: str, images: list[tuple[bytes, str]], schema: dict | None = None) -> str:
    """Several photos of the same object (e.g. the sides of a bottle label) in one request."""
    parts = [{"text": prompt}] + [{"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode()}}
                                  for data, mime in images]
    return await _generate(parts, schema)


async def generate_json(prompt: str, schema: dict) -> str:
    return await _generate([{"text": prompt}], schema)


async def generate_text(prompt: str) -> str:
    return await _generate([{"text": prompt}])
