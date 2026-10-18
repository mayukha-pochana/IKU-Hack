# OWNER: Member 4 - adaptive screening agent (incident.io "adaptable agents" track).
# agent_events is the per-patient stream the agent reacts to; trial_conclusions is its current belief per trial.
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAt, UUIDPk


class AgentEvent(UUIDPk, CreatedAt, Base):
    __tablename__ = "agent_events"
    __table_args__ = (Index("ix_agent_event_user_time", "user_id", "created_at"),)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    # medication_confirmed | profile_updated | checkin_recorded | correction | registry_refresh | trial_watched
    kind: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text)                       # human-readable "what happened"
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)       # e.g. parsed correction facts
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    changes: Mapped[list] = mapped_column(JSONB, default=list)       # conclusion changes this event caused


class TrialConclusion(UUIDPk, Base):
    __tablename__ = "trial_conclusions"
    __table_args__ = (UniqueConstraint("user_id", "nct_id", name="uq_conclusion_user_trial"),)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
                                               index=True)
    nct_id: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)                      # MatchStatus value
    previous_status: Mapped[str | None] = mapped_column(String, nullable=True)
    reason: Mapped[str] = mapped_column(Text)                        # why the latest status was reached / changed
    criteria: Mapped[list] = mapped_column(JSONB, default=list)      # CriterionAssessment dumps
    record_hash: Mapped[str] = mapped_column(String)                 # the facts this conclusion was based on
    provisional: Mapped[bool] = mapped_column(Boolean, default=False)  # True when Gemini was unavailable
    changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # last status change
    seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)     # patient viewed it
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(),
                                                 onupdate=func.now())
