# OWNER: Member 3
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models.patient import PatientProfile
from app.models.user import User
from app.schemas.profile import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not p:
        raise AppError("profile_not_found", "Profile not created yet.", 404)
    return p


@router.put("", response_model=ProfileOut)
def put_profile(body: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not p:
        p = PatientProfile(user_id=user.id, **body.model_dump())
        db.add(p)
    else:
        for k, v in body.model_dump().items():
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p
