# OWNER: Member 4 - adaptive screening agent. Reacts to the patient's event stream by re-screening the trials it
# watches, abandoning conclusions whose facts changed and saying why. Bounded work per pass: pending events are
# coalesced into one pass, at most MAX_WATCHED trials, one Gemini call each, with a time limit and a deterministic
# fallback so it always commits to a best current answer.
import asyncio
import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.agent import AgentEvent, TrialConclusion
from app.models.patient import PatientProfile
from app.schemas.trials import CriterionAssessment, FixOption, MatchStatus, TrialExplanation, TrialUpdate
from app.services.agent.facts import effective_record, only_sensor_changed, record_event
from app.services.trials import clinicaltrials_client as ct
from app.services.trials import simplify

MAX_WATCHED = 10
GEMINI_SECONDS = 30
CONCURRENCY = 3
# A daily check-in only matters to trials whose criteria mention vital signs.
VITALS = re.compile(r"heart rate|pulse|beats per minute|\bbpm\b|respirat|breathing rate|oxygen saturation|"
                    r"\bspo2\b|tachycardi|bradycardi|vital sign", re.I)
# Patient-facing words for the three statuses (the API values stay the shared MatchStatus enum).
LABEL = {"POTENTIAL_MATCH": "Could be a fit", "MORE_INFORMATION_NEEDED": "We need to check",
         "KNOWN_CRITERIA_MISMATCH": "Not a fit right now"}
VERDICT = {"supports": "counts in your favour", "conflicts": "means this study may not fit you",
           "unknown": "needs checking with the study team"}


def _key(text: str) -> str:
    return re.sub(r"\W+", " ", text).strip().lower()


def explain_change(old_status: str | None, new_status: str, old: list[dict], new: list[dict],
                   deterministic_reasons: list[str], provisional: bool) -> str:
    """One or two plain sentences: which requirements moved, and on what evidence."""
    before = {_key(c["original_text"]): c for c in old}
    moved = []
    for c in new:
        prior = before.get(_key(c["original_text"]))
        if prior is None or prior["effect"] != c["effect"]:
            if c["effect"] == "unknown" and prior is None:
                continue
            evidence = f" (from {c['evidence']})" if c.get("evidence") else ""
            moved.append(f'"{c["plain_text"].rstrip(".")}" now {VERDICT[c["effect"]]}{evidence}')
    parts = [r.rstrip(".") for r in deterministic_reasons if "no longer recruiting" in r]
    parts += moved[:2]
    if provisional:
        parts.append("We'll double-check this shortly; for now it uses the trial's published age and status only")
    if not parts:
        parts = ["Nothing about this trial changed" if old_status == new_status
                 else "Checked again with your latest information"]
    return (". ".join(p[0].upper() + p[1:] for p in parts) + ".")[:1000]


def _set_status(row: TrialConclusion, status: str, viewed: bool) -> bool:
    """Apply a status; a change is stamped so the dashboard can say "1 trial changed"."""
    if row.status == status:
        return False
    now = datetime.now(timezone.utc)
    row.previous_status, row.status, row.changed_at = row.status, status, now
    row.seen_at = now if viewed else None
    return True


def fix_options(row: TrialConclusion, record: dict) -> list[dict]:
    """One-tap corrections for the facts this conclusion leans on. Each option is a ready-made correction."""
    options, seen = [], set()
    taking = [m["name"] for m in record.get("confirmed_medications", [])]
    stopped = record.get("medications_patient_says_stopped", [])
    conditions = record.get("conditions", [])
    for c in row.criteria:
        if c["effect"] == "unknown":
            continue
        text = " ".join(str(c.get(k) or "") for k in ("evidence", "original_text", "plain_text")).lower()
        for name in taking:
            if c["effect"] == "conflicts" and name.split()[0].lower() in text:
                options.append({"label": f"I stopped taking {name}", "facts": [{"type": "medication_stopped",
                                                                                "value": name}]})
        for name in stopped:
            if name.split()[0].lower() in text:
                options.append({"label": f"I'm taking {name} again", "facts": [{"type": "medication_taking",
                                                                               "value": name}]})
        for name in conditions:
            if c["effect"] == "conflicts" and name.lower() in text:
                options.append({"label": f"I don't have {name}", "facts": [{"type": "condition_absent",
                                                                           "value": name}]})
    unique = []
    for o in options:
        if o["label"] not in seen:
            seen.add(o["label"])
            unique.append(o)
    return unique[:3]


def update_for(row: TrialConclusion, record: dict) -> TrialUpdate:
    return TrialUpdate(
        status=row.status, label=LABEL[row.status], previous_status=row.previous_status,
        previous_label=LABEL.get(row.previous_status) if row.previous_status else None, reason=row.reason,
        changed_at=row.changed_at, is_new=row.changed_at is not None and row.seen_at is None,
        provisional=row.provisional, fix_options=[FixOption(**o) for o in fix_options(row, record)])


def watched(db: Session, user_id) -> dict[str, TrialConclusion]:
    return {r.nct_id: r for r in db.scalars(select(TrialConclusion).where(TrialConclusion.user_id == user_id))}


def watch(db: Session, user_id, result: TrialExplanation, record_hash: str) -> None:
    """Called after an explanation: start (or refresh) watching this trial for the patient."""
    row = db.scalar(select(TrialConclusion).where(TrialConclusion.user_id == user_id,
                                                  TrialConclusion.nct_id == result.nct_id))
    criteria = [c.model_dump() for c in result.criteria]
    status = result.status.value
    if row is None:
        db.add(TrialConclusion(user_id=user_id, nct_id=result.nct_id, title=result.title, status=status,
                               previous_status=None, criteria=criteria, record_hash=record_hash, provisional=False,
                               reason="First check with your current information.",
                               seen_at=datetime.now(timezone.utc)))
        event = record_event(db, user_id, "trial_watched", f"You opened {result.title}. CareFlow will keep it updated.")
        event.processed_at = datetime.now(timezone.utc)
        event.changes = [{"nct_id": result.nct_id, "title": result.title, "from": None, "to": status,
                          "reason": "First check."}]
    elif row.record_hash != record_hash or row.status != status:
        reason = explain_change(row.status, status, row.criteria, criteria, result.why_surfaced, False)
        _set_status(row, status, viewed=True)      # the patient is looking at this trial right now
        row.criteria, row.record_hash, row.reason, row.provisional = criteria, record_hash, reason, False
    db.commit()


async def _rescreen(row: TrialConclusion, profile, record: dict, record_hash: str):
    """Returns (status, criteria dumps, deterministic reasons, provisional) for one watched trial."""
    trial = await ct.get_trial(row.nct_id)            # live registry: picks up status changes
    deterministic, reasons = simplify.deterministic_status(profile, trial)
    criteria_text = simplify._criteria_text(trial)
    try:
        generated = await asyncio.wait_for(simplify.screen(trial, record, record_hash), GEMINI_SECONDS)
        criteria = [simplify.assess(c, criteria_text) for c in generated.criteria]
        provisional = False
    except (AppError, asyncio.TimeoutError):
        # Do not stall: keep the previous criteria and commit to the best deterministic answer.
        criteria = [CriterionAssessment.model_validate(c) for c in row.criteria]
        provisional = True
    status = simplify.roll_up(criteria, deterministic).value
    return status, [c.model_dump() for c in criteria], reasons, provisional


async def process(db: Session, user_id) -> list[AgentEvent]:
    """Handle every pending event in one pass and record what changed. Returns the events handled."""
    pending = list(db.scalars(select(AgentEvent).where(AgentEvent.user_id == user_id,
                                                       AgentEvent.processed_at.is_(None))
                              .order_by(AgentEvent.created_at)))
    if not pending:
        return []
    record, _, record_hash = effective_record(db, user_id)
    profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user_id))
    refresh = any(e.kind == "registry_refresh" for e in pending)
    rows = list(db.scalars(select(TrialConclusion).where(TrialConclusion.user_id == user_id)
                           .order_by(TrialConclusion.updated_at.desc()).limit(MAX_WATCHED)))
    stale = [r for r in rows if refresh or r.record_hash != record_hash]
    skipped = []
    if not refresh:
        # Only the check-in changed: re-screen just the trials whose published criteria mention vital signs.
        for row in [r for r in stale if only_sensor_changed(r.record_hash, record_hash)]:
            try:
                trial = await ct.get_trial(row.nct_id)
            except AppError:
                continue          # registry unreachable: re-screen to be safe
            if not VITALS.search(simplify._criteria_text(trial)):
                row.record_hash = record_hash
                stale.remove(row)
                skipped.append(row)

    gate = asyncio.Semaphore(CONCURRENCY)

    async def bounded(row):
        async with gate:
            try:
                return row, await _rescreen(row, profile, record, record_hash)
            except AppError:
                return row, None      # registry unreachable: keep the old conclusion, retry next pass

    changes = []
    for row, outcome in await asyncio.gather(*(bounded(r) for r in stale)):
        if outcome is None:
            continue
        status, criteria, reasons, provisional = outcome
        reason = explain_change(row.status, status, row.criteria, criteria, reasons, provisional)
        if status != row.status:
            changes.append({"nct_id": row.nct_id, "title": row.title, "from": row.status, "to": status,
                            "reason": reason})
        _set_status(row, status, viewed=False)
        row.criteria, row.reason, row.provisional = criteria, reason, provisional
        if not provisional:
            row.record_hash = record_hash

    now = datetime.now(timezone.utc)
    for event in pending:
        event.processed_at = now
        if event.kind == "checkin_recorded" and skipped and not stale:
            event.summary = (event.summary + " None of your watched trials depend on these readings, so nothing "
                             "was re-checked.")[:500]
    # Coalesced: the outcome is attributed to the newest event, which saw the full set of facts.
    pending[-1].changes = changes
    db.commit()
    return pending
