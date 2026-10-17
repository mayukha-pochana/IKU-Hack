import json
import pytest
from app.core.errors import AppError
from app.services.gemini.prescription_parser import validate_response


def test_missing_fields_are_flagged_not_invented():
    p = validate_response(json.dumps({"medication_name": "ExampleMed"}))
    assert p.frequency is None and p.duration_days is None
    assert any("frequency" in u for u in p.uncertainties)


def test_invalid_json_raises():
    with pytest.raises(AppError):
        validate_response("not json")
