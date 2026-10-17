# OWNER: Member 3 (mounts ALL routers, including Member 4's).
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.routers import (
    auth, profile, trials,                                   # Member 3
    prescriptions, medications, schedule, adherence,         # Member 4
    biometrics, voice,                                       # Member 4
)

app = FastAPI(title="CareFlow AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Trials-Source"],
)
register_error_handlers(app)

for r in (auth, profile, trials, prescriptions, medications, schedule, adherence, biometrics, voice):
    app.include_router(r.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
