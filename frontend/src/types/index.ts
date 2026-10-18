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
  frequency: string | null; confirmed_schedule: Schedule;
}
// "daily" when absent (older medicines). as_needed has no scheduled doses; they're logged when taken.
export type SchedulePattern = "daily" | "every_n_days" | "weekly" | "as_needed";
export interface Schedule {
  pattern?: SchedulePattern; times: string[]; duration_days: number; timezone: string;
  interval_days?: number | null; weekdays?: number[] | null; // weekdays: 0 = Monday ... 6 = Sunday
  stopped_at?: string | null; // set when the patient stops the medicine; future doses are removed
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
  // Payment for taking part, in the trial's own words (requested in docs/requests/trial-compensation.md).
  compensation?: string | null;
}
export interface TrialMatch {
  trial: Trial; status: MatchStatus; why_surfaced: string[]; relevant_criteria: string[];
  missing_information: string[]; needs_coordinator_confirmation: string[];
  plain_language_summary: string | null; disclaimer: string;
  update?: TrialUpdate | null; // present once the patient has opened this trial's explanation
}
// Trial updates: CareFlow re-checks trials the patient has opened when something about them changes.
export interface FixOption { label: string; facts: { type: string; value: string }[] }
export interface TrialUpdate {
  status: MatchStatus; label: string; previous_status: MatchStatus | null; previous_label: string | null;
  reason: string; changed_at: string | null; is_new: boolean; provisional: boolean; fix_options: FixOption[];
}
export interface TrialUpdateItem extends TrialUpdate { nct_id: string; title: string }
export interface UpdatesResponse {
  new_count: number; updates: TrialUpdateItem[];
  // What was just handled (e.g. the check-in you saved) and which trials it changed.
  handled_events?: { kind: string; summary: string; changes: { nct_id: string; title: string }[] }[];
}
export type Correction = FixOption | { text: string };
// POST /trials/{nct_id}/explain (Gemini). `effect` is derived by the backend, never an eligibility decision.
export type CriterionEffect = "supports" | "conflicts" | "unknown";
export interface CriterionAssessment {
  kind: "inclusion" | "exclusion"; original_text: string; plain_text: string;
  applies_to_patient: "YES" | "NO" | "UNKNOWN"; evidence: string | null; question_for_coordinator: string | null;
  effect: CriterionEffect; quote_verified: boolean;
  evidence_source?: EvidenceSource; note?: string | null;
}
export type EvidenceSource = "profile" | "medication" | "patient_correction" | "patient_note" | "sensor_reading" | "none";
export interface TrialExplanation {
  nct_id: string; title: string; url: string; status: MatchStatus; plain_summary: string;
  criteria: CriterionAssessment[]; questions_to_ask: string[]; missing_profile_fields: string[];
  why_surfaced: string[]; disclaimer: string;
  conflicts?: { topic: string; kept: string; overridden: string; rule: string }[]; update?: TrialUpdate | null;
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
  schedule: Schedule;
}
export interface CheckinCreate {
  heart_rate: number | null; breathing_rate: number | null; symptom_report: string | null;
  measurement_source: "presage_sdk" | "none"; consent_given: boolean;
}
