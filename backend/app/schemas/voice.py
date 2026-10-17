# OWNER: Member 4
import uuid
from pydantic import BaseModel


class VoiceExplainIn(BaseModel):
    kind: str                         # "medication" | "schedule" | "trial"
    medication_id: uuid.UUID | None = None
    nct_id: str | None = None
    language: str = "en"
