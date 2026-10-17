# OWNER: Member 3
from pydantic import BaseModel, EmailStr


class RequestLinkIn(BaseModel):
    email: EmailStr


class SessionOut(BaseModel):
    authenticated: bool
    email: str | None = None
    demo_mode: bool = False
