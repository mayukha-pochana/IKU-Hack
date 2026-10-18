// Mirrors backend schemas. Owner: Member 2 (keep in sync with /docs OpenAPI).
export type DoseStatus = "SCHEDULED" | "TAKEN" | "MISSED" | "SKIPPED";
export type MatchStatus = "POTENTIAL_MATCH" | "MORE_INFORMATION_NEEDED" | "KNOWN_CRITERIA_MISMATCH";

export type SexAtBirth = "female" | "male" | "intersex" | "prefer_not_to_say";
export type Smoking = "never" | "former" | "current";
export type YesNoUnsure = "yes" | "no" | "not_sure";
export interface Profile {
  id: string; user_id: string; display_name: string; age: number | null;
  conditions: string[]; location: string | null; preferred_language: string;
  // Screening fields requested from Member 3 (docs/requests/profile-screening-fields.md). Optional until the API stores them.
  date_of_birth?: string | null; sex_at_birth?: SexAtBirth | null; smoking_status?: Smoking | null;
  pregnant_or_breastfeeding?: YesNoUnsure | null; max_travel_miles?: number | null;
  // Name and contact, also requested from Member 3.
  last_name?: string | null; phone?: string | null;
}
export interface Medication {
  id: string; name: string; strength: string | null; instructions: string | null;
  frequency: string | null; confirmed_schedule: { times: string[]; duration_days: number; timezone: string };
}
export interface ParsedPrescription {
  medication_name: string | null; strength: string | null; dose_instructions: string | null;
  frequency: string | null; times: string[]; duration_days: number | null;
  plain_language_summary: string | null; uncertainties: string[];
}
export interface Dose {
  id: string; medication_id: string; medication_name: string;
  scheduled_at: string; status: DoseStatus; confirmed_at: string | null;
}
export interface Trial {
  nct_id: string; title: string; brief_summary: string | null; status: string | null;
  conditions: string[]; interventions: string[]; phases: string[];
  inclusion_criteria: string | null; exclusion_criteria: string | null;
  min_age: string | null; max_age: string | null;
  locations: { facility: string | null; city: string | null; country: string | null }[]; url: string;
}
export interface TrialMatch {
  trial: Trial; status: MatchStatus; why_surfaced: string[]; relevant_criteria: string[];
  missing_information: string[]; needs_coordinator_confirmation: string[];
  plain_language_summary: string | null; disclaimer: string;
}
// POST /trials/{nct_id}/explain (Gemini). `effect` is derived by the backend, never an eligibility decision.
export type CriterionEffect = "supports" | "conflicts" | "unknown";
export interface CriterionAssessment {
  kind: "inclusion" | "exclusion"; original_text: string; plain_text: string;
  applies_to_patient: "YES" | "NO" | "UNKNOWN"; evidence: string | null; question_for_coordinator: string | null;
  effect: CriterionEffect; quote_verified: boolean;
}
export interface TrialExplanation {
  nct_id: string; title: string; url: string; status: MatchStatus; plain_summary: string;
  criteria: CriterionAssessment[]; questions_to_ask: string[]; missing_profile_fields: string[];
  why_surfaced: string[]; disclaimer: string;
}
export interface AdherenceSummary {
  scheduled_doses: number; reported_taken: number; reported_missed: number;
  reported_skipped: number; reported_adherence_percentage: number | null; note: string;
}
export interface Checkin {
  id: string; heart_rate: number | null; breathing_rate: number | null;
  symptom_report: string | null; measurement_source: string; recorded_at: string;
}
export interface AdherenceDay { day: string; scheduled: number; taken: number; missed: number }
export interface MedicationCreate {
  name: string; strength: string | null; instructions: string | null; frequency: string | null;
  schedule: { times: string[]; duration_days: number; timezone: string };
}
export interface CheckinCreate {
  heart_rate: number | null; breathing_rate: number | null; symptom_report: string | null;
  measurement_source: "presage_sdk" | "none"; consent_given: boolean;
}
export interface VoiceExplain { kind: "medication" | "schedule" | "trial"; medication_id?: string; nct_id?: string; language?: string }
