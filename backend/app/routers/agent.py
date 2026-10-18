# OWNER: Member 4 - adaptive screening agent endpoints.
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.agent import AgentEvent, TrialConclusion
from app.models.user import User
from app.schemas.trials import TrialUpdate
from app.services.agent.corrections import CorrectionFact, parse_correction
from app.services.agent.engine import process, update_for, watched
from app.services.agent.facts import effective_record, record_event

router = APIRouter(prefix="/agent", tags=["agent"])


class CorrectionIn(BaseModel):
    """Either free text ("I stopped insulin last year") or a one-tap fix option's facts, sent as-is."""
    text: Annotated[str, Field(min_length=2, max_length=1000)] | None = None
    facts: list[CorrectionFact] | None = Field(default=None, max_length=10)
    label: Annotated[str, Field(max_length=200)] | None = None   # the fix option's label, for the timeline

    @model_validator(mode="after")
    def _one_of(self):
        if not self.text and not self.facts:
            raise ValueError("Send text or facts.")
        return self


class UpdateItem(TrialUpdate):
    nct_id: str
    title: str


class UpdatesOut(BaseModel):
    new_count: int                  # "1 trial changed" on the dashboard
    updates: list[UpdateItem]       # newest change first; is_new marks unseen ones
    handled_events: list["EventOut"]


class SeenIn(BaseModel):
    nct_ids: list[str] | None = None    # omit to mark everything seen


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: str
    summary: str
    created_at: datetime
    processed_at: datetime | None
    changes: list[dict]


class ConclusionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    nct_id: str
    title: str
    status: str
    previous_status: str | None
    reason: str
    provisional: bool
    updated_at: datetime | None


class AgentState(BaseModel):
    conclusions: list[ConclusionOut]
    conflicts: list[dict]          # where sources disagreed and which one the agent used
    handled_events: list[EventOut]
    disclaimer: str = "Preliminary screening only. Eligibility is decided by the study team."


async def _state(db: Session, user: User) -> AgentState:
    handled = await process(db, user.id)
    _, conflicts, _ = effective_record(db, user.id)
    rows = db.scalars(select(TrialConclusion).where(TrialConclusion.user_id == user.id)
                      .order_by(TrialConclusion.updated_at.desc())).all()
    return AgentState(conclusions=[ConclusionOut.model_validate(r) for r in rows], conflicts=conflicts,
                      handled_events=[EventOut.model_validate(e) for e in handled])


@router.get("/conclusions", response_model=AgentState)
async def conclusions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Current conclusion per watched trial, after handling any new events."""
    return await _state(db, user)


@router.post("/corrections", response_model=AgentState)
async def correct(body: CorrectionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """'That's wrong': record the patient's correction, then re-screen whatever depended on the old assumption."""
    if body.facts:       # one tap: already structured, no Gemini needed
        facts = [f.model_dump() for f in body.facts]
        summary = f"You told us: {body.label or ', '.join(f['value'] for f in facts)}"
    else:
        facts, understood = await parse_correction(body.text)
        summary = f'You told us: "{body.text[:200]}"' + ("" if understood else " (kept as a note for the study team)")
    record_event(db, user.id, "correction", summary, {"text": body.text, "facts": facts})
    db.commit()
    return await _state(db, user)


@router.post("/refresh", response_model=AgentState)
async def refresh(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Re-check watched trials against the live registry (recruiting status and criteria can change)."""
    record_event(db, user.id, "registry_refresh", "Checked ClinicalTrials.gov for updates to your watched trials.")
    db.commit()
    return await _state(db, user)


@router.get("/timeline", response_model=list[EventOut])
async def timeline(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Everything that happened and what each event changed, newest first."""
    await process(db, user.id)
    return db.scalars(select(AgentEvent).where(AgentEvent.user_id == user.id)
                      .order_by(AgentEvent.created_at.desc()).limit(50)).all()


@router.get("/updates", response_model=UpdatesOut)
async def updates(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """For the dashboard notice and the check-in confirmation: handles new events, then lists trial updates."""
    handled = await process(db, user.id)
    record, _, _ = effective_record(db, user.id)
    items = [UpdateItem(nct_id=r.nct_id, title=r.title, **update_for(r, record).model_dump())
             for r in watched(db, user.id).values() if r.changed_at is not None]
    items.sort(key=lambda u: u.changed_at, reverse=True)
    return UpdatesOut(new_count=sum(u.is_new for u in items), updates=items,
                      handled_events=[EventOut.model_validate(e) for e in handled])


@router.post("/updates/seen", status_code=204)
def mark_seen(body: SeenIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Call when the patient views a changed trial (or dismisses the notice)."""
    now = datetime.now(timezone.utc)
    for row in watched(db, user.id).values():
        if body.nct_ids is None or row.nct_id in body.nct_ids:
            row.seen_at = now
    db.commit()
