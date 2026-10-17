# OWNER: Member 4 (schedule + dose status endpoints)
import uuid
from datetime import datetime, timedelta, timezone
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


@router.get("/schedule/today", response_model=list[DoseOut])
def today(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # TODO(M4): use the patient's timezone rather than UTC day boundaries.
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return _range(db, user, start, start + timedelta(days=1))


@router.get("/schedule/week", response_model=list[DoseOut])
def week(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return _range(db, user, start, start + timedelta(days=7))


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
