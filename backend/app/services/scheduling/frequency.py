FREQUENCIES = ["once_daily", "twice_daily", "three_times_daily", "four_times_daily", "every_n_hours", "as_needed", "other"]

FIXED = {
    "once_daily": ["09:00"],
    "twice_daily": ["09:00", "21:00"],
    "three_times_daily": ["08:00", "14:00", "20:00"],
    "four_times_daily": ["08:00", "12:00", "16:00", "20:00"],
}

def suggest_times(frequency: str | None, interval_hours: int | None = None, first: str = "08:00") -> list[str]:
    if frequency in FIXED:
        return FIXED[frequency]
    if frequency == "every_n_hours" and interval_hours and 24 % interval_hours == 0:
        h0 = int(first[:2])
        return sorted(f"{(h0 + k * interval_hours) % 24:02d}:00" for k in range(24 // interval_hours))
    return []   # as_needed / other / uneven intervals: the patient chooses