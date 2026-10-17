# OWNER: Member 4
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ConfirmedSchedule(BaseModel):
    times: list[str] = Field(min_length=1)   # "HH:MM", patient-confirmed
    duration_days: int = Field(ge=1, le=3650)
    timezone: str = "Europe/London"


class MedicationCreate(BaseModel):
    name: str
    strength: str | None = None
    instructions: str | None = None
    frequency: str | None = None
    schedule: ConfirmedSchedule


class MedicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    strength: str | None
    instructions: str | None
    frequency: str | None
    confirmed_schedule: dict
    created_at: datetime
