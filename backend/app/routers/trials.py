# OWNER: Member 3
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.patient import PatientProfile
from app.models.trial_bookmark import TrialBookmark
from app.models.user import User
from app.schemas.trials import BookmarkIn, Trial, TrialMatch
from app.core.errors import AppError
from app.services.trials import cache, clinicaltrials_client as ct
from app.services.trials.matching import match_trial

router = APIRouter(prefix="/trials", tags=["trials"])


@router.get("/search", response_model=list[Trial])
async def search(
    response: Response, q: str = Query(min_length=2), page_size: int = 10,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    try:
        response.headers["X-Trials-Source"] = "live"
        return await ct.search_trials(q, page_size)
    except AppError as e:
        if e.code != "clinicaltrials_unavailable":
            raise
        response.headers["X-Trials-Source"] = "cache"   # frontend must label this as cached data
        return cache.search_cached(db, q, page_size)


@router.get("/matches", response_model=list[TrialMatch])
async def matches(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not profile or not profile.conditions:
        return []
    trials = []
    for cond in profile.conditions:
        trials += await ct.search_trials(cond, 10)
    seen, out = set(), []
    for t in trials:
        if t.nct_id not in seen:
            seen.add(t.nct_id)
            out.append(match_trial(profile, t))
    return out


# NOTE: declared before "/{nct_id}" so "bookmarks" isn't captured as an id.
@router.get("/bookmarks")
def list_bookmarks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(TrialBookmark).where(TrialBookmark.user_id == user.id)).all()
    return [{"nct_id": r.nct_id, "created_at": r.created_at} for r in rows]


@router.post("/bookmarks", status_code=201)
def add_bookmark(body: BookmarkIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exists = db.scalar(select(TrialBookmark).where(TrialBookmark.user_id == user.id, TrialBookmark.nct_id == body.nct_id))
    if not exists:
        db.add(TrialBookmark(user_id=user.id, nct_id=body.nct_id))
        db.commit()
    return {"nct_id": body.nct_id}


@router.get("/{nct_id}", response_model=Trial)
async def trial_detail(nct_id: str, user: User = Depends(get_current_user)):
    return await ct.get_trial(nct_id)
