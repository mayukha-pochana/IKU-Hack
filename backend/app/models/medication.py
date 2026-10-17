# OWNER: Member 4 (register in models/__init__.py via Member 3). Only CONFIRMED medications are stored.
import uuid
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, CreatedAt, UUIDPk


class Medication(UUIDPk, CreatedAt, Base):
    __tablename__ = "medications"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String)
    strength: Mapped[str | None] = mapped_column(String, nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    frequency: Mapped[str | None] = mapped_column(String, nullable=True)
    confirmed_schedule: Mapped[dict] = mapped_column(JSONB, default=dict)  # {times:[], duration_days:int, timezone:str}
