# OWNER: Member 3 - cache read/write. Cache data is a snapshot of real ClinicalTrials.gov records,
# never fabricated. Responses served from cache must be labelled as cached in the UI.
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.trial_cache import TrialCache
from app.schemas.trials import Trial


def upsert_trials(db: Session, trials: list[Trial]) -> int:
    for t in trials:
        row = {
            "nct_id": t.nct_id,
            "status": t.status,
            "search_text": f"{t.title} {' '.join(t.conditions)}".lower(),
            "data": t.model_dump(),
        }
        stmt = insert(TrialCache).values(**row).on_conflict_do_update(
            index_elements=["nct_id"], set_={k: row[k] for k in ("status", "search_text", "data")}
        )
        db.execute(stmt)
    db.commit()
    return len(trials)


def search_cached(db: Session, term: str, limit: int = 10) -> list[Trial]:
    rows = db.scalars(
        select(TrialCache)
        .where(TrialCache.status == "RECRUITING", TrialCache.search_text.ilike(f"%{term.lower()}%"))
        .limit(limit)
    ).all()
    return [Trial.model_validate(r.data) for r in rows]
