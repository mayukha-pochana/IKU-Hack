# OWNER: Member 4
from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.voice import VoiceExplainIn
from app.services.elevenlabs.client import synthesize

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/explain")
async def explain(body: VoiceExplainIn, user: User = Depends(get_current_user)):
    """TODO(M4): build the script from USER-CONFIRMED stored data only (medication / schedule / trial
    summary). Never generate new dosing advice. Returns audio/mpeg."""
    script = "TODO: build script from stored, confirmed data"
    audio = await synthesize(script, body.language)
    return Response(content=audio, media_type="audio/mpeg")
