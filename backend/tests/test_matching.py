from types import SimpleNamespace
from app.schemas.trials import MatchStatus
from app.services.trials.clinicaltrials_client import parse_study
from app.services.trials.matching import match_trial


def _profile(age):
    return SimpleNamespace(conditions=["Asthma"], age=age, location="London")


def test_age_mismatch(sample_study):
    assert match_trial(_profile(10), parse_study(sample_study)).status == MatchStatus.KNOWN_CRITERIA_MISMATCH


def test_never_definitive_without_review(sample_study):
    m = match_trial(_profile(28), parse_study(sample_study))
    assert m.status == MatchStatus.MORE_INFORMATION_NEEDED  # exclusion criteria need coordinator
    assert "Preliminary" in m.disclaimer


def test_exclusion_items_listed_individually(sample_study):
    sample_study["protocolSection"]["eligibilityModule"]["eligibilityCriteria"] = (
        "Inclusion Criteria:\n- Adults\n\nExclusion Criteria:\n- Pregnancy\n- Recent surgery within\n  30 days\n* Current smoker"
    )
    m = match_trial(_profile(28), parse_study(sample_study))
    assert "Study team will check: Pregnancy" in m.needs_coordinator_confirmation
    assert any("Recent surgery within 30 days" in c for c in m.needs_coordinator_confirmation)
    assert any("Current smoker" in c for c in m.needs_coordinator_confirmation)


def test_extract_handles_empty_and_numbered():
    from app.services.trials.matching import extract_criteria_items
    assert extract_criteria_items(None) == []
    assert extract_criteria_items("Exclusion Criteria:\n1. A\n2) B") == ["A", "B"]


def test_site_matching_respects_country():
    from app.services.trials.matching import site_matches
    assert site_matches("Birmingham, UK", "Birmingham", "United Kingdom")
    assert not site_matches("Birmingham, UK", "Birmingham", "United States")   # UAB, Alabama
    assert site_matches("Birmingham", "Birmingham", "United States")           # no country given: city only
    assert not site_matches("London", "Birmingham", "United Kingdom")
