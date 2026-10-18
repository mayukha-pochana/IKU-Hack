import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import update
from sqlalchemy.orm import Session
from app.models.dose_event import DoseEvent

AUTO_MISSED_AFTER = timedelta(hours=6)   # product choice: tune it

def mark_overdue_as_missed(db: Session, user_id: uuid.UUID) -> int:
    cutoff = datetime.now(timezone.utc) - AUTO_MISSED_AFTER
    res = db.execute(update(DoseEvent).where(
        DoseEvent.user_id == user_id, DoseEvent.status == "SCHEDULED", DoseEvent.scheduled_at < cutoff,
    ).values(status="MISSED"))
    db.commit()
    return res.rowcount