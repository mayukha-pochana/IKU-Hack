"""Warm the local trials cache from the live ClinicalTrials.gov v2 API.
Usage (from backend/):  python -m scripts.sync_trials --pages 2 asthma "type 2 diabetes"
"""
import argparse
import asyncio

from app.db.session import SessionLocal
from app.services.trials import cache
from app.services.trials.clinicaltrials_client import iter_recruiting_pages


async def main(terms: list[str], pages: int):
    db = SessionLocal()
    try:
        for term in terms:
            total, n = 0, 0
            async for page in iter_recruiting_pages(term, page_size=100, max_pages=pages):
                n += 1
                total += cache.upsert_trials(db, page)
                print(f"  {term}: page {n} saved ({total} so far)", flush=True)
            print(f"{term}: cached {total} recruiting trials", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("terms", nargs="*", default=["asthma"])
    ap.add_argument("--pages", type=int, default=3, help="pages of 100 studies per term")
    a = ap.parse_args()
    asyncio.run(main(a.terms, a.pages))