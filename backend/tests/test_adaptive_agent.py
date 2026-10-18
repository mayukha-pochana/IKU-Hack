# Adaptive screening agent (incident.io track). Real SQLite database; Gemini and the registry are mocked HTTP
# test doubles, scripted to answer from whatever patient record the agent sends.
import copy
import json
import uuid
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.patient import PatientProfile
from app.models.user import User
from app.services.agent import engine
from app.services.trials import simplify
from conftest import SAMPLE_STUDY

USER = SimpleNamespace(id=uuid.UUID("bbbbbbbb-2222-4222-8222-222222222222"), email="barbra.demo@example.com")
REAL_CLIENT = httpx.AsyncClient
NCT = "NCT00000042"
CRITERIA = "Inclusion Criteria:\n- Adults with asthma\nExclusion Criteria:\n- Insulin use in the last 3 months"
VITALS_CRITERIA = CRITERIA + "\n- Resting heart rate above 100 beats per minute"


def study(status="RECRUITING", criteria=CRITERIA):
    s = copy.deepcopy(SAMPLE_STUDY)
    s["protocolSection"]["identificationModule"].update(nctId=NCT, briefTitle="Asthma Study B")
    s["protocolSection"]["statusModule"]["overallStatus"] = status
    s["protocolSection"]["eligibilityModule"]["eligibilityCriteria"] = criteria
    return s


def gemini(payload):
    return httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [
        {"text": json.dumps(payload)}]}}]})


def screening_for(record, sensor_conflict=False):
    """Scripted Gemini: answers the insulin exclusion from the record it was sent, like the real prompt asks."""
    on_insulin = any(m["name"].lower() == "insulin" for m in record["confirmed_medications"])
    criteria = [{"kind": "inclusion", "original_text": "Adults with asthma", "plain_text": "Adults with asthma",
                 "applies_to_patient": "YES", "evidence": "conditions: Asthma", "evidence_source": "profile",
                 "question_for_coordinator": None},
                {"kind": "exclusion", "original_text": "Insulin use in the last 3 months",
                 "plain_text": "You cannot have used insulin in the last 3 months",
                 "applies_to_patient": "YES" if on_insulin else "NO",
                 "evidence": "confirmed_medications: Insulin" if on_insulin else "not in confirmed_medications",
                 "evidence_source": "medication", "question_for_coordinator": None}]
    if sensor_conflict:
        criteria.append({"kind": "exclusion", "original_text": "Resting heart rate above 100 beats per minute",
                         "plain_text": "Your resting heart rate must not be above 100",
                         "applies_to_patient": "YES", "evidence": "heart_rate_bpm: 130",
                         "evidence_source": "sensor_reading", "question_for_coordinator": "Confirm heart rate"})
    return {"plain_summary": "Tests a new asthma inhaler.", "criteria": criteria,
            "questions_to_ask": ["How many visits?"], "missing_profile_fields": []}


@pytest.fixture
def world(db, monkeypatch):
    """Patient + mocked registry and Gemini. Tweak world.registry_status / world.gemini_down / world.sensor."""
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(settings, "gemini_model", "test-model")
    monkeypatch.setattr("app.services.gemini.client.RETRY_DELAY_SECONDS", 0)
    simplify._cache.clear()
    db.add(User(id=USER.id, email=USER.email))
    db.commit()
    db.add(PatientProfile(user_id=USER.id, display_name="Synthetic Barbra", age=28, conditions=["Asthma"],
                          location="London"))
    db.commit()
    state = SimpleNamespace(registry_status="RECRUITING", criteria=CRITERIA, gemini_down=False, sensor=False,
                            screenings=0,
                            correction_facts=[{"type": "medication_stopped", "value": "Insulin"}])

    def handler(request):
        if request.url.host == "clinicaltrials.gov":
            return httpx.Response(200, json=study(state.registry_status, state.criteria))
        if state.gemini_down:
            return httpx.Response(503)
        prompt = json.loads(request.content)["contents"][0]["parts"][0]["text"]
        if "<correction>" in prompt:
            return gemini({"facts": state.correction_facts})
        state.screenings += 1
        record = json.loads(prompt.rsplit("<patient_record>", 1)[1].split("</patient_record>")[0])
        assert "Synthetic Barbra" not in prompt and USER.email not in prompt
        return gemini(screening_for(record, state.sensor))
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: REAL_CLIENT(transport=httpx.MockTransport(handler), **kw))
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[get_db] = lambda: db
    state.client = TestClient(app)
    yield state
    app.dependency_overrides.clear()


def confirm_insulin(client):
    r = client.post("/api/medications", json={"name": "Insulin", "strength": "10 units",
                                              "schedule": {"times": ["09:00"], "duration_days": 1}})
    assert r.status_code == 201, r.text


def conclusion(client):
    body = client.get("/api/agent/conclusions").json()
    return body, next(c for c in body["conclusions"] if c["nct_id"] == NCT)


def test_new_fact_flips_conclusion_and_correction_flips_it_back(world):
    first = world.client.post(f"/api/trials/{NCT}/explain").json()
    assert first["status"] == "POTENTIAL_MATCH"

    confirm_insulin(world.client)                       # new stream data
    _, c = conclusion(world.client)
    assert c["status"] == "KNOWN_CRITERIA_MISMATCH" and c["previous_status"] == "POTENTIAL_MATCH"
    assert "may not fit you" in c["reason"] and "insulin" in c["reason"].lower()

    r = world.client.post("/api/agent/corrections", json={"text": "I stopped insulin last year"})  # corrected assumption
    assert r.status_code == 200, r.text
    body, c = conclusion(world.client)
    assert c["status"] == "POTENTIAL_MATCH" and c["previous_status"] == "KNOWN_CRITERIA_MISMATCH"
    conflict = next(x for x in body["conflicts"] if x["topic"] == "Medication: Insulin")
    assert conflict["kept"].startswith("Not taking (your correction") and conflict["rule"] == "Your most recent statement wins."

    timeline = world.client.get("/api/agent/timeline").json()
    assert [e["kind"] for e in timeline][:3] == ["correction", "medication_confirmed", "trial_watched"]
    assert timeline[0]["changes"][0]["to"] == "POTENTIAL_MATCH"
    assert timeline[1]["changes"][0]["to"] == "KNOWN_CRITERIA_MISMATCH"


def test_sensor_reading_cannot_rule_patient_out(world):
    world.criteria = VITALS_CRITERIA
    world.client.post(f"/api/trials/{NCT}/explain")
    world.sensor = True
    r = world.client.post("/api/health-checkins", json={"heart_rate": 130, "measurement_source": "presage_sdk",
                                                        "consent_given": True})
    assert r.status_code == 201, r.text
    _, c = conclusion(world.client)
    assert c["status"] == "MORE_INFORMATION_NEEDED"      # sensor-only "NO" became "ask", never "mismatch"
    explained = world.client.post(f"/api/trials/{NCT}/explain").json()
    sensor = [x for x in explained["criteria"] if x["evidence_source"] == "sensor_reading"][0]
    assert sensor["effect"] == "unknown" and "sensor" in sensor["note"]


def test_gemini_outage_gives_provisional_answer_instead_of_stalling(world):
    world.client.post(f"/api/trials/{NCT}/explain")
    world.gemini_down = True
    confirm_insulin(world.client)
    _, c = conclusion(world.client)
    assert c["provisional"] is True and "double-check this shortly" in c["reason"]
    assert c["status"] == "POTENTIAL_MATCH"              # kept prior criteria; deterministic checks still ran

    world.gemini_down = False                           # next event recovers and catches up
    world.client.post("/api/agent/refresh")
    _, c = conclusion(world.client)
    assert c["provisional"] is False and c["status"] == "KNOWN_CRITERIA_MISMATCH"


def test_registry_change_is_picked_up(world):
    world.client.post(f"/api/trials/{NCT}/explain")
    world.registry_status = "COMPLETED"
    body = world.client.post("/api/agent/refresh").json()
    c = next(x for x in body["conclusions"] if x["nct_id"] == NCT)
    assert c["status"] == "KNOWN_CRITERIA_MISMATCH" and "no longer recruiting" in c["reason"]


def test_events_are_coalesced_into_one_screening(world):
    world.client.post(f"/api/trials/{NCT}/explain")
    before = world.screenings
    confirm_insulin(world.client)
    world.client.put("/api/profile", json={"display_name": "Synthetic Barbra", "age": 29, "conditions": ["Asthma"],
                                           "location": "London"})
    body, _ = conclusion(world.client)
    assert len(body["handled_events"]) == 2
    assert world.screenings - before == 1                # one Gemini call for the batch, not one per event
    assert body["handled_events"][-1]["changes"] and not body["handled_events"][0]["changes"]


def test_unparseable_correction_is_kept_as_note(world):
    world.gemini_down = True
    r = world.client.post("/api/agent/corrections", json={"text": "my doctor changed something last week"})
    assert r.status_code == 200
    event = world.client.get("/api/agent/timeline").json()[0]
    assert event["kind"] == "correction" and "kept as a note" in event["summary"]


def test_checkin_skips_trials_that_do_not_use_vitals(world):
    world.client.post(f"/api/trials/{NCT}/explain")     # criteria say nothing about heart or breathing rate
    before = world.screenings
    world.client.post("/api/health-checkins", json={"heart_rate": 72, "breathing_rate": 14,
                                                    "measurement_source": "presage_sdk", "consent_given": True})
    body, c = conclusion(world.client)
    assert world.screenings == before                   # no Gemini call for an irrelevant reading
    assert c["status"] == "POTENTIAL_MATCH"
    assert "None of your watched trials depend on these readings" in body["handled_events"][0]["summary"]
    world.client.post("/api/health-checkins", json={"heart_rate": 75, "measurement_source": "presage_sdk",
                                                    "consent_given": True})
    world.client.get("/api/agent/conclusions")
    assert world.screenings == before                   # stays quiet day after day


def test_patient_facing_update_flow(world):
    """Dashboard notice -> trial card with reason and one-tap fix -> fix applied -> notice clears."""
    world.client.post(f"/api/trials/{NCT}/explain")
    assert world.client.get("/api/agent/updates").json()["new_count"] == 0   # opening a trial isn't news

    confirm_insulin(world.client)
    updates = world.client.get("/api/agent/updates").json()
    assert updates["new_count"] == 1
    u = updates["updates"][0]
    assert (u["nct_id"], u["label"], u["previous_label"], u["is_new"]) == (
        NCT, "Not a fit right now", "Could be a fit", True)
    fix = u["fix_options"][0]
    assert fix == {"label": "I stopped taking Insulin", "facts": [{"type": "medication_stopped", "value": "Insulin"}]}

    world.client.get("/api/profile")   # the trial list shows the same update, worst fits last
    matches_update = world.client.post(f"/api/trials/{NCT}/explain").json()["update"]
    assert matches_update["label"] == "Not a fit right now" and matches_update["fix_options"][0] == fix

    r = world.client.post("/api/agent/corrections", json={**fix})   # one tap, no Gemini parse
    assert r.status_code == 200, r.text
    u = world.client.get("/api/agent/updates").json()["updates"][0]
    assert u["label"] == "Could be a fit" and u["previous_label"] == "Not a fit right now"
    assert u["fix_options"][0]["label"] == "I'm taking Insulin again"     # undo is one tap too
    timeline = world.client.get("/api/agent/timeline").json()
    assert timeline[0]["summary"] == "You told us: I stopped taking Insulin"

    assert world.client.post("/api/agent/updates/seen", json={"nct_ids": [NCT]}).status_code == 204
    assert world.client.get("/api/agent/updates").json()["new_count"] == 0


def test_matches_carry_agent_update_and_sort_best_first(world, monkeypatch):
    from app.schemas.trials import MatchStatus, Trial, TrialMatch
    from app.services.trials import cache
    world.client.post(f"/api/trials/{NCT}/explain")
    confirm_insulin(world.client)
    other = Trial(nct_id="NCT00000077", title="Other asthma study", status="RECRUITING", conditions=["Asthma"],
                  min_age="18 Years", max_age="65 Years", url="https://clinicaltrials.gov/study/NCT00000077")
    watched_trial = Trial(nct_id=NCT, title="Asthma Study B", status="RECRUITING", conditions=["Asthma"],
                          min_age="18 Years", max_age="65 Years", url=f"https://clinicaltrials.gov/study/{NCT}")
    monkeypatch.setattr(cache, "search_cached", lambda db, term, limit: [watched_trial, other])
    body = world.client.get("/api/trials/matches").json()
    assert [m["trial"]["nct_id"] for m in body] == ["NCT00000077", NCT]      # the trial that no longer fits drops
    assert body[1]["status"] == "KNOWN_CRITERIA_MISMATCH" and body[1]["update"]["is_new"] is True
    assert body[0]["update"] is None


def test_correction_needs_text_or_facts(world):
    assert world.client.post("/api/agent/corrections", json={}).status_code == 422


def test_checkin_without_consent_is_a_clear_422(world):
    r = world.client.post("/api/health-checkins", json={"measurement_source": "none", "consent_given": False})
    assert r.status_code == 422 and "Consent is required" in r.json()["error"]["details"]["errors"][0]["msg"]
