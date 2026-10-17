# OWNER: Member 3
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, CreatedAt, UUIDPk


class User(UUIDPk, CreatedAt, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
