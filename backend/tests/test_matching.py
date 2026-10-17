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
