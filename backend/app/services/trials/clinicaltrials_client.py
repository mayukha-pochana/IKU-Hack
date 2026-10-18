# OWNER: Member 3 - ClinicalTrials.gov API v2 adapter (live; no API key required).
import re

import httpx
from app.core.errors import AppError
from app.schemas.trials import Trial, TrialLocation

BASE = "https://clinicaltrials.gov/api/v2"


def parse_study(study: dict) -> Trial:
    p = study.get("protocolSection", {})
    ident = p.get("identificationModule", {})
    elig = p.get("eligibilityModule", {})
    nct = ident.get("nctId", "")
    criteria = elig.get("eligibilityCriteria") or ""
    inc, exc = _split_criteria(criteria)
    locs = [
        TrialLocation(facility=l.get("facility"), city=l.get("city"), country=l.get("country"))
        for l in p.get("contactsLocationsModule", {}).get("locations", [])
    ]
    return Trial(
        nct_id=nct,
        title=ident.get("briefTitle", ""),
        brief_summary=p.get("descriptionModule", {}).get("briefSummary"),
        status=p.get("statusModule", {}).get("overallStatus"),
        conditions=p.get("conditionsModule", {}).get("conditions", []),
        interventions=[i.get("name", "") for i in p.get("armsInterventionsModule", {}).get("interventions", [])],
        phases=p.get("designModule", {}).get("phases", []),
        inclusion_criteria=inc,
        exclusion_criteria=exc,
        min_age=elig.get("minimumAge"),
        max_age=elig.get("maximumAge"),
        locations=locs,
        url=f"https://clinicaltrials.gov/study/{nct}",
    )


def _split_criteria(text: str) -> tuple[str | None, str | None]:
    if not text:
        return None, None
    low = text.lower()
    i, e = low.find("inclusion criteria"), low.find("exclusion criteria")
    if i == -1 and e == -1:
        return text, None
    if e == -1:
        return text[i:].strip(), None
    if i == -1:
        return None, text[e:].strip()
    return (text[i:e].strip(), text[e:].strip()) if i < e else (text[i:].strip(), text[e:i].strip())


async def search_for_patient(condition: str, location: str | None, page_size: int = 15) -> list[Trial]:
    """Recruiting trials for a condition, near the patient when we know where they live (falls back to anywhere)."""
    params = {"query.cond": condition, "filter.overallStatus": "RECRUITING", "pageSize": page_size}
    if location:   # "Birmingham, UK" -> "Birmingham, United Kingdom" so the registry's location search understands it
        params["query.locn"] = re.sub(r"\b(UK|U\.K\.|England|GB)\b", "United Kingdom", location)
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{BASE}/studies", params=params)
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise AppError("clinicaltrials_unavailable", "ClinicalTrials.gov request failed.", 502, {"reason": str(e)})
    trials = [parse_study(s) for s in r.json().get("studies", [])]
    if not trials and location:
        return await search_for_patient(condition, None, page_size)
    return trials


async def search_trials(term: str, page_size: int = 10) -> list[Trial]:
    params = {"query.term": term, "filter.overallStatus": "RECRUITING", "pageSize": page_size}
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{BASE}/studies", params=params)
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise AppError("clinicaltrials_unavailable", "ClinicalTrials.gov request failed.", 502, {"reason": str(e)})
    return [parse_study(s) for s in r.json().get("studies", [])]


async def get_trial(nct_id: str) -> Trial:
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{BASE}/studies/{nct_id}")
            if r.status_code == 404:
                raise AppError("trial_not_found", "Trial not found.", 404)
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise AppError("clinicaltrials_unavailable", "ClinicalTrials.gov request failed.", 502, {"reason": str(e)})
    return parse_study(r.json())


async def get_trials(nct_ids: list[str]) -> list[Trial]:
    """Fetch current records for known IDs in one call, preserving the requested (relevance) order."""
    if not nct_ids:
        return []
    params = {"filter.ids": ",".join(nct_ids), "pageSize": len(nct_ids)}
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{BASE}/studies", params=params)
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise AppError("clinicaltrials_unavailable", "ClinicalTrials.gov request failed.", 502, {"reason": str(e)})
    found = {t.nct_id: t for t in (parse_study(s) for s in r.json().get("studies", []))}
    return [found[i] for i in nct_ids if i in found]


async def iter_recruiting_pages(term: str, page_size: int = 100, max_pages: int = 10):
    """Yield lists of Trial across pages using v2 `nextPageToken`. Used by scripts/sync_trials.py."""
    params = {"query.term": term, "filter.overallStatus": "RECRUITING", "pageSize": page_size}
    async with httpx.AsyncClient(timeout=30) as c:
        for _ in range(max_pages):
            r = await c.get(f"{BASE}/studies", params=params)
            r.raise_for_status()
            body = r.json()
            yield [parse_study(s) for s in body.get("studies", [])]
            token = body.get("nextPageToken")
            if not token:
                break
            params["pageToken"] = token
