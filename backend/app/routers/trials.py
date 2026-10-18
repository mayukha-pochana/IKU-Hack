# OWNER: Member 3
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.patient import PatientProfile
from app.models.trial_bookmark import TrialBookmark
from app.models.user import User
from app.models.medication import Medication
from app.schemas.trials import BookmarkIn, MatchStatus, Trial, TrialExplanation, TrialMatch
from app.core.errors import AppError
from app.services.trials import cache, clinicaltrials_client as ct
from app.services.trials.matching import match_trial
from app.services.trials.simplify import explain_for_user
from app.services.agent.engine import process, update_for, watched
from app.services.agent.facts import effective_record
from app.services.trials.snowflake import CortexUnavailable, cortex_search

router = APIRouter(prefix="/trials", tags=["trials"])


async def _cortex(query: str, limit: int) -> tuple[list[Trial], dict[str, str | None]] | None:
    """Snowflake Cortex semantic ranking, refreshed from ClinicalTrials.gov. None means use the existing path."""
    try:
        rows = await cortex_search(query, limit)
    except CortexUnavailable:
        return None
    summaries = {r["nct_id"]: r.get("ai_summary") for r in rows}
    try:
        return await ct.get_trials(list(summaries)), summaries
    except AppError:
        return None


def _profile_query(profile: PatientProfile, meds: list[Medication]) -> str:
    """De-identified search text for Snowflake: conditions, age band, medication names, location."""
    parts = list(profile.conditions or [])
    if profile.age is not None:
        parts.append(f"{profile.age // 10 * 10}-{profile.age // 10 * 10 + 9} year old")
    parts += sorted({m.name for m in meds})
    if profile.location:
        parts.append(profile.location)
    return ", ".join(parts)


@router.get("/search", response_model=list[Trial])
async def search(
    response: Response, q: str = Query(min_length=2), page_size: int = 10,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    ranked = await _cortex(q, page_size)
    if ranked is not None:
        response.headers["X-Trials-Source"] = "snowflake_cortex"
        return ranked[0]
    try:
        response.headers["X-Trials-Source"] = "live"
        return await ct.search_trials(q, page_size)
    except AppError as e:
        if e.code != "clinicaltrials_unavailable":
            raise
        response.headers["X-Trials-Source"] = "cache"   # frontend must label this as cached data
        return cache.search_cached(db, q, page_size)


@router.get("/matches", response_model=list[TrialMatch])
async def matches(response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not profile or not profile.conditions:
        return []
    meds = list(db.scalars(select(Medication).where(Medication.user_id == user.id)))
    ranked = await _cortex(_profile_query(profile, meds), 10)
    if ranked is not None:
        response.headers["X-Trials-Source"] = "snowflake_cortex"
        trials, summaries = ranked
        # The Cortex AI_COMPLETE one-liner fills the plain-language slot; still never an eligibility decision.
        return await _with_agent(db, user, [match_trial(profile, t).model_copy(
            update={"plain_language_summary": summaries.get(t.nct_id)}) for t in trials])
    response.headers["X-Trials-Source"] = "cache_or_live"
    trials = []
    for cond in profile.conditions:
        found = cache.search_cached(db, cond, 25)   # fast: local cache
        if not found:                               # cache empty -> live API
            found = await ct.search_trials(cond, 10)
        trials += found
    seen, out = set(), []
    for t in trials:
        if t.nct_id not in seen:
            seen.add(t.nct_id)
            out.append(match_trial(profile, t))
    return await _with_agent(db, user, out)


STATUS_ORDER = {MatchStatus.POTENTIAL_MATCH: 0, MatchStatus.MORE_INFORMATION_NEEDED: 1,
                MatchStatus.KNOWN_CRITERIA_MISMATCH: 2}


async def _with_agent(db: Session, user: User, results: list[TrialMatch]) -> list[TrialMatch]:
    """Trials the patient has opened carry the agent's latest conclusion; best fits sort first."""
    await process(db, user.id)
    rows = watched(db, user.id)
    if rows:
        record, _, _ = effective_record(db, user.id)
        for m in results:
            if m.trial.nct_id in rows:
                m.update = update_for(rows[m.trial.nct_id], record)
                m.status = m.update.status
    return sorted(results, key=lambda m: STATUS_ORDER[m.status])   # stable: keeps relevance within a status


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


@router.post("/{nct_id}/explain", response_model=TrialExplanation)
async def explain_trial(nct_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Gemini plain-language explanation + criterion pre-screen. Status is rolled up deterministically."""
    return await explain_for_user(db, user, nct_id)


@router.get("/{nct_id}", response_model=Trial)
async def trial_detail(nct_id: str, user: User = Depends(get_current_user)):
    return await ct.get_trial(nct_id)
