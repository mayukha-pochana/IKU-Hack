# OWNER: Member 4
import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.dose_event import DoseStatus


class DoseOut(BaseModel):
    id: uuid.UUID
    medication_id: uuid.UUID
    medication_name: str
    scheduled_at: datetime
    status: DoseStatus
    confirmed_at: datetime | None = None


class DoseStatusUpdate(BaseModel):
    status: DoseStatus   # patient-reported; not verified ingestion
