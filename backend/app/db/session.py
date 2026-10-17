# OWNER: Member 3 - the ONLY engine/session in the app. Others import get_db.
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def enable_timescale_if_available(db) -> bool:
    """TODO(M3): try CREATE EXTENSION timescaledb + create_hypertable for dose_events /
    health_checkins. Return False and continue on plain Postgres."""
    return False
