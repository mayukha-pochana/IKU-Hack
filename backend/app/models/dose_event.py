# OWNER: Member 4. TODO(M3+M4): convert to Timescale hypertable on scheduled_at when available.
import enum
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDPk


class DoseStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    TAKEN = "TAKEN"
    MISSED = "MISSED"
    SKIPPED = "SKIPPED"


class DoseEvent(UUIDPk, Base):
    __tablename__ = "dose_events"
    __table_args__ = (Index("ix_dose_user_time", "user_id", "scheduled_at"),)
    medication_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medications.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String, default=DoseStatus.SCHEDULED.value)  # patient-reported
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
