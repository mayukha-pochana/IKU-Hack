# OWNER: Member 4
from pydantic import BaseModel, Field


class ParsedPrescription(BaseModel):
    """Fields are None when the prescription doesn't state them. NEVER invent values."""
    medication_name: str | None = None
    strength: str | None = None
    dose_instructions: str | None = None
    frequency: str | None = None            # once_daily | twice_daily | ...
    times: list[str] = Field(default_factory=list)   # "HH:MM"
    duration_days: int | None = Field(default=None, ge=1, le=3650)
    plain_language_summary: str | None = None
    uncertainties: list[str] = Field(default_factory=list)
