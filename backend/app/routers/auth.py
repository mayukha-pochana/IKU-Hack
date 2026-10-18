# OWNER: Member 3
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth.dependencies import SESSION_COOKIE, get_current_user
from app.auth.service import get_or_create_user
from app.core.config import settings
from app.core.errors import AppError
from app.core.security import make_magic_token, make_session_token, read_magic_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RequestLinkIn, SessionOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(resp: Response, user: User):
    resp.set_cookie(
        SESSION_COOKIE, make_session_token(str(user.id)), httponly=True, samesite="lax",
        secure=settings.app_env == "production", max_age=settings.session_max_age_seconds,
    )


@router.post("/request-link", status_code=202)
def request_link(body: RequestLinkIn):
    if not settings.email_provider_api_key:
        raise AppError("email_not_configured", "Magic link email is not configured. Use demo login if enabled.", 503)
    token = make_magic_token(body.email)
    # TODO(M3): send_magic_link(body.email, f"{settings.frontend_origin}/login/verify?token={token}")
    return {"status": "sent"}


@router.get("/verify")
def verify(token: str, response: Response, db: Session = Depends(get_db)):
    email = read_magic_token(token)
    if not email:
        raise AppError("invalid_token", "Link is invalid or expired.", 400)
    _set_cookie(response, get_or_create_user(db, email))
    return {"status": "ok"}


@router.post("/demo-login")
def demo_login(response: Response, db: Session = Depends(get_db)):
    """DEMO MODE ONLY - disabled unless DEMO_AUTH_ENABLED=true. Not production auth."""
    if not settings.demo_auth_enabled:
        raise AppError("demo_disabled", "Demo login is disabled.", 403)
    _set_cookie(response, get_or_create_user(db, "barbara.demo@example.com"))
    return {"status": "ok", "demo_mode": True}


@router.get("/session", response_model=SessionOut)
def session(user: User = Depends(get_current_user)):
    return SessionOut(authenticated=True, email=user.email, demo_mode=settings.demo_auth_enabled)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"status": "ok"}
