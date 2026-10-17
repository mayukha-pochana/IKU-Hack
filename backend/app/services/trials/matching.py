# OWNER: Member 3 - deterministic preliminary matching. No LLM eligibility decisions. No fake percentages.
import re
from app.models.patient import PatientProfile
from app.schemas.trials import MatchStatus, Trial, TrialMatch


def _age_years(s: str | None) -> int | None:
    m = re.match(r"(\d+)\s*Years?", s or "", re.I)
    return int(m.group(1)) if m else None


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

    if trial.exclusion_criteria:
        confirm.append("Exclusion criteria (including medications and history) need study-team review.")
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
