# OWNER: Member 4 - pure, timezone-aware schedule generation (unit-tested).
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def generate_dose_times(times: list[str], duration_days: int, tz: str, start: date | None = None,
                        pattern: str = "daily", interval_days: int | None = None,
                        weekdays: list[int] | None = None) -> list[datetime]:
    """Wall-clock dose times in the patient's timezone (08:00 stays 08:00 across clock changes).
    as_needed has no scheduled doses: they are logged when taken."""
    if pattern == "as_needed":
        return []
    zone = ZoneInfo(tz)
    start = start or datetime.now(zone).date()
    out: list[datetime] = []
    for day in range(duration_days):
        d = start + timedelta(days=day)
        if pattern == "every_n_days" and day % (interval_days or 1):
            continue
        if pattern == "weekly" and d.weekday() not in (weekdays or []):
            continue
        for t in sorted(times):
            hh, mm = map(int, t.split(":"))
            out.append(datetime.combine(d, time(hh, mm), tzinfo=zone))
    return out


def schedule_kwargs(schedule: dict) -> dict:
    """Arguments for generate_dose_times from a stored confirmed_schedule (older rows default to daily)."""
    return {"times": schedule.get("times", []), "duration_days": schedule["duration_days"],
            "tz": schedule.get("timezone", "Europe/London"), "pattern": schedule.get("pattern", "daily"),
            "interval_days": schedule.get("interval_days"), "weekdays": schedule.get("weekdays")}
