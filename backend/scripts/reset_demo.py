"""Reset the synthetic demo account to the start of the demo story (run before recording).
Usage (from backend/):  python -m scripts.reset_demo
Only touches maya.demo@example.com. Everything here is synthetic.

Maya, 52, primary school teacher in Birmingham, type 2 diabetes for 3 years:
  - Metformin 500 mg twice a day for the past week (one missed dose), so the calendar and adherence have history
  - Semaglutide 1 mg injection once a week on Sundays (weekly schedule; the demo trial needs a stable dose)
  - Paracetamol 500 mg when needed, one dose logged two days ago (as-needed logging)
  - one diary entry yesterday
The story then adds insulin by scanning demo-assets/insulin-box-with-pharmacy-label.jpg.
"""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.dose_event import DoseEvent
from app.models.health_checkin import HealthCheckin
from app.models.medication import Medication
from app.models.patient import PatientProfile
from app.models.user import User
from app.services.scheduling.generator import generate_dose_times, schedule_kwargs

DEMO_EMAIL = "maya.demo@example.com"
TZ = "Europe/London"


def add_medication(db, user, name, strength, instructions, frequency, schedule, start):
    med = Medication(user_id=user.id, name=name, strength=strength, instructions=instructions, frequency=frequency,
                     confirmed_schedule=schedule)
    db.add(med)
    db.flush()
    kwargs = schedule_kwargs(schedule)
    doses = [DoseEvent(medication_id=med.id, user_id=user.id, scheduled_at=when)
             for when in generate_dose_times(**kwargs, start=start)]
    db.add_all(doses)
    return med, doses


def main():
    db = SessionLocal()
    try:
        old = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if old:
            db.delete(old)
            db.commit()
        user = User(email=DEMO_EMAIL)
        db.add(user)
        db.flush()
        db.add(PatientProfile(user_id=user.id, display_name="Maya", age=52, conditions=["Type 2 diabetes"],
                              location="Birmingham", preferred_language="en"))

        now = datetime.now(timezone.utc)
        week_ago = now.astimezone(ZoneInfo(TZ)).date() - timedelta(days=7)
        _, metformin = add_medication(
            db, user, "Metformin", "500 mg", "Take ONE tablet TWICE a day with food", "twice daily",
            {"pattern": "daily", "times": ["08:00", "20:00"], "duration_days": 35, "timezone": TZ}, week_ago)
        add_medication(
            db, user, "Semaglutide", "1 mg", "Inject 1 mg under the skin once a week", "once weekly",
            {"pattern": "weekly", "weekdays": [6], "times": ["09:00"], "duration_days": 35, "timezone": TZ}, week_ago)
        paracetamol, _ = add_medication(
            db, user, "Paracetamol", "500 mg", "Take ONE or TWO tablets when needed, up to 4 times a day", "as needed",
            {"pattern": "as_needed", "times": [], "duration_days": 90, "timezone": TZ}, week_ago)

        # A week of patient-reported history: all past Metformin doses taken except one missed.
        past = sorted((d for d in metformin if d.scheduled_at < now), key=lambda d: d.scheduled_at)
        for i, dose in enumerate(past):
            dose.status = "MISSED" if i == 5 else "TAKEN"
            dose.confirmed_at = None if i == 5 else dose.scheduled_at + timedelta(minutes=10)
        taken_at = now - timedelta(days=2, hours=3)
        db.add(DoseEvent(medication_id=paracetamol.id, user_id=user.id, scheduled_at=taken_at, status="TAKEN",
                         confirmed_at=taken_at))
        db.add(HealthCheckin(user_id=user.id, measurement_source="none", recorded_at=now - timedelta(days=1),
                             symptom_report="Feeling: Okay\nA bit tired after school; sugar was high this morning."))
        db.commit()
        print(f"Demo account reset: {DEMO_EMAIL} (Maya, 52, Birmingham, type 2 diabetes; Metformin, Semaglutide, "
              f"Paracetamol; {len(past)} past doses logged).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
