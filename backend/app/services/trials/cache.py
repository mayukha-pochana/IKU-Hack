# OWNER: Member 3 - cache read/write. Data is a snapshot of real ClinicalTrials.gov records.
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.trial_cache import TrialCache
from app.schemas.trials import Trial


def upsert_trials(db: Session, trials: list[Trial]) -> int:
    rows = {}
    for t in trials:  # dedupe by nct_id: one statement can't touch a row twice
        rows[t.nct_id] = {
            "nct_id": t.nct_id,
            "status": t.status,
            "search_text": f"{t.title} {' '.join(t.conditions)}".lower(),
            "data": t.model_dump(),
        }
    if not rows:
        return 0
    stmt = insert(TrialCache).values(list(rows.values()))
    stmt = stmt.on_conflict_do_update(
        index_elements=["nct_id"],
        set_={"status": stmt.excluded.status, "search_text": stmt.excluded.search_text, "data": stmt.excluded.data},
    )
    db.execute(stmt)
    db.commit()
    return len(rows)


def search_cached(db: Session, term: str, limit: int = 10) -> list[Trial]:
    rows = db.scalars(
        select(TrialCache)
        .where(TrialCache.status == "RECRUITING", TrialCache.search_text.ilike(f"%{term.lower()}%"))
        .limit(limit)
    ).all()
    return [Trial.model_validate(r.data) for r in rows]