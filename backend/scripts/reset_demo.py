"""Reset the synthetic demo account to the start of the demo story (run before recording).
Usage (from backend/):  python -m scripts.reset_demo
Deletes the demo user's data (cascade), then recreates Maya: 52, type 2 diabetes, London, taking Metformin.
Only touches maya.demo@example.com.
"""
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.dose_event import DoseEvent
from app.models.medication import Medication
from app.models.patient import PatientProfile
from app.models.user import User
from app.services.scheduling.generator import generate_dose_times

DEMO_EMAIL = "maya.demo@example.com"


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
                              location="London", preferred_language="en"))
        schedule = {"pattern": "daily", "times": ["08:00", "20:00"], "duration_days": 28, "timezone": "Europe/London"}
        med = Medication(user_id=user.id, name="Metformin", strength="500 mg", instructions="1 tablet twice a day with food",
                         frequency="twice daily", confirmed_schedule=schedule)
        db.add(med)
        db.flush()
        for when in generate_dose_times(schedule["times"], schedule["duration_days"], schedule["timezone"]):
            db.add(DoseEvent(medication_id=med.id, user_id=user.id, scheduled_at=when))
        db.commit()
        print(f"Demo account reset: {DEMO_EMAIL} (Maya, 52, type 2 diabetes, London, Metformin).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
