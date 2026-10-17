# OWNER: Member 4. Never store raw video.
import uuid
from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDPk


class HealthCheckin(UUIDPk, Base):
    __tablename__ = "health_checkins"
    __table_args__ = (Index("ix_checkin_user_time", "user_id", "recorded_at"),)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    heart_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    breathing_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    symptom_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    measurement_source: Mapped[str] = mapped_column(String)  # e.g. "presage_sdk" | "none"
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
