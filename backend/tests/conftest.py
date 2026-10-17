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
