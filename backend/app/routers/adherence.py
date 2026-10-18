# OWNER: Member 4
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.dose_event import DoseEvent
from app.models.user import User
from app.routers.schedule import local_midnight, patient_zone
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
    """Last 7 days (oldest first) in the patient's timezone: doses due so far, and how many were reported
    taken or missed. Patient-reported, like the summary."""
    zone, now = patient_zone(db, user), datetime.now(timezone.utc)
    start = local_midnight(zone, now, days=-6)
    rows = db.execute(select(DoseEvent.scheduled_at, DoseEvent.status).where(
        DoseEvent.user_id == user.id, DoseEvent.scheduled_at >= start, DoseEvent.scheduled_at <= now)).all()
    days = {(start + timedelta(days=i)).date(): AdherenceDay(day=(start + timedelta(days=i)).date(), scheduled=0,
                                                             taken=0, missed=0) for i in range(7)}
    for at, status in rows:
        at = at if at.tzinfo else at.replace(tzinfo=timezone.utc)
        day = days.get(at.astimezone(zone).date())
        if day:
            day.scheduled += 1
            day.taken += status == "TAKEN"
            day.missed += status == "MISSED"
    return list(days.values())
