# OWNER: Member 4 - server-side helper for Presage results/credentials. See README.md in this folder.
from dataclasses import dataclass


@dataclass
class PresageMeasurement:
    heart_rate: float | None
    breathing_rate: float | None
    source: str = "presage_sdk"


def validate_measurement(m: PresageMeasurement) -> None:
    """TODO(M4): sanity-check ranges / required signature fields from the SDK output.
    Reject anything not produced by the real SDK."""
    raise NotImplementedError
