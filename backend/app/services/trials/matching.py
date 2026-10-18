# OWNER: Member 3 - deterministic preliminary matching. No LLM eligibility decisions. No fake percentages.
import re
from app.models.patient import PatientProfile
from app.schemas.trials import MatchStatus, Trial, TrialMatch

MAX_ITEMS = 8
MAX_ITEM_CHARS = 200
_BULLET = re.compile(r"^\s*(?:[-*\u2022]|\d+[.)])\s+")
_HEADER = re.compile(r"^\s*(?:inclusion|exclusion)\s+criteria\s*:?\s*$", re.I)


def _age_years(s: str | None) -> int | None:
    m = re.match(r"(\d+)\s*Years?", s or "", re.I)
    return int(m.group(1)) if m else None


def extract_criteria_items(text: str | None, limit: int = MAX_ITEMS) -> list[str]:
    """Split ClinicalTrials.gov criteria text into individual bullet items.
    Wrapped lines are joined to the previous bullet. Items are shortened, never reworded."""
    if not text:
        return []
    items: list[str] = []
    for line in text.splitlines():
        if not line.strip() or _HEADER.match(line):
            continue
        if _BULLET.match(line):
            items.append(_BULLET.sub("", line).strip())
        elif items:
            items[-1] += " " + line.strip()      # continuation of a wrapped bullet
        else:
            items.append(line.strip())           # unbulleted free text
    items = [i if len(i) <= MAX_ITEM_CHARS else i[: MAX_ITEM_CHARS - 1].rstrip() + "\u2026" for i in items]
    return items[:limit]


def match_trial(profile: PatientProfile, trial: Trial) -> TrialMatch:
    why, relevant, missing, confirm = [], [], [], []
    mismatch = False

    # Condition overlap
    pc = {c.lower() for c in profile.conditions or []}
    overlap = [c for c in trial.conditions if any(p in c.lower() or c.lower() in p for p in pc)]
    if overlap:
        why.append(f"Study condition matches your profile: {', '.join(overlap)}")

    # Age
    if profile.age is None:
        missing.append("Your age is not in your profile.")
    else:
        lo, hi = _age_years(trial.min_age), _age_years(trial.max_age)
        if lo is not None:
            relevant.append(f"Minimum age: {lo}")
            mismatch |= profile.age < lo
        if hi is not None:
            relevant.append(f"Maximum age: {hi}")
            mismatch |= profile.age > hi

    # Location (simple city/country text overlap)
    if profile.location and trial.locations:
        loc = profile.location.lower()
        if any(loc in f"{l.city or ''} {l.country or ''}".lower() for l in trial.locations):
            why.append(f"Study site found near {profile.location}")
        else:
            missing.append(f"No listed site matching {profile.location}.")

    # Exclusion criteria: list each stated item for the study team to check.
    # We do NOT judge whether the patient meets them.
    for item in extract_criteria_items(trial.exclusion_criteria):
        confirm.append(f"Study team will check: {item}")
    if trial.exclusion_criteria and not confirm:
        confirm.append("Exclusion criteria need study-team review.")
    # TODO(M3): medication-related criteria check using patient's confirmed meds (read-only).

    status = (
        MatchStatus.KNOWN_CRITERIA_MISMATCH if mismatch
        else MatchStatus.MORE_INFORMATION_NEEDED if (missing or confirm)
        else MatchStatus.POTENTIAL_MATCH
    )
    return TrialMatch(
        trial=trial, status=status, why_surfaced=why or ["Surfaced by condition search"],
        relevant_criteria=relevant, missing_information=missing, needs_coordinator_confirmation=confirm,
    )
