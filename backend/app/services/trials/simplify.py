# OWNER: Member 3 (calls Member 4's Gemini client). Simplifies wording only; never decides eligibility.
from app.schemas.trials import Trial


async def simplify_trial(trial: Trial) -> str | None:
    """TODO: use app.services.gemini.client.generate_text with a prompt that says:
    'Rewrite in plain language at ~8th-grade level. Do not state whether the reader is eligible.'
    Return None (not a fake string) if Gemini is not configured."""
    return None
