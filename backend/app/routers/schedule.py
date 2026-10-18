# OWNER: Member 4 (schedule + dose status endpoints)
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models.dose_event import DoseEvent
from app.models.medication import Medication
from app.models.user import User
from app.schemas.schedule import DoseOut, DoseStatusUpdate

router = APIRouter(tags=["schedule"])


def _range(db: Session, user: User, start: datetime, end: datetime) -> list[DoseOut]:
    rows = db.execute(
        select(DoseEvent, Medication.name)
        .join(Medication, Medication.id == DoseEvent.medication_id)
        .where(DoseEvent.user_id == user.id, DoseEvent.scheduled_at >= start, DoseEvent.scheduled_at < end)
        .order_by(DoseEvent.scheduled_at)
    ).all()
    return [DoseOut(id=d.id, medication_id=d.medication_id, medication_name=n,
                    scheduled_at=d.scheduled_at, status=d.status, confirmed_at=d.confirmed_at) for d, n in rows]


def patient_zone(db: Session, user: User) -> ZoneInfo:
    """The patient's timezone, taken from their most recent medication (default Europe/London)."""
    sched = db.scalar(select(Medication.confirmed_schedule).where(Medication.user_id == user.id)
                      .order_by(Medication.created_at.desc()).limit(1))
    try:
        return ZoneInfo((sched or {}).get("timezone") or "Europe/London")
    except Exception:
        return ZoneInfo("Europe/London")


def local_midnight(zone: ZoneInfo, now: datetime | None = None, days: int = 0) -> datetime:
    """Midnight `days` from today in the patient's timezone, as an aware datetime (DST-safe)."""
    today = (now or datetime.now(timezone.utc)).astimezone(zone).date() + timedelta(days=days)
    return datetime.combine(today, datetime.min.time(), tzinfo=zone)


@router.get("/schedule/today", response_model=list[DoseOut])
def today(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    zone = patient_zone(db, user)
    return _range(db, user, local_midnight(zone), local_midnight(zone, days=1))


@router.get("/schedule/week", response_model=list[DoseOut])
def week(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Monday to Sunday of the current week, matching the frontend's weekly calendar."""
    zone = patient_zone(db, user)
    monday = -datetime.now(timezone.utc).astimezone(zone).weekday()
    return _range(db, user, local_midnight(zone, days=monday), local_midnight(zone, days=monday + 7))


@router.patch("/doses/{dose_id}/status", response_model=DoseOut)
def set_status(dose_id: uuid.UUID, body: DoseStatusUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.scalar(select(DoseEvent).where(DoseEvent.id == dose_id, DoseEvent.user_id == user.id))
    if not d:
        raise AppError("not_found", "Dose not found.", 404)
    d.status = body.status.value
    d.confirmed_at = datetime.now(timezone.utc) if body.status.value != "SCHEDULED" else None
    db.commit()
    name = db.scalar(select(Medication.name).where(Medication.id == d.medication_id))
    return DoseOut(id=d.id, medication_id=d.medication_id, medication_name=name,
                   scheduled_at=d.scheduled_at, status=d.status, confirmed_at=d.confirmed_at)
