# OWNER: Member 4
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models.dose_event import DoseEvent
from app.models.medication import Medication
from app.models.user import User
from app.schemas.medications import MedicationCreate, MedicationOut
from app.services.scheduling.generator import generate_dose_times

router = APIRouter(prefix="/medications", tags=["medications"])


@router.post("", response_model=MedicationOut, status_code=201)
def create(body: MedicationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Called only after explicit patient confirmation."""
    med = Medication(
        user_id=user.id, name=body.name, strength=body.strength, instructions=body.instructions,
        frequency=body.frequency, confirmed_schedule=body.schedule.model_dump(),
    )
    db.add(med)
    db.flush()
    for when in generate_dose_times(body.schedule.times, body.schedule.duration_days, body.schedule.timezone):
        db.add(DoseEvent(medication_id=med.id, user_id=user.id, scheduled_at=when))
    db.commit()
    db.refresh(med)
    return med


@router.get("", response_model=list[MedicationOut])
def list_meds(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Medication).where(Medication.user_id == user.id)).all()


@router.get("/{med_id}", response_model=MedicationOut)
def get_med(med_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    med = db.scalar(select(Medication).where(Medication.id == med_id, Medication.user_id == user.id))
    if not med:
        raise AppError("not_found", "Medication not found.", 404)
    return med
