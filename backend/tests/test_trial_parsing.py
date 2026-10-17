from app.services.trials.clinicaltrials_client import parse_study


def test_parse_study(sample_study):
    t = parse_study(sample_study)
    assert t.nct_id == "NCT00000001" and t.conditions == ["Asthma"]
    assert t.inclusion_criteria.startswith("Inclusion") and t.exclusion_criteria.startswith("Exclusion")
    assert t.url.endswith("NCT00000001")
