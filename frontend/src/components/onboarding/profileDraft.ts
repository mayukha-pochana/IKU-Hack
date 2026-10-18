// OWNER: Member 1 - the profile fields shared by onboarding and the My profile page.
import type { Profile, SexAtBirth, Smoking, YesNoUnsure } from "@/types";

export type Draft = {
  display_name: string; dob: string; age: number | null; conditions: string[]; location: string; preferred_language: string;
  sex: SexAtBirth | ""; smoking: Smoking | ""; pregnant: YesNoUnsure | ""; travel: string;
};
export const EMPTY: Draft = { display_name: "", dob: "", age: null, conditions: [], location: "", preferred_language: "en", sex: "", smoking: "", pregnant: "", travel: "" };

export const COMMON_CONDITIONS = ["Asthma", "Type 2 diabetes", "High blood pressure", "COPD", "Eczema", "Migraine"];
export const LANGUAGES = [
  { value: "en", label: "English" }, { value: "cy", label: "Cymraeg (Welsh)" }, { value: "es", label: "Español" },
  { value: "fr", label: "Français" }, { value: "pl", label: "Polski" }, { value: "ur", label: "اردو (Urdu)" },
];
export const SEX_OPTIONS: { value: SexAtBirth; label: string }[] = [
  { value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "intersex", label: "Intersex" }, { value: "prefer_not_to_say", label: "Prefer not to say" },
];
export const SMOKING_OPTIONS: { value: Smoking; label: string }[] = [
  { value: "never", label: "Never" }, { value: "former", label: "I used to" }, { value: "current", label: "Yes, currently" },
];
export const PREGNANT_OPTIONS: { value: YesNoUnsure; label: string }[] = [
  { value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "not_sure", label: "Not sure" },
];
export const TRAVEL_OPTIONS = [
  { value: "10", label: "Up to 10 miles" }, { value: "25", label: "Up to 25 miles" }, { value: "50", label: "Up to 50 miles" },
  { value: "100", label: "Up to 100 miles" }, { value: "0", label: "Any distance" },
];

/** Whole years between a YYYY-MM-DD birth date and today (UK birthday rules: you turn N on the day). */
export function ageFromDob(dob: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age;
}

export const fromProfile = (p: Profile): Draft => ({
  display_name: p.display_name, dob: p.date_of_birth ?? "", age: p.age, conditions: p.conditions,
  location: p.location ?? "", preferred_language: p.preferred_language || "en",
  sex: p.sex_at_birth ?? "", smoking: p.smoking_status ?? "", pregnant: p.pregnant_or_breastfeeding ?? "",
  travel: p.max_travel_miles == null ? "" : String(p.max_travel_miles),
});

export const toPayload = (d: Draft) => ({
  display_name: d.display_name.trim(),
  age: d.dob ? ageFromDob(d.dob) : d.age, // the API stores age; date of birth is sent too for when it can store it
  conditions: d.conditions, location: d.location.trim() || null, preferred_language: d.preferred_language,
  date_of_birth: d.dob || null, sex_at_birth: d.sex || null, smoking_status: d.smoking || null,
  pregnant_or_breastfeeding: d.sex === "male" ? null : d.pregnant || null,
  max_travel_miles: d.travel === "" ? null : Number(d.travel),
});

export function validateName(d: Draft) { return d.display_name.trim() ? null : "Enter the name you'd like us to use."; }
export function validateDob(d: Draft) {
  if (!d.dob) return null;
  const age = ageFromDob(d.dob);
  if (age == null) return "Enter your date of birth, like 14 March 1998.";
  if (age < 0) return "That date is in the future. Check the year.";
  if (age > 120) return "Check the year of your date of birth.";
  return null;
}
