import pytest
from pydantic import ValidationError
from app.schemas.biometrics import CheckinCreate


def test_requires_consent():
    with pytest.raises(ValidationError):
        CheckinCreate(symptom_report="ok", measurement_source="none", consent_given=False)


def test_no_vitals_without_real_sdk_source():
    with pytest.raises(ValidationError):
        CheckinCreate(heart_rate=70, measurement_source="none", consent_given=True)
