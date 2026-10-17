# OWNER: Member 3
from enum import Enum
from typing import Annotated, Literal
from pydantic import BaseModel, Field


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


# --- Gemini trial explanation (Gemini side track). Gemini fills GeminiTrialExplanation; the backend
# derives each criterion's effect and the overall status deterministically.
class GeminiCriterion(BaseModel):
    kind: Literal["inclusion", "exclusion"]
    original_text: Annotated[str, Field(min_length=1, max_length=1500)]
    plain_text: Annotated[str, Field(min_length=1, max_length=1000)]
    applies_to_patient: Literal["YES", "NO", "UNKNOWN"] = Field(
        description="Does the patient record show this criterion describes the patient? UNKNOWN if the record is silent.")
    evidence: Annotated[str, Field(max_length=500)] | None = Field(
        description="The record field supporting YES/NO, quoted from the record; null when UNKNOWN.")
    question_for_coordinator: Annotated[str, Field(max_length=500)] | None


class GeminiTrialExplanation(BaseModel):
    plain_summary: Annotated[str, Field(min_length=1, max_length=2000)]
    criteria: list[GeminiCriterion] = Field(max_length=60)
    questions_to_ask: list[Annotated[str, Field(max_length=500)]] = Field(max_length=15)
    missing_profile_fields: list[Annotated[str, Field(max_length=200)]] = Field(max_length=20)


class CriterionAssessment(GeminiCriterion):
    effect: Literal["supports", "conflicts", "unknown"]
    quote_verified: bool   # original_text found verbatim in the registry criteria


class TrialExplanation(BaseModel):
    nct_id: str
    title: str
    url: str
    status: MatchStatus
    plain_summary: str
    criteria: list[CriterionAssessment]
    questions_to_ask: list[str]
    missing_profile_fields: list[str]
    why_surfaced: list[str]
    disclaimer: str = "Preliminary screening only. Eligibility is decided by the study team."
