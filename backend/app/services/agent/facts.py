# OWNER: Member 4 - the agent's belief state: what it currently holds true about the patient, and why.
# Source rules (shown to the patient whenever they matter):
#   * Patient statements (profile, confirmed medications, corrections) outrank sensor readings; the newest wins.
#   * Presage readings are unverified camera estimates: supporting evidence only, never an override.
import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent import AgentEvent
from app.models.health_checkin import HealthCheckin
from app.models.medication import Medication
from app.models.patient import PatientProfile

EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _utc(value: datetime | None) -> datetime:
    if value is None:
        return EPOCH
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _when(value: datetime | None) -> str:
    return _utc(value).strftime("%d %b %H:%M")


def record_event(db: Session, user_id, kind: str, summary: str, payload: dict | None = None) -> AgentEvent:
    """Append to the patient's event stream. The caller commits with its own transaction."""
    event = AgentEvent(user_id=user_id, kind=kind, summary=summary[:500], payload=payload or {}, changes=[])
    db.add(event)
    return event


def effective_record(db: Session, user_id) -> tuple[dict, list[dict], str]:
    """Merge every source into the record the agent screens with.
    Returns (record, conflicts, record_hash). Conflicts say what disagreed, what was kept, and why."""
    profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user_id))
    meds = list(db.scalars(select(Medication).where(Medication.user_id == user_id).order_by(Medication.created_at)))
    corrections = list(db.scalars(select(AgentEvent).where(
        AgentEvent.user_id == user_id, AgentEvent.kind == "correction").order_by(AgentEvent.created_at)))
    checkins = list(db.scalars(select(HealthCheckin).where(
        HealthCheckin.user_id == user_id, HealthCheckin.measurement_source == "presage_sdk")
        .order_by(HealthCheckin.recorded_at.desc()).limit(3)))

    profile_time = _utc(getattr(profile, "updated_at", None) or getattr(profile, "created_at", None))
    age = {"value": getattr(profile, "age", None), "at": profile_time, "source": "your profile"}
    conditions = {c.lower(): {"name": c, "at": profile_time, "source": "your profile", "present": True}
                  for c in (getattr(profile, "conditions", None) or [])}
    medications = {m.name.lower(): {"name": m.name, "strength": m.strength, "at": _utc(m.created_at),
                                    "source": "your confirmed medication list", "taking": True} for m in meds}
    notes, conflicts = [], []

    def resolve(topic: str, current: dict | None, new: dict, kept_label: str, old_label: str) -> bool:
        """Newest patient statement wins; record the disagreement either way."""
        if current is None:
            return True
        if new["at"] >= current["at"]:
            conflicts.append({"topic": topic, "kept": f"{kept_label} ({new['source']}, {_when(new['at'])})",
                              "overridden": f"{old_label} ({current['source']}, {_when(current['at'])})",
                              "rule": "Your most recent statement wins."})
            return True
        conflicts.append({"topic": topic, "kept": f"{old_label} ({current['source']}, {_when(current['at'])})",
                          "overridden": f"{kept_label} ({new['source']}, {_when(new['at'])})",
                          "rule": "A newer record replaced this earlier correction."})
        return False

    for event in corrections:
        at, source = _utc(event.created_at), "your correction"
        for fact in (event.payload or {}).get("facts", []):
            kind, value = fact.get("type"), str(fact.get("value") or "").strip()
            key = value.lower()
            if not value:
                continue
            if kind == "medication_stopped":
                match = next((k for k in medications if key in k or k in key), key)
                current = medications.get(match)
                if current is None:
                    medications[match] = {"name": value, "strength": None, "at": at, "source": source,
                                          "taking": False}
                elif current["taking"] and resolve(
                        f"Medication: {current['name']}", current, {"at": at, "source": source},
                        "Not taking", "Taking"):
                    medications[match] = current | {"taking": False, "at": at, "source": source}
            elif kind == "medication_taking":
                current = medications.get(key)
                if current is None or not current["taking"]:
                    if current is None or resolve(f"Medication: {value}", current, {"at": at, "source": source},
                                                  "Taking", "Not taking"):
                        medications[key] = {"name": value, "strength": None, "at": at, "source": source,
                                            "taking": True}
            elif kind in ("condition_absent", "condition_present"):
                present = kind == "condition_present"
                match = next((k for k in conditions if key in k or k in key), key)
                current = conditions.get(match)
                if current is None or current["present"] != present:
                    if current is None or resolve(f"Condition: {current['name']}", current,
                                                  {"at": at, "source": source},
                                                  "Has it" if present else "Does not have it",
                                                  "Does not have it" if present else "Has it"):
                        conditions[match] = {"name": value if current is None else current["name"], "at": at,
                                             "source": source, "present": present}
            elif kind == "age" and value.isdigit():
                if resolve("Age", age if age["value"] is not None else None, {"at": at, "source": source},
                           value, str(age["value"])):
                    age = {"value": int(value), "at": at, "source": source}
            else:
                notes.append({"text": value[:300], "said_at": _when(at)})

    record = {
        "age": age["value"],
        "conditions": sorted(c["name"] for c in conditions.values() if c["present"]),
        "conditions_ruled_out_by_patient": sorted(c["name"] for c in conditions.values() if not c["present"]),
        "location": getattr(profile, "location", None),
        "confirmed_medications": [{"name": m["name"], "strength": m["strength"], "source": m["source"]}
                                  for m in medications.values() if m["taking"]],
        "medications_patient_says_stopped": sorted(m["name"] for m in medications.values() if not m["taking"]),
        "patient_notes": notes,
        # Low trust: may support a criterion, never decide one.
        "unverified_sensor_readings": [
            {"heart_rate_bpm": c.heart_rate, "breathing_rate_bpm": c.breathing_rate,
             "recorded": _when(c.recorded_at), "source": "Presage contactless camera estimate"} for c in checkins],
    }
    return record, conflicts, record_hash(record)


def _digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, default=str).encode()).hexdigest()[:16]


def record_hash(record: dict) -> str:
    """"<patient facts>:<sensor readings>" so the agent can tell when only the daily check-in changed."""
    core = {k: v for k, v in record.items() if k != "unverified_sensor_readings"}
    return f"{_digest(core)}:{_digest(record['unverified_sensor_readings'])}"


def only_sensor_changed(old_hash: str, new_hash: str) -> bool:
    return old_hash.split(":")[0] == new_hash.split(":")[0] and old_hash != new_hash
