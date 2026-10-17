# OWNER: Member 4
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models.medication import Medication
from app.models.user import User
from app.routers.schedule import _range
from app.schemas.voice import VoiceExplainIn
from app.services.elevenlabs.client import synthesize
from app.services.trials.simplify import explain_for_user

router = APIRouter(prefix="/voice", tags=["voice"])


async def _script(body: VoiceExplainIn, user: User, db: Session) -> str:
    """Scripts come only from stored, patient-confirmed data or the Gemini trial summary. No new dosing advice."""
    if body.kind == "medication":
        med = db.scalar(select(Medication).where(Medication.id == body.medication_id, Medication.user_id == user.id))
        if not med:
            raise AppError("not_found", "Medication not found.", 404)
        text = f"Your confirmed instructions for {med.name}" + (f", {med.strength}" if med.strength else "")
        text += f": {med.instructions or 'no written instructions were saved'}."
        return text + " These are your saved instructions. Contact your pharmacist if anything is unclear."
    if body.kind == "schedule":
        start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        doses = _range(db, user, start, start + timedelta(days=1))
        lines = [f"{d.scheduled_at.astimezone(ZoneInfo('Europe/London')):%H:%M}: {d.medication_name}, "
                 f"{d.status.lower()}." for d in doses]
        return "Your confirmed schedule for today. " + (" ".join(lines) if lines else "No doses are scheduled.")
    if body.kind == "trial":
        if not body.nct_id:
            raise AppError("validation_error", "nct_id is required for a trial explanation.", 422)
        explanation = await explain_for_user(db, user, body.nct_id)
        return (f"{explanation.title}. {explanation.plain_summary} "
                "This is a preliminary summary only. The study team decides who can take part.")
    raise AppError("validation_error", "kind must be medication, schedule or trial.", 422)


@router.post("/explain")
async def explain(body: VoiceExplainIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audio = await synthesize(await _script(body, user, db), body.language)
    return Response(content=audio, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})
