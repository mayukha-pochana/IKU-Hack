// Mirrors backend schemas. Owner: Member 2 (keep in sync with /docs OpenAPI).
export type DoseStatus = "SCHEDULED" | "TAKEN" | "MISSED" | "SKIPPED";
export type MatchStatus = "POTENTIAL_MATCH" | "MORE_INFORMATION_NEEDED" | "KNOWN_CRITERIA_MISMATCH";

export interface Profile {
  id: string; user_id: string; display_name: string; age: number | null;
  conditions: string[]; location: string | null; preferred_language: string;
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
export interface AdherenceSummary {
  scheduled_doses: number; reported_taken: number; reported_missed: number;
  reported_skipped: number; reported_adherence_percentage: number | null; note: string;
}
export interface Checkin {
  id: string; heart_rate: number | null; breathing_rate: number | null;
  symptom_report: string | null; measurement_source: string; recorded_at: string;
}
