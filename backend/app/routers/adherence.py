# OWNER: Member 4
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.dose_event import DoseEvent
from app.models.user import User
from app.schemas.adherence import AdherenceDay, AdherenceSummary

router = APIRouter(prefix="/adherence", tags=["adherence"])


@router.get("/summary", response_model=AdherenceSummary)
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    rows = dict(db.execute(
        select(DoseEvent.status, func.count()).where(DoseEvent.user_id == user.id, DoseEvent.scheduled_at <= now)
        .group_by(DoseEvent.status)
    ).all())
    taken, missed, skipped = rows.get("TAKEN", 0), rows.get("MISSED", 0), rows.get("SKIPPED", 0)
    total = sum(rows.values())
    pct = round(100 * taken / total, 1) if total else None
    return AdherenceSummary(scheduled_doses=total, reported_taken=taken, reported_missed=missed,
                            reported_skipped=skipped, reported_adherence_percentage=pct)


@router.get("/history", response_model=list[AdherenceDay])
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """TODO(M4): 7-day per-day counts. Use time_bucket() when Timescale is enabled, date_trunc otherwise."""
    return []
