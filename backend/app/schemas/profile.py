# OWNER: Member 3
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=0, le=120)
    conditions: list[str] = []
    location: str | None = None
    preferred_language: str = "en"


class ProfileOut(ProfileUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
