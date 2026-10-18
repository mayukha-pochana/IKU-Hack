# OWNER: Member 4
import re
import uuid
from datetime import datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Pattern = Literal["daily", "every_n_days", "weekly", "as_needed"]


class ConfirmedSchedule(BaseModel):
    """Patient-confirmed. Older rows have no `pattern`; they are daily."""
    pattern: Pattern = "daily"
    times: list[str] = Field(default_factory=list, max_length=8)   # "HH:MM"; empty only for as_needed
    duration_days: int = Field(ge=1, le=3650)
    timezone: str = "Europe/London"
    interval_days: int | None = Field(default=None, ge=2, le=90)    # every_n_days
    weekdays: list[int] | None = Field(default=None, max_length=7)  # weekly; 0 = Monday ... 6 = Sunday

    @field_validator("times")
    @classmethod
    def _times(cls, v: list[str]) -> list[str]:
        if any(not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", t) for t in v):
            raise ValueError("Times must look like 08:00.")
        return sorted(set(v))

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Unknown timezone.")
        return v

    @model_validator(mode="after")
    def _pattern_fields(self):
        if self.pattern != "as_needed" and not self.times:
            raise ValueError("Add at least one dose time.")
        if self.pattern == "every_n_days" and not self.interval_days:
            raise ValueError("Say how many days apart the doses are.")
        if self.pattern == "weekly":
            if not self.weekdays or any(d not in range(7) for d in self.weekdays):
                raise ValueError("Pick the days of the week.")
            self.weekdays = sorted(set(self.weekdays))
        return self


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
