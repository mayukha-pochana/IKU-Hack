# OWNER: Member 4
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.health_checkin import HealthCheckin
from app.models.user import User
from app.schemas.biometrics import CheckinCreate, CheckinOut

router = APIRouter(prefix="/health-checkins", tags=["biometrics"])


@router.post("", response_model=CheckinOut, status_code=201)
def create(body: CheckinCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = HealthCheckin(
        user_id=user.id, heart_rate=body.heart_rate, breathing_rate=body.breathing_rate,
        symptom_report=body.symptom_report, measurement_source=body.measurement_source,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("", response_model=list[CheckinOut])
def list_checkins(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(HealthCheckin).where(HealthCheckin.user_id == user.id).order_by(HealthCheckin.recorded_at.desc()).limit(50)
    ).all()
