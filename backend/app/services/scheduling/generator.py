# OWNER: Member 4 - pure, timezone-aware schedule generation (unit-tested).
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def generate_dose_times(times: list[str], duration_days: int, tz: str, start: date | None = None) -> list[datetime]:
    zone = ZoneInfo(tz)
    start = start or datetime.now(zone).date()
    out: list[datetime] = []
    for day in range(duration_days):
        d = start + timedelta(days=day)
        for t in sorted(times):
            hh, mm = map(int, t.split(":"))
            out.append(datetime.combine(d, time(hh, mm), tzinfo=zone))
    return out
