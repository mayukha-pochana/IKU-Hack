// OWNER: Member 2 - schedule helpers shared by the prescription form and medicine cards.
import type { Schedule, SchedulePattern } from "@/types";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // index = backend weekday (0 = Monday)
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Suggested times for a recognised frequency. Only a suggestion: the patient confirms or edits them. */
export const SUGGESTED_TIMES: Record<string, string[]> = {
  once_daily: ["08:00"],
  twice_daily: ["08:00", "20:00"],
  three_times_daily: ["08:00", "14:00", "20:00"],
  four_times_daily: ["08:00", "12:00", "16:00", "20:00"],
};

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[\s-]+/g, "_");

/** Map the frequency read from the label to a pattern and suggested times (null when not recognised). */
export function fromFrequency(frequency: string | null | undefined): { pattern: SchedulePattern; suggested: string[] | null } {
  const f = norm(frequency);
  if (/as_needed|when_needed|prn/.test(f)) return { pattern: "as_needed", suggested: null };
  const key = Object.keys(SUGGESTED_TIMES).find((k) => f.includes(k))
    ?? (/(^|_)(once|one)(_a|_per)?_day|daily$/.test(f) ? "once_daily" : /twice/.test(f) ? "twice_daily" : null);
  return { pattern: "daily", suggested: key ? SUGGESTED_TIMES[key] : null };
}

/** "08:00, 14:00 and 20:00" */
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** "Twice a day at 08:00 and 20:00, for 14 days", in plain words for a medicine card. */
export function describeSchedule(s: Schedule): string {
  const times = s.times.length ? ` at ${list(s.times)}` : "";
  const days = `${s.duration_days} ${s.duration_days === 1 ? "day" : "days"}`;
  switch (s.pattern ?? "daily") {
    case "as_needed": return `When needed, for up to ${days}`;
    case "every_n_days": return `Every ${s.interval_days} days${times}, for ${days}`;
    case "weekly": return `Every ${list((s.weekdays ?? []).map((d) => WEEKDAYS_LONG[d]))}${times}, for ${days}`;
    default: return `${s.times.length === 1 ? "Once" : s.times.length === 2 ? "Twice" : `${s.times.length} times`} a day${times}, for ${days}`;
  }
}

/** Which form field an uncertainty from the label reader is about, so it can sit next to that field. */
export function fieldOf(uncertainty: string): "name" | "strength" | "instructions" | "frequency" | "times" | "duration" | null {
  const u = uncertainty.toLowerCase();
  if (/medication name|medicine name|drug name/.test(u)) return "name";
  if (/strength/.test(u)) return "strength";
  if (/duration|how many days|days/.test(u)) return "duration";
  if (/time/.test(u)) return "times";
  if (/frequency|how often/.test(u)) return "frequency";
  if (/dose|instruction/.test(u)) return "instructions";
  return null;
}
