# OWNER: Member 4 - shared adherence math used by router + tests.
def adherence_percentage(taken: int, total_due: int) -> float | None:
    return round(100 * taken / total_due, 1) if total_due else None
