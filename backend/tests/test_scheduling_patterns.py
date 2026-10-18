# Schedule patterns, local day boundaries, multi-photo parsing and as-needed logging. Gemini is a mocked HTTP double.
import json
import uuid
from datetime import date, datetime, timezone
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.dose_event import DoseEvent
from app.models.medication import Medication
from app.models.user import User
from app.routers.schedule import local_midnight
from app.schemas.medications import ConfirmedSchedule
from app.services.scheduling.generator import generate_dose_times

LONDON = ZoneInfo("Europe/London")
ME = SimpleNamespace(id=uuid.UUID("dddddddd-4444-4444-8444-444444444444"), email="barbra.demo@example.com")
OTHER = uuid.UUID("eeeeeeee-5555-4555-8555-555555555555")
REAL_CLIENT = httpx.AsyncClient


# --- generator -----------------------------------------------------------------------------------------
def test_daily_every_n_days_weekly_and_as_needed():
    start = date(2026, 10, 19)  # a Monday
    daily = generate_dose_times(["20:00", "08:00"], 3, "Europe/London", start)
    assert [d.strftime("%a %H:%M") for d in daily] == ["Mon 08:00", "Mon 20:00", "Tue 08:00", "Tue 20:00",
                                                         "Wed 08:00", "Wed 20:00"]
    every2 = generate_dose_times(["09:00"], 7, "Europe/London", start, "every_n_days", interval_days=2)
    assert [d.day for d in every2] == [19, 21, 23, 25]
    weekly = generate_dose_times(["10:00"], 14, "Europe/London", start, "weekly", weekdays=[0, 3])
    assert [d.strftime("%a %d") for d in weekly] == ["Mon 19", "Thu 22", "Mon 26", "Thu 29"]
    assert generate_dose_times([], 30, "Europe/London", start, "as_needed") == []


def test_wall_clock_time_survives_the_clocks_going_back():
    # UK clocks go back on 25 Oct 2026: 08:00 local stays 08:00, so the UTC instant shifts by an hour.
    doses = generate_dose_times(["08:00"], 2, "Europe/London", date(2026, 10, 24))
    assert [d.strftime("%H:%M") for d in doses] == ["08:00", "08:00"]
    assert [d.astimezone(timezone.utc).hour for d in doses] == [7, 8]


def test_local_midnight_uses_the_patient_timezone():
    # 23:30 UTC on 18 Oct is already 19 Oct 00:30 in London (BST), so "today" starts at 23:00 UTC on the 18th.
    now = datetime(2026, 10, 18, 23, 30, tzinfo=timezone.utc)
    start = local_midnight(LONDON, now)
    assert start.astimezone(timezone.utc) == datetime(2026, 10, 18, 23, 0, tzinfo=timezone.utc)


def test_schedule_validation():
    assert ConfirmedSchedule(times=["20:00", "08:00", "08:00"], duration_days=5).times == ["08:00", "20:00"]
    assert ConfirmedSchedule(pattern="as_needed", duration_days=30).times == []
    for bad in [dict(times=[], duration_days=5), dict(times=["8am"], duration_days=5),
                dict(pattern="every_n_days", times=["08:00"], duration_days=5),
                dict(pattern="weekly", times=["08:00"], duration_days=5, weekdays=[7]),
                dict(times=["08:00"], duration_days=5, timezone="Mars/Olympus")]:
        with pytest.raises(ValidationError):
            ConfirmedSchedule(**bad)


# --- API -----------------------------------------------------------------------------------------------
@pytest.fixture
def client(db, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(settings, "gemini_model", "test-model")
    monkeypatch.setattr("app.services.gemini.client.RETRY_DELAY_SECONDS", 0)
    db.add_all([User(id=ME.id, email=ME.email), User(id=OTHER, email="other@example.com")])
    db.commit()
    app.dependency_overrides[get_current_user] = lambda: ME
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


def mock_gemini(monkeypatch, record):
    def handler(request):
        record.append(json.loads(request.content))
        result = {"medication_name": "Salbutamol", "strength": "100 mcg", "dose_instructions": "2 puffs when needed",
                  "frequency": "as_needed", "times": [], "duration_days": None, "uncertainties": []}
        return httpx.Response(200, json={"candidates": [{"finishReason": "STOP",
                                                         "content": {"parts": [{"text": json.dumps(result)}]}}]})
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: REAL_CLIENT(transport=httpx.MockTransport(handler), **kw))


def test_parse_accepts_one_to_three_photos_in_one_gemini_call(client, monkeypatch):
    calls = []
    mock_gemini(monkeypatch, calls)
    one = client.post("/api/prescriptions/parse", files={"file": ("a.png", b"img-a", "image/png")})
    assert one.status_code == 200, one.text
    three = client.post("/api/prescriptions/parse", files=[("files", (f"{n}.jpg", b"img", "image/jpeg")) for n in "abc"])
    assert three.status_code == 200, three.text
    assert len(calls) == 2
    parts = calls[1]["contents"][0]["parts"]
    assert len([p for p in parts if "inlineData" in p]) == 3 and "same bottle" in parts[0]["text"]
    assert three.json()["times"] == []          # never invented


def test_parse_rejects_bad_photo_sets(client, monkeypatch):
    mock_gemini(monkeypatch, [])
    four = client.post("/api/prescriptions/parse", files=[("files", (f"{n}.jpg", b"img", "image/jpeg")) for n in "abcd"])
    assert four.status_code == 413
    assert client.post("/api/prescriptions/parse", files={"file": ("a.gif", b"gif", "image/gif")}).status_code == 415
    assert client.post("/api/prescriptions/parse", files={"file": ("a.png", b"", "image/png")}).status_code == 422


def create(client, **schedule):
    body = {"name": "Salbutamol", "strength": "100 mcg", "instructions": "2 puffs", "frequency": "as needed",
            "schedule": {"duration_days": 14, "timezone": "Europe/London", **schedule}}
    r = client.post("/api/medications", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_weekly_medication_generates_only_its_days(client, db):
    med = create(client, pattern="weekly", times=["10:00"], weekdays=[0])
    doses = db.query(DoseEvent).filter(DoseEvent.medication_id == uuid.UUID(med["id"])).all()
    assert len(doses) == 2 and med["confirmed_schedule"]["pattern"] == "weekly"


def test_as_needed_doses_are_logged_when_taken(client, db):
    med = create(client, pattern="as_needed", times=[])
    assert db.query(DoseEvent).count() == 0
    r = client.post(f"/api/medications/{med['id']}/doses")
    assert r.status_code == 201 and r.json()["status"] == "TAKEN" and r.json()["confirmed_at"]
    assert [d["medication_name"] for d in client.get("/api/schedule/today").json()] == ["Salbutamol"]


def test_cannot_log_doses_for_scheduled_or_someone_elses_medicine(client, db):
    daily = create(client, times=["08:00"])
    assert client.post(f"/api/medications/{daily['id']}/doses").status_code == 409
    theirs = Medication(user_id=OTHER, name="Theirs", frequency=None,
                        confirmed_schedule={"pattern": "as_needed", "times": [], "duration_days": 5})
    db.add(theirs)
    db.commit()
    assert client.post(f"/api/medications/{theirs.id}/doses").status_code == 404


def test_week_covers_monday_to_sunday(client):
    create(client, times=["12:00"], duration_days=21)
    days = {datetime.fromisoformat(d["scheduled_at"]).astimezone(LONDON).date()
            for d in client.get("/api/schedule/week").json()}
    assert all(d.isocalendar()[1] == datetime.now(LONDON).isocalendar()[1] for d in days)


def test_adherence_history_counts_the_last_seven_local_days(client, db):
    from datetime import timedelta
    med = create(client, times=["08:00"], duration_days=1)
    now = datetime.now(timezone.utc)
    for days_ago, status in [(1, "TAKEN"), (1, "MISSED"), (3, "TAKEN"), (9, "TAKEN")]:
        db.add(DoseEvent(medication_id=uuid.UUID(med["id"]), user_id=ME.id, scheduled_at=now - timedelta(days=days_ago),
                         status=status))
    db.commit()
    hist = client.get("/api/adherence/history").json()
    assert len(hist) == 7 and hist[-1]["day"] == datetime.now(LONDON).date().isoformat()
    yesterday = hist[-2]
    assert (yesterday["scheduled"], yesterday["taken"], yesterday["missed"]) == (2, 1, 1)
    assert sum(d["scheduled"] for d in hist[:-1]) == 3   # the dose from 9 days ago is outside the window
