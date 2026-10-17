# OWNER: Member 3 - signed tokens for sessions and magic links.
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from app.core.config import settings

_session = URLSafeTimedSerializer(settings.session_secret, salt="session")
_magic = URLSafeTimedSerializer(settings.session_secret, salt="magic-link")


def make_session_token(user_id: str) -> str:
    return _session.dumps({"uid": user_id})


def read_session_token(token: str) -> str | None:
    try:
        return _session.loads(token, max_age=settings.session_max_age_seconds)["uid"]
    except (BadSignature, SignatureExpired):
        return None


def make_magic_token(email: str) -> str:
    return _magic.dumps({"email": email})


def read_magic_token(token: str, max_age: int = 15 * 60) -> str | None:
    try:
        return _magic.loads(token, max_age=max_age)["email"]
    except (BadSignature, SignatureExpired):
        return None
