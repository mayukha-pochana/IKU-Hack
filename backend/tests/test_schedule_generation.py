from datetime import date
from app.services.scheduling.generator import generate_dose_times


def test_counts_and_timezone():
    out = generate_dose_times(["09:00", "21:00"], 3, "Europe/London", start=date(2026, 10, 17))
    assert len(out) == 6
    assert out[0].tzinfo is not None and out[0].hour == 9


def test_dst_aware():
    out = generate_dose_times(["09:00"], 2, "Europe/London", start=date(2026, 10, 24))  # clocks go back 25 Oct
    assert out[0].utcoffset() != out[1].utcoffset()
