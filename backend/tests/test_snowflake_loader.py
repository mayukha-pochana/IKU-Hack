# Snowflake SQL API loader. HTTP is mocked: these are TEST doubles, not a live Snowflake account.
import copy
import json

import httpx
import pytest

from app.core.config import settings
from conftest import SAMPLE_STUDY
from scripts import sync_trials_snowflake as loader

REAL_CLIENT = httpx.AsyncClient
ACCOUNT = "https://example-acct.snowflakecomputing.com"


def study(nct_id, summary="A synthetic test summary."):
    s = copy.deepcopy(SAMPLE_STUDY)
    s["protocolSection"]["identificationModule"]["nctId"] = nct_id
    s["protocolSection"]["descriptionModule"]["briefSummary"] = summary
    return s


@pytest.fixture(autouse=True)
def snowflake_settings(monkeypatch):
    monkeypatch.setattr(settings, "snowflake_account_url", ACCOUNT)
    monkeypatch.setattr(settings, "snowflake_pat", "test-pat")
    monkeypatch.setattr(loader, "POLL_SECONDS", 0)


def mock_http(monkeypatch, handler):
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: REAL_CLIENT(transport=httpx.MockTransport(handler), **kw))


def test_merge_statement_and_bindings_line_up():
    rows = [["NCT00000001"] + ["x"] * 9, ["NCT00000002"] + [""] * 9]
    sql = loader.merge_statement(len(rows))
    assert sql.count("?") == 20 == len(loader.bindings(rows))
    assert sql.startswith("MERGE INTO STUDIES t USING")
    assert "NULLIF(column1, '') AS nct_id" in sql and "ON t.nct_id = s.nct_id" in sql
    assert loader.bindings(rows)["11"] == {"type": "TEXT", "value": "NCT00000002"}


async def test_load_pages_dedupes_and_polls(monkeypatch):
    statements, polled = [], []
    def handler(request):
        if request.url.host == "clinicaltrials.gov":
            assert request.url.params["query.term"] == "asthma"
            if "pageToken" not in request.url.params:
                return httpx.Response(200, json={"studies": [study("NCT00000001"), study("NCT00000001"),
                                                             study("NCT00000002")], "nextPageToken": "p2"})
            assert request.url.params["pageToken"] == "p2"
            return httpx.Response(200, json={"studies": [study("NCT00000003")]})
        assert request.headers["authorization"] == "Bearer test-pat"
        assert request.headers["x-snowflake-authorization-token-type"] == "PROGRAMMATIC_ACCESS_TOKEN"
        if request.method == "GET":
            polled.append(request.url.path)
            return httpx.Response(200, json={"data": [["1", "0"]]})
        assert request.url.path == "/api/v2/statements"
        body = json.loads(request.content)
        assert (body["database"], body["schema"], body["warehouse"]) == ("CAREFLOW", "TRIALS", "CAREFLOW_WH")
        statements.append(body)
        if len(statements) == 1:  # First statement is still running: Snowflake answers 202.
            return httpx.Response(202, json={"statementHandle": "h1", "statementStatusUrl": "/api/v2/statements/h1"})
        return httpx.Response(200, json={"data": [["1", "0"]]})
    mock_http(monkeypatch, handler)
    assert await loader.load(["asthma"]) == 3
    assert polled == ["/api/v2/statements/h1"]
    first = statements[0]
    assert first["statement"].count("?") == 20  # Duplicate NCT00000001 merged once.
    assert first["bindings"]["1"]["value"] == "NCT00000001"
    assert first["bindings"]["10"]["value"].startswith("Inclusion Criteria")
    assert statements[1]["bindings"]["1"]["value"] == "NCT00000003"


async def test_sql_api_error_is_reported(monkeypatch):
    def handler(request):
        if request.url.host == "clinicaltrials.gov":
            return httpx.Response(200, json={"studies": [study("NCT00000001")]})
        return httpx.Response(422, json={"message": "SQL compilation error: Object 'STUDIES' does not exist"})
    mock_http(monkeypatch, handler)
    with pytest.raises(RuntimeError, match="does not exist"):
        await loader.load(["asthma"])


async def test_requires_configuration(monkeypatch):
    monkeypatch.setattr(settings, "snowflake_pat", "")
    with pytest.raises(SystemExit):
        await loader.load(["asthma"])
    monkeypatch.setattr(settings, "snowflake_pat", "test-pat")
    monkeypatch.setattr(settings, "snowflake_warehouse", "bad; DROP")
    with pytest.raises(SystemExit):
        await loader.load(["asthma"])
