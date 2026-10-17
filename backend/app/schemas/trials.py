# OWNER: Member 3
from enum import Enum
from pydantic import BaseModel


class MatchStatus(str, Enum):
    POTENTIAL_MATCH = "POTENTIAL_MATCH"
    MORE_INFORMATION_NEEDED = "MORE_INFORMATION_NEEDED"
    KNOWN_CRITERIA_MISMATCH = "KNOWN_CRITERIA_MISMATCH"


class TrialLocation(BaseModel):
    facility: str | None = None
    city: str | None = None
    country: str | None = None


class Trial(BaseModel):
    nct_id: str
    title: str
    brief_summary: str | None = None
    status: str | None = None
    conditions: list[str] = []
    interventions: list[str] = []
    phases: list[str] = []
    inclusion_criteria: str | None = None
    exclusion_criteria: str | None = None
    min_age: str | None = None
    max_age: str | None = None
    locations: list[TrialLocation] = []
    url: str


class TrialMatch(BaseModel):
    trial: Trial
    status: MatchStatus
    why_surfaced: list[str]
    relevant_criteria: list[str] = []
    missing_information: list[str] = []
    needs_coordinator_confirmation: list[str] = []
    plain_language_summary: str | None = None   # Gemini-simplified; never an eligibility decision
    disclaimer: str = "Preliminary match only. Eligibility is decided by the study team."


class BookmarkIn(BaseModel):
    nct_id: str
