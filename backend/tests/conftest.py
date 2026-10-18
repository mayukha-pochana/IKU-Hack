# Mocks here are TEST doubles, not live sponsor integrations.
import pytest

SAMPLE_STUDY = {
    "protocolSection": {
        "identificationModule": {"nctId": "NCT00000001", "briefTitle": "Asthma Test Study"},
        "statusModule": {"overallStatus": "RECRUITING"},
        "descriptionModule": {"briefSummary": "A synthetic test summary."},
        "conditionsModule": {"conditions": ["Asthma"]},
        "designModule": {"phases": ["PHASE2"]},
        "armsInterventionsModule": {"interventions": [{"name": "Drug X"}]},
        "eligibilityModule": {
            "eligibilityCriteria": "Inclusion Criteria:\n- Adults\nExclusion Criteria:\n- Pregnancy",
            "minimumAge": "18 Years", "maximumAge": "65 Years",
        },
        "contactsLocationsModule": {"locations": [{"facility": "Test Hospital", "city": "London", "country": "United Kingdom"}]},
    }
}


@pytest.fixture
def sample_study():
    return SAMPLE_STUDY


# --- Real database for integration tests: SQLite with the shared models (JSONB rendered as JSON). ---
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.dialects.postgresql import JSONB  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402


@compiles(JSONB, "sqlite")
def _jsonb_on_sqlite(type_, compiler, **kw):
    return "JSON"


@pytest.fixture
def db(tmp_path):
    from app.db.base import Base
    import app.models  # noqa: F401  (registers every table)
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")

    @event.listens_for(engine, "connect")
    def _fk(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()
