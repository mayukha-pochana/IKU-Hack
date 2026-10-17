"""Load recruiting ClinicalTrials.gov studies into Snowflake (CAREFLOW.TRIALS.STUDIES) via the Snowflake SQL API.
Usage (from backend/):  python -m scripts.sync_trials_snowflake asthma "type 2 diabetes"
Run docs/snowflake-setup.sql sections 1-2 first, and sections 3-4 afterwards. Public trial data only.
"""
import asyncio
import re
import sys

import httpx

from app.core.config import settings
from app.schemas.trials import Trial
from app.services.trials.clinicaltrials_client import iter_recruiting_pages
from app.services.trials.snowflake import ACCOUNT_URL, IDENTIFIER

COLUMNS = ["nct_id", "title", "brief_summary", "conditions", "interventions", "phase", "status",
           "min_age", "max_age", "eligibility_text"]
BATCH_ROWS = 50              # 50 rows x 10 columns = 500 bind variables per statement
POLL_SECONDS, POLL_LIMIT = 2, 60


def row(t: Trial) -> list[str]:
    criteria = "\n".join(c for c in (t.inclusion_criteria, t.exclusion_criteria) if c)
    return [t.nct_id, t.title, t.brief_summary or "", "; ".join(t.conditions), "; ".join(t.interventions),
            "; ".join(t.phases), t.status or "", t.min_age or "", t.max_age or "", criteria]


def merge_statement(n_rows: int) -> str:
    """MERGE n_rows bound rows; ai_summary is cleared when the summary text changes so it is regenerated."""
    placeholders = ", ".join("(" + ", ".join("?" * len(COLUMNS)) + ")" for _ in range(n_rows))
    # Empty strings were bound in place of nulls; NULLIF restores them so "IS NULL" checks keep working.
    source = ", ".join(f"NULLIF(column{i + 1}, '') AS {c}" for i, c in enumerate(COLUMNS))
    updates = ", ".join(f"{c} = s.{c}" for c in COLUMNS[1:])
    return (f"MERGE INTO STUDIES t USING (SELECT {source} FROM VALUES {placeholders}) s ON t.nct_id = s.nct_id "
            f"WHEN MATCHED THEN UPDATE SET {updates}, "
            "ai_summary = IFF(EQUAL_NULL(t.brief_summary, s.brief_summary), t.ai_summary, NULL), "
            "loaded_at = CURRENT_TIMESTAMP() "
            f"WHEN NOT MATCHED THEN INSERT ({', '.join(COLUMNS)}, loaded_at) "
            f"VALUES ({', '.join('s.' + c for c in COLUMNS)}, CURRENT_TIMESTAMP())")


def bindings(rows: list[list[str]]) -> dict:
    values = [value for r in rows for value in r]
    return {str(i + 1): {"type": "TEXT", "value": v} for i, v in enumerate(values)}


def _require_config() -> None:
    if not settings.snowflake_pat or not ACCOUNT_URL.match(settings.snowflake_account_url.rstrip("/")):
        raise SystemExit("Set SNOWFLAKE_ACCOUNT_URL (https://<account>.snowflakecomputing.com) and SNOWFLAKE_PAT.")
    if not all(IDENTIFIER.match(v) for v in (settings.snowflake_database, settings.snowflake_schema,
                                             settings.snowflake_warehouse)):
        raise SystemExit("SNOWFLAKE_DATABASE / SNOWFLAKE_SCHEMA / SNOWFLAKE_WAREHOUSE must be plain identifiers.")


async def execute(client: httpx.AsyncClient, statement: str, binds: dict) -> dict:
    """Run one statement through the SQL API, polling if Snowflake answers 202 (still running)."""
    base = settings.snowflake_account_url.rstrip("/")
    r = await client.post(f"{base}/api/v2/statements", json={
        "statement": statement, "bindings": binds, "timeout": 120, "database": settings.snowflake_database,
        "schema": settings.snowflake_schema, "warehouse": settings.snowflake_warehouse})
    for _ in range(POLL_LIMIT):
        if r.status_code != 202:
            break
        await asyncio.sleep(POLL_SECONDS)
        r = await client.get(f"{base}{r.json()['statementStatusUrl']}")
    if r.status_code != 200:
        # Snowflake's error message names the failing SQL; it never contains the token.
        try:
            message = str(r.json().get("message", ""))[:300]
        except ValueError:
            message = ""
        raise RuntimeError(f"Snowflake SQL API {r.status_code}: {message}")
    return r.json()


async def load(terms: list[str], max_pages: int = 10) -> int:
    _require_config()
    headers = {"Authorization": f"Bearer {settings.snowflake_pat}", "Accept": "application/json",
               "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN"}
    total = 0
    async with httpx.AsyncClient(timeout=150, headers=headers) as client:
        for term in terms:
            loaded = 0
            async for page in iter_recruiting_pages(term, max_pages=max_pages):
                # MERGE fails if one source batch holds the same nct_id twice.
                unique = list({t.nct_id: row(t) for t in page if re.fullmatch(r"NCT\d{8}", t.nct_id)}.values())
                for i in range(0, len(unique), BATCH_ROWS):
                    batch = unique[i:i + BATCH_ROWS]
                    await execute(client, merge_statement(len(batch)), bindings(batch))
                    loaded += len(batch)
            print(f"{term}: merged {loaded} recruiting trials into Snowflake")
            total += loaded
    return total


if __name__ == "__main__":
    asyncio.run(load(sys.argv[1:] or ["asthma"]))
