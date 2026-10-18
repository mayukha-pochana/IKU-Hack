# OWNER: Member 4
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models.dose_event import DoseEvent, DoseStatus
from app.models.medication import Medication
from app.models.user import User
from app.schemas.medications import MedicationCreate, MedicationOut
from app.schemas.schedule import DoseOut
from app.services.agent.facts import record_event
from app.services.scheduling.generator import generate_dose_times, schedule_kwargs

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
    for when in generate_dose_times(**schedule_kwargs(body.schedule.model_dump())):
        db.add(DoseEvent(medication_id=med.id, user_id=user.id, scheduled_at=when))
    record_event(db, user.id, "medication_confirmed",
                 f"You confirmed {body.name}" + (f" {body.strength}" if body.strength else "") + ".")
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


@router.post("/{med_id}/doses", response_model=DoseOut, status_code=201)
def log_as_needed_dose(med_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Record an as-needed dose at the moment the patient says they took it (patient-reported)."""
    med = db.scalar(select(Medication).where(Medication.id == med_id, Medication.user_id == user.id))
    if not med:
        raise AppError("not_found", "Medication not found.", 404)
    if (med.confirmed_schedule or {}).get("pattern") != "as_needed":
        raise AppError("not_as_needed", "Log scheduled doses from your schedule instead.", 409)
    now = datetime.now(timezone.utc)
    dose = DoseEvent(medication_id=med.id, user_id=user.id, scheduled_at=now, status=DoseStatus.TAKEN.value,
                     confirmed_at=now)
    db.add(dose)
    db.commit()
    return DoseOut(id=dose.id, medication_id=med.id, medication_name=med.name, scheduled_at=now,
                   status=DoseStatus.TAKEN, confirmed_at=now)


@router.post("/{med_id}/stop", response_model=MedicationOut)
def stop(med_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The patient stops (or never starts) a medicine: future scheduled doses are removed, past history is kept,
    and the trial-update agent is told."""
    med = db.scalar(select(Medication).where(Medication.id == med_id, Medication.user_id == user.id))
    if not med:
        raise AppError("not_found", "Medication not found.", 404)
    if (med.confirmed_schedule or {}).get("stopped_at"):
        return med
    now = datetime.now(timezone.utc)
    for dose in db.scalars(select(DoseEvent).where(DoseEvent.medication_id == med.id, DoseEvent.scheduled_at > now,
                                                   DoseEvent.status == DoseStatus.SCHEDULED.value)):
        db.delete(dose)
    med.confirmed_schedule = {**(med.confirmed_schedule or {}), "stopped_at": now.isoformat()}
    record_event(db, user.id, "medication_stopped", f"You stopped {med.name}.")
    db.commit()
    db.refresh(med)
    return med
