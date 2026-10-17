# OWNER: Member 3 - Member 4 imports `get_current_user`; never trust a client-supplied user id.
import uuid
from fastapi import Cookie, Depends
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import read_session_token
from app.db.session import get_db
from app.models.user import User

SESSION_COOKIE = "careflow_session"


def get_current_user(
    token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User:
    uid = read_session_token(token) if token else None
    user = db.get(User, uuid.UUID(uid)) if uid else None
    if not user:
        raise AppError("unauthenticated", "Please sign in.", 401)
    return user
