# Gemini + Snowflake + ElevenLabs side-track integrations. HTTP is mocked: these are TEST doubles, not live calls.
import copy
import json
import uuid
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.errors import AppError
from app.db.session import get_db
from app.main import app
from app.models.medication import Medication
from app.models.patient import PatientProfile
from app.models.user import User
from app.services.gemini.client import gemini_schema
from app.services.gemini.prescription_parser import parse_prescription_image
from app.services.trials import simplify
from conftest import SAMPLE_STUDY

USER = SimpleNamespace(id=uuid.UUID("aaaaaaaa-1111-4111-8111-111111111111"), email="maya.demo@example.com")
REAL_CLIENT = httpx.AsyncClient


def study(nct_id="NCT00000001", min_age="18 Years"):
    s = copy.deepcopy(SAMPLE_STUDY)
    s["protocolSection"]["identificationModule"]["nctId"] = nct_id
    s["protocolSection"]["eligibilityModule"]["minimumAge"] = min_age
    return s


@pytest.fixture
def seed(db):
    """Insert the synthetic patient (and optional profile/medications) into the real test database."""
    def make(profile=True, meds=(), **changes):
        if db.get(User, USER.id) is None:
            db.add(User(id=USER.id, email=USER.email))
            db.commit()
        if profile:
            db.add(PatientProfile(**(dict(user_id=USER.id, display_name="Synthetic Maya", age=28,
                                          conditions=["Asthma"], location="London") | changes)))
        for med in meds:
            db.add(Medication(user_id=USER.id, frequency=None, confirmed_schedule={}, **med))
        db.commit()
        return db
    return make


@pytest.fixture
def mock_http(monkeypatch):
    def install(handler):
        monkeypatch.setattr(httpx, "AsyncClient",
                            lambda **kw: REAL_CLIENT(transport=httpx.MockTransport(handler), **kw))
    return install


@pytest.fixture(autouse=True)
def isolated_settings(monkeypatch):
    for name, value in dict(gemini_api_key="test-key", gemini_model="test-model", elevenlabs_api_key="",
                            elevenlabs_voice_id="", snowflake_account_url="", snowflake_pat="").items():
        monkeypatch.setattr(settings, name, value)
    monkeypatch.setattr("app.services.gemini.client.RETRY_DELAY_SECONDS", 0)
    simplify._cache.clear()


def client_for(db):
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def medication():
    return dict(name="Salbutamol", strength="100 mcg", instructions="Two puffs when needed")


def gemini_ok(payload):
    return httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [
        {"text": "thinking", "thought": True}, {"text": json.dumps(payload)}]}}]})


def explanation(criteria):
    return {"plain_summary": "This study tests Drug X for asthma.", "criteria": criteria,
            "questions_to_ask": ["How many visits?"], "missing_profile_fields": ["Pregnancy status"]}


def criterion(kind, text, applies, evidence=None):
    return {"kind": kind, "original_text": text, "plain_text": text.lower(), "applies_to_patient": applies,
            "evidence": evidence, "question_for_coordinator": None if applies != "UNKNOWN" else "Please confirm."}


def test_gemini_schema_removes_keywords_gemini_rejects():
    from app.schemas.trials import GeminiTrialExplanation
    sent = json.dumps(gemini_schema(GeminiTrialExplanation.model_json_schema()))
    assert "$ref" not in sent and "$defs" not in sent and "maxItems" not in sent
    assert "applies_to_patient" in sent


async def test_prescription_uses_image_and_structured_output(mock_http):
    def handler(request):
        assert request.url.path == "/v1beta/models/test-model:generateContent"
        assert request.headers["x-goog-api-key"] == "test-key"
        body = json.loads(request.content)
        assert body["contents"][0]["parts"][1]["inlineData"]["mimeType"] == "image/png"
        assert body["generationConfig"]["responseJsonSchema"]["type"] == "object"
        return gemini_ok({"medication_name": "ExampleMed", "times": [], "uncertainties": []})
    mock_http(handler)
    parsed = await parse_prescription_image(b"png-bytes", "image/png")
    assert parsed.medication_name == "ExampleMed"
    assert any("frequency" in u for u in parsed.uncertainties)


async def test_gemini_unconfigured_and_incomplete_are_errors(mock_http, monkeypatch):
    mock_http(lambda request: httpx.Response(200, json={"candidates": [{"finishReason": "MAX_TOKENS",
                                                                          "content": {"parts": [{"text": "{}"}]}}]}))
    with pytest.raises(AppError) as e:
        await parse_prescription_image(b"x", "image/png")
    assert e.value.status_code == 502
    monkeypatch.setattr(settings, "gemini_model", "")
    with pytest.raises(AppError) as e:
        await parse_prescription_image(b"x", "image/png")
    assert e.value.status_code == 503


def test_explain_rolls_up_deterministically_and_caches(seed, mock_http):
    calls = []
    def handler(request):
        if request.url.host == "clinicaltrials.gov":
            return httpx.Response(200, json=study())
        calls.append(request)
        prompt = json.loads(request.content)["contents"][0]["parts"][0]["text"]
        assert "untrusted" in prompt and "Salbutamol" in prompt
        assert "Synthetic Maya" not in prompt and USER.email not in prompt
        return gemini_ok(explanation([criterion("inclusion", "Adults", "YES", "age: 28"),
                                      criterion("exclusion", "Pregnancy", "UNKNOWN")]))
    mock_http(handler)
    client = client_for(seed(meds=[medication()]))
    r = client.post("/api/trials/NCT00000001/explain")
    assert r.status_code == 200, r.text
    body = r.json()
    assert [c["effect"] for c in body["criteria"]] == ["supports", "unknown"]
    assert all(c["quote_verified"] for c in body["criteria"])
    assert body["status"] == "MORE_INFORMATION_NEEDED"
    assert "Eligibility is decided by the study team" in body["disclaimer"]
    assert client.post("/api/trials/NCT00000001/explain").json() == body
    assert len(calls) == 1


@pytest.mark.parametrize("text, expected", [
    ("Invented exclusion that is not in the study", "MORE_INFORMATION_NEEDED"),  # unverifiable -> ask, never reject
    ("Pregnancy", "KNOWN_CRITERIA_MISMATCH"),                                    # verified conflict
])
def test_only_verified_conflicts_mark_mismatch(seed, mock_http, text, expected):
    mock_http(lambda request: httpx.Response(200, json=study()) if request.url.host == "clinicaltrials.gov"
              else gemini_ok(explanation([criterion("exclusion", text, "YES", "conditions")])))
    body = client_for(seed()).post("/api/trials/NCT00000001/explain").json()
    assert body["criteria"][0]["effect"] == "conflicts"
    assert body["status"] == expected


def test_explain_validates_id_and_reports_unconfigured_gemini(seed, mock_http, monkeypatch):
    client = client_for(seed())
    assert client.post("/api/trials/not-an-id/explain").status_code == 422
    monkeypatch.setattr(settings, "gemini_api_key", "")
    mock_http(lambda request: httpx.Response(200, json=study()))
    r = client.post("/api/trials/NCT00000001/explain")
    assert r.status_code == 503 and r.json()["error"]["code"] == "gemini_not_configured"


def test_matches_use_snowflake_cortex_when_configured(seed, mock_http, monkeypatch):
    monkeypatch.setattr(settings, "snowflake_account_url", "https://example-acct.snowflakecomputing.com")
    monkeypatch.setattr(settings, "snowflake_pat", "test-pat")
    def handler(request):
        if request.url.host == "example-acct.snowflakecomputing.com":
            assert request.url.path == "/api/v2/databases/CAREFLOW/schemas/TRIALS/cortex-search-services/TRIAL_SEARCH:query"
            assert request.headers["authorization"] == "Bearer test-pat"
            assert request.headers["x-snowflake-authorization-token-type"] == "PROGRAMMATIC_ACCESS_TOKEN"
            body = json.loads(request.content)
            assert "Asthma" in body["query"] and "Salbutamol" in body["query"] and "20-29 year old" in body["query"]
            assert "Synthetic Maya" not in body["query"]
            assert body["filter"] == {"@eq": {"status": "RECRUITING"}}
            return httpx.Response(200, json={"results": [{"nct_id": "NCT00000009", "ai_summary": "Summary B"},
                                                         {"nct_id": "NCT00000008", "ai_summary": "Summary A"}]})
        assert request.url.params["filter.ids"] == "NCT00000009,NCT00000008"
        return httpx.Response(200, json={"studies": [study("NCT00000008"), study("NCT00000009")]})
    mock_http(handler)
    r = client_for(seed(meds=[medication()])).get("/api/trials/matches")
    assert r.status_code == 200, r.text
    assert r.headers["x-trials-source"] == "snowflake_cortex"
    assert [m["trial"]["nct_id"] for m in r.json()] == ["NCT00000009", "NCT00000008"]  # Cortex order kept
    assert r.json()[0]["plain_language_summary"] == "Summary B"


def test_snowflake_failure_falls_back_to_existing_search(seed, mock_http, monkeypatch):
    monkeypatch.setattr(settings, "snowflake_account_url", "https://example-acct.snowflakecomputing.com")
    monkeypatch.setattr(settings, "snowflake_pat", "test-pat")
    mock_http(lambda request: httpx.Response(500) if "snowflakecomputing" in request.url.host
              else httpx.Response(200, json={"studies": [study("NCT00000003")]}))
    r = client_for(seed()).get("/api/trials/search", params={"q": "asthma"})
    assert r.status_code == 200
    assert r.headers["x-trials-source"] == "live"
    assert r.json()[0]["nct_id"] == "NCT00000003"


def test_voice_reads_gemini_trial_summary(seed, mock_http, monkeypatch):
    monkeypatch.setattr(settings, "elevenlabs_api_key", "test-key")
    monkeypatch.setattr(settings, "elevenlabs_voice_id", "test-voice")
    def handler(request):
        if request.url.host == "clinicaltrials.gov":
            return httpx.Response(200, json=study())
        if request.url.host == "api.elevenlabs.io":
            assert request.url.path == "/v1/text-to-speech/test-voice"
            text = json.loads(request.content)["text"]
            assert "Drug X for asthma" in text and "study team decides" in text
            return httpx.Response(200, content=b"mp3", headers={"content-type": "audio/mpeg"})
        return gemini_ok(explanation([criterion("inclusion", "Adults", "YES", "age")]))
    mock_http(handler)
    r = client_for(seed()).post("/api/voice/explain", json={"kind": "trial", "nct_id": "NCT00000001"})
    assert r.status_code == 200 and r.content == b"mp3"


def test_voice_medication_uses_saved_instructions(seed, mock_http, monkeypatch):
    monkeypatch.setattr(settings, "elevenlabs_api_key", "test-key")
    monkeypatch.setattr(settings, "elevenlabs_voice_id", "test-voice")
    def handler(request):
        assert "Two puffs when needed" in json.loads(request.content)["text"]
        return httpx.Response(200, content=b"mp3", headers={"content-type": "audio/mpeg"})
    mock_http(handler)
    other = uuid.uuid4()
    db = seed(meds=[medication()])
    med = db.query(Medication).one()
    client = client_for(db)
    assert client.post("/api/voice/explain", json={"kind": "medication", "medication_id": str(med.id)}).status_code == 200
    assert client.post("/api/voice/explain", json={"kind": "medication", "medication_id": str(other)}).status_code == 404


async def test_gemini_retries_once_on_transient_errors(mock_http, monkeypatch):
    monkeypatch.setattr("app.services.gemini.client.RETRY_DELAY_SECONDS", 0)
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(429) if len(calls) == 1 else gemini_ok({"medication_name": "ExampleMed", "times": [],
                                                                       "uncertainties": []})
    mock_http(handler)
    assert (await parse_prescription_image(b"x", "image/png")).medication_name == "ExampleMed"
    assert len(calls) == 2


async def test_patient_search_uses_condition_and_location_then_falls_back(mock_http):
    from app.services.trials.clinicaltrials_client import search_for_patient
    calls = []
    def handler(request):
        calls.append(dict(request.url.params))
        near = "query.locn" in request.url.params
        return httpx.Response(200, json={"studies": [] if near else [study("NCT00000123")]})
    mock_http(handler)
    found = await search_for_patient("Type 2 diabetes", "Birmingham", 15)
    assert [t.nct_id for t in found] == ["NCT00000123"]
    assert calls[0]["query.cond"] == "Type 2 diabetes" and calls[0]["query.locn"] == "Birmingham"
    assert "query.locn" not in calls[1]                     # nothing nearby: search anywhere instead
