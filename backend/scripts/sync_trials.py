"""Warm the local trials cache from the live ClinicalTrials.gov v2 API.
Usage (from backend/):  python -m scripts.sync_trials asthma "type 2 diabetes"
Run before the demo so search works fast and survives an API outage.
"""
import asyncio
import sys

from app.db.session import SessionLocal
from app.services.trials import cache
from app.services.trials.clinicaltrials_client import iter_recruiting_pages


async def main(terms: list[str]):
    db = SessionLocal()
    try:
        for term in terms:
            total = 0
            async for page in iter_recruiting_pages(term):
                total += cache.upsert_trials(db, page)
            print(f"{term}: cached {total} recruiting trials")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:] or ["asthma"]))
