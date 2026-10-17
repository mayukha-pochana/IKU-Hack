# OWNER: Member 3
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user import User


def get_or_create_user(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if not user:
        user = User(email=email.lower())
        db.add(user)
        db.commit()
    return user


def send_magic_link(email: str, link: str) -> None:
    """TODO(M3): call configured email provider. If not configured, raise AppError
    so the API never pretends an email was sent."""
    raise NotImplementedError
