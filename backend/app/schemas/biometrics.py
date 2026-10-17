# OWNER: Member 4
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator


class CheckinCreate(BaseModel):
    heart_rate: float | None = Field(default=None, ge=20, le=250)
    breathing_rate: float | None = Field(default=None, ge=3, le=80)
    symptom_report: str | None = Field(default=None, max_length=2000)
    measurement_source: str            # "presage_sdk" or "none" (symptom-only)
    consent_given: bool

    @model_validator(mode="after")
    def _check(self):
        if not self.consent_given:
            raise ValueError("Consent is required to save a check-in.")
        if self.measurement_source != "presage_sdk" and (self.heart_rate or self.breathing_rate):
            raise ValueError("Vitals may only be saved when sourced from a real Presage measurement.")
        return self


class CheckinOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    heart_rate: float | None
    breathing_rate: float | None
    symptom_report: str | None
    measurement_source: str
    recorded_at: datetime
