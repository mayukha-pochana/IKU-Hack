# OWNER: Member 3
import uuid
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, CreatedAt, UUIDPk


class TrialBookmark(UUIDPk, CreatedAt, Base):
    __tablename__ = "trial_bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "nct_id"),)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    nct_id: Mapped[str] = mapped_column(String)
