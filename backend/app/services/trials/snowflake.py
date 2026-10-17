# OWNER: Member 3 - Snowflake Cortex Search REST API over the PUBLIC trial corpus (Snowflake side track).
# Never send names, emails or IDs: callers pass de-identified text only.
import logging
import re

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)
IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]*$")
ACCOUNT_URL = re.compile(r"^https://[A-Za-z0-9.-]+\.snowflakecomputing\.com$")
COLUMNS = ["nct_id", "title", "ai_summary", "phase", "status"]


class CortexUnavailable(Exception):
    """Snowflake is unconfigured or failed; callers fall back to the existing cache/live search."""


def configured() -> bool:
    return bool(settings.snowflake_pat and ACCOUNT_URL.match(settings.snowflake_account_url.rstrip("/"))
                and all(IDENTIFIER.match(v) for v in (settings.snowflake_database, settings.snowflake_schema,
                                                      settings.snowflake_search_service)))


async def cortex_search(query: str, limit: int = 10) -> list[dict]:
    """Rows ({nct_id, title, ai_summary, ...}) ranked by semantic relevance to query."""
    if not configured():
        raise CortexUnavailable("not configured")
    url = (f"{settings.snowflake_account_url.rstrip('/')}/api/v2/databases/{settings.snowflake_database}"
           f"/schemas/{settings.snowflake_schema}/cortex-search-services/{settings.snowflake_search_service}:query")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(url, headers={
                "Authorization": f"Bearer {settings.snowflake_pat}",
                "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
                "Accept": "application/json",
            }, json={"query": query[:500], "columns": COLUMNS, "filter": {"@eq": {"status": "RECRUITING"}},
                     "limit": limit})
            r.raise_for_status()
            rows = r.json()["results"]
            if not isinstance(rows, list):
                raise TypeError("results is not a list")
            return [row for row in rows if isinstance(row, dict) and isinstance(row.get("nct_id"), str)]
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as e:
        # Log the class only: bodies may echo the query and headers hold the token.
        log.warning("Cortex Search failed (%s); falling back", type(e).__name__)
        raise CortexUnavailable(type(e).__name__) from e
