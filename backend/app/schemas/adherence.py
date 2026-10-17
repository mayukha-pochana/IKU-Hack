# OWNER: Member 4
from datetime import date
from pydantic import BaseModel


class AdherenceSummary(BaseModel):
    scheduled_doses: int
    reported_taken: int
    reported_missed: int
    reported_skipped: int = 0
    reported_adherence_percentage: float | None   # None when no doses are due yet
    note: str = "Based on patient-reported dose status."


class AdherenceDay(BaseModel):
    day: date
    scheduled: int
    taken: int
    missed: int
