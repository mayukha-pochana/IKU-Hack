# OWNER: Member 3 - local cache of recruiting trials (inspired by bulk-dataset approach; filled via scripts/sync_trials.py).
from datetime import datetime
from sqlalchemy import DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class TrialCache(Base):
    __tablename__ = "trials_cache"
    __table_args__ = (Index("ix_trials_cache_status", "status"),)
    nct_id: Mapped[str] = mapped_column(String, primary_key=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)
    search_text: Mapped[str] = mapped_column(Text, default="")   # lowercased title + conditions
    data: Mapped[dict] = mapped_column(JSONB)                    # serialized schemas.trials.Trial
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
