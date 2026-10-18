// LOCAL UI PREVIEW ONLY. Lets the team click through the signed-in screens without the backend.
// - Only available when NODE_ENV === "development" (never in a production build).
// - Every screen shows a "Preview mode · sample data" banner while it is on.
// - Data lives in memory in this browser tab; nothing reaches the server or the database.
// This is not a substitute for the real integrations (Gemini, ClinicalTrials.gov, Presage).
import type * as T from "@/types";

const KEY = "pz:preview";
export const previewAvailable = process.env.NODE_ENV === "development";

export function isPreview() {
  if (!previewAvailable || typeof window === "undefined") return false;
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function setPreview(on: boolean) {
  try { if (on) sessionStorage.setItem(KEY, "1"); else sessionStorage.removeItem(KEY); } catch { /* storage off */ }
  db = null;
}

class PreviewError extends Error { constructor(public code: string, message: string, public status: number) { super(message); } }

const uid = () => Math.random().toString(36).slice(2, 10);
function at(dayOffset: number, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0); d.setDate(d.getDate() + dayOffset); return d.toISOString();
}

type DB = { profile: T.Profile | null; meds: T.Medication[]; doses: (T.Dose & { medication_id: string })[]; checkins: T.Checkin[]; bookmarks: string[];
  demo: { stoppedInsulin: boolean; seen: boolean; changedAt: string } };
let db: DB | null = null;

// Mirrors the backend generator: daily, every_n_days, weekly (0 = Monday) and as_needed (no scheduled doses).
function makeDoses(m: T.Medication, fromDay: number) {
  const out: DB["doses"] = [];
  const s = m.confirmed_schedule;
  if (s.pattern === "as_needed") return out;
  const days = Math.min(s.duration_days, 28);
  const keep = (offset: number, d: number) => {
    if (s.pattern === "every_n_days") return offset % (s.interval_days ?? 1) === 0;
    if (s.pattern === "weekly") { const day = new Date(); day.setDate(day.getDate() + d); return (s.weekdays ?? []).includes((day.getDay() + 6) % 7); }
    return true;
  };
  for (let d = fromDay; d < fromDay + days; d++) if (keep(d - fromDay, d)) for (const t of s.times)
    out.push({ id: uid(), medication_id: m.id, medication_name: `${m.name}${m.strength ? ` ${m.strength}` : ""}`, scheduled_at: at(d, t), status: "SCHEDULED", confirmed_at: null });
  return out;
}

const SAMPLE_DIARY = [["Good", "Breathing felt easy on my walk."], ["Okay", "Slightly wheezy after climbing stairs."], ["Low", "Tired today."], ["Great", ""],
  ["Good", ""], ["Okay", "Bit of a cough in the evening."], ["Great", "Swam 20 lengths, no wheeze."], ["Unwell", "Cold coming on, stayed in."], ["Good", "Slept well."]] as const;
function seed(): DB {
  const med: T.Medication = { id: "med-1", name: "Beclometasone", strength: "100 mcg", instructions: "2 puffs, morning and night", frequency: "twice daily", confirmed_schedule: { times: ["09:00", "21:00"], duration_days: 28, timezone: "Europe/London" } };
  const med2: T.Medication = { id: "med-2", name: "Montelukast", strength: "10 mg", instructions: "1 tablet at night", frequency: "once daily", confirmed_schedule: { times: ["21:00"], duration_days: 28, timezone: "Europe/London" } };
  const med3: T.Medication = { id: "med-3", name: "Hydrocortisone 1% cream", strength: null, instructions: "Apply thinly to the rash once a day", frequency: "once daily", confirmed_schedule: { times: ["20:00"], duration_days: 14, timezone: "Europe/London" } };
  const med4: T.Medication = { id: "med-4", name: "Omalizumab", strength: "150 mg", instructions: "Injection under the skin every 2 weeks at the clinic", frequency: "every 2 weeks", confirmed_schedule: { pattern: "every_n_days", interval_days: 14, times: ["10:00"], duration_days: 28, timezone: "Europe/London" } };
  const med5: T.Medication = { id: "med-5", name: "Salbutamol", strength: "100 mcg", instructions: "2 puffs when short of breath", frequency: "as needed", confirmed_schedule: { pattern: "as_needed", times: [], duration_days: 90, timezone: "Europe/London" } };
  const sinceMonday = -((new Date().getDay() + 6) % 7); // fill the whole Monday-to-Sunday week
  const doses = [...makeDoses(med, sinceMonday), ...makeDoses(med2, sinceMonday), ...makeDoses(med3, sinceMonday), ...makeDoses(med4, sinceMonday + 3)];
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0); // leave today's doses for the user to log
  doses.forEach((d, i) => { if (new Date(d.scheduled_at).getTime() < startOfToday.getTime()) { d.status = i === 2 ? "MISSED" : "TAKEN"; d.confirmed_at = d.status === "TAKEN" ? d.scheduled_at : null; } });
  return {
    profile: { id: "p-1", user_id: "u-1", display_name: "Maya", age: 28, conditions: ["Asthma"], location: "London", preferred_language: "en",
      date_of_birth: "1998-03-14", sex_at_birth: "female", smoking_status: "never", pregnant_or_breastfeeding: "no", max_travel_miles: 25 },
    meds: [med, med2, med3, med4, med5], doses, bookmarks: [],
    demo: { stoppedInsulin: false, seen: false, changedAt: new Date().toISOString() },
    // Sample diary entries over the last six weeks, with a few days skipped (preview only).
    checkins: Array.from({ length: 42 }, (_, k) => 42 - k).filter((n) => n % 5 !== 2 && n % 7 !== 4).map((n) => {
      const [mood, note] = SAMPLE_DIARY[n % SAMPLE_DIARY.length];
      return { id: uid(), heart_rate: null, breathing_rate: null, symptom_report: note ? `Feeling: ${mood}\n${note}` : `Feeling: ${mood}`, measurement_source: "none", recorded_at: at(-n, "08:30") };
    }),
  };
}
const state = () => (db ??= seed());

const trial = (nct: string, title: string, summary: string, phase: string, place: [string, string], compensation: string | null = null): T.Trial => ({
  nct_id: nct, title, brief_summary: summary, status: "RECRUITING", conditions: ["Asthma"], interventions: ["Inhaled medicine"], phases: [phase],
  inclusion_criteria: "Adults aged 18 to 65\nDiagnosed with asthma for at least 6 months\nUsing an inhaled steroid", exclusion_criteria: "Current smokers\nPregnant or breastfeeding",
  min_age: "18 Years", max_age: "65 Years", locations: [{ facility: place[0], city: place[1], country: "United Kingdom" }], url: `https://clinicaltrials.gov/trial/${nct}`, compensation,
});
const DISCLAIMER = "Preview sample. Preliminary match only; the trial team decides who can take part.";
const MATCHES: T.TrialMatch[] = [
  { trial: trial("NCT-SAMPLE-1", "Sample trial: once-daily inhaler for asthma", "A made-up trial used to preview the screen layout.", "PHASE3", ["Sample Hospital", "London"], "Sample only: participants are paid for each completed visit, and travel costs are covered."),
    status: "POTENTIAL_MATCH", why_surfaced: ["You have asthma", "You are aged 18 to 65"], relevant_criteria: ["Diagnosed with asthma", "Aged 18 to 65"],
    missing_information: ["How long you have had asthma"], needs_coordinator_confirmation: ["Whether your current inhaler is allowed"], plain_language_summary: null, disclaimer: DISCLAIMER },
  { trial: trial("NCT-SAMPLE-2", "Sample trial: asthma and exercise", "A made-up trial used to preview the screen layout.", "PHASE2", ["Sample Clinic", "Manchester"]),
    status: "MORE_INFORMATION_NEEDED", why_surfaced: ["You have asthma"], relevant_criteria: ["Diagnosed with asthma"],
    missing_information: ["Whether you smoke"], needs_coordinator_confirmation: ["Travel to Manchester for visits"], plain_language_summary: null, disclaimer: DISCLAIMER },
  { trial: trial("NCT-SAMPLE-3", "Sample trial: severe asthma in older adults", "A made-up trial used to preview the screen layout.", "PHASE3", ["Sample Centre", "Leeds"], "Sample only: reasonable travel costs are reimbursed."),
    status: "KNOWN_CRITERIA_MISMATCH", why_surfaced: ["You have asthma"], relevant_criteria: ["Must be aged 50 or over"],
    missing_information: [], needs_coordinator_confirmation: [], plain_language_summary: null, disclaimer: DISCLAIMER },
];

// Demo trial for the "trial updates" screens (fixed sample text, not from the backend or Gemini).
const DEMO_NCT = "NCT06897475";
const DEMO_MATCH: T.TrialMatch = {
  trial: { nct_id: DEMO_NCT, title: "Sample trial: a new weekly diabetes medicine compared with placebo", brief_summary: "A sample used to preview how PhaseZero tells you when a trial changes.",
    status: "RECRUITING", conditions: ["Type 2 Diabetes"], interventions: ["Metformin"], phases: ["PHASE4"],
    inclusion_criteria: "Adults aged 30 to 70 with type 2 diabetes\nTaking metformin", exclusion_criteria: "Currently taking insulin",
    min_age: "30 Years", max_age: "70 Years", locations: [{ facility: "Sample Research Unit", city: "Birmingham", country: "United Kingdom" }], url: `https://clinicaltrials.gov/study/${DEMO_NCT}` },
  status: "MORE_INFORMATION_NEEDED", why_surfaced: ["You take metformin"], relevant_criteria: [], missing_information: [], needs_coordinator_confirmation: [],
  plain_language_summary: null, disclaimer: "Preview sample. Preliminary match only; the trial team decides who can take part.",
};
function demoUpdate(d: DB["demo"]): T.TrialUpdate {
  return d.stoppedInsulin
    ? { status: "MORE_INFORMATION_NEEDED", label: "We need to check", previous_status: "KNOWN_CRITERIA_MISMATCH", previous_label: "Not a fit right now",
        reason: "\"You can't be taking insulin\" now counts in your favour (from what you told us). Other requirements still need checking with the study team.",
        changed_at: d.changedAt, is_new: !d.seen, provisional: false,
        fix_options: [{ label: "I am taking Insulin glargine", facts: [{ type: "medication_taking", value: "Insulin glargine" }] }] }
    : { status: "KNOWN_CRITERIA_MISMATCH", label: "Not a fit right now", previous_status: "MORE_INFORMATION_NEEDED", previous_label: "We need to check",
        reason: "\"You can't be taking insulin\" now means this study may not fit you (from Insulin glargine 10 units).",
        changed_at: d.changedAt, is_new: !d.seen, provisional: false,
        fix_options: [{ label: "I'm not taking Insulin glargine", facts: [{ type: "medication_stopped", value: "Insulin glargine" }] }] };
}
const demoMatch = (s: DB): T.TrialMatch => { const u = demoUpdate(s.demo); return { ...DEMO_MATCH, status: u.status, update: u }; };

// Preview sample, not written by Gemini: fixed text that shows each criterion effect on the explanation screen.
function explanation(m: T.TrialMatch): T.TrialExplanation {
  const c = (kind: T.CriterionAssessment["kind"], original_text: string, plain_text: string, applies_to_patient: T.CriterionAssessment["applies_to_patient"],
    effect: T.CriterionEffect, evidence: string | null = null): T.CriterionAssessment =>
    ({ kind, original_text, plain_text, applies_to_patient, evidence, question_for_coordinator: null, effect, quote_verified: true });
  const mismatch = m.status === "KNOWN_CRITERIA_MISMATCH";
  return {
    nct_id: m.trial.nct_id, title: m.trial.title, url: m.trial.url, status: m.status,
    plain_summary: "Preview sample: this made-up trial tests whether a once-daily inhaler controls asthma as well as a twice-daily one. You would visit the clinic about once a month for six months.",
    criteria: [
      c("inclusion", "Adults aged 18 to 65", mismatch ? "You need to be 50 or older." : "You need to be between 18 and 65.", mismatch ? "NO" : "YES", mismatch ? "conflicts" : "supports", "Age: 28"),
      c("inclusion", "Diagnosed with asthma for at least 6 months", "You need to have had asthma for at least 6 months.", "UNKNOWN", "unknown"),
      c("inclusion", "Using an inhaled steroid", "You need to be using a preventer (steroid) inhaler.", "YES", "supports", "Medication: Beclometasone 100 mcg"),
      c("exclusion", "Current smokers", "People who smoke now can't take part.", "NO", "supports", "Smoking: never"),
      c("exclusion", "Pregnant or breastfeeding", "People who are pregnant or breastfeeding can't take part.", "NO", "supports", "Pregnant or breastfeeding: no"),
    ],
    questions_to_ask: ["Can I keep using my current preventer inhaler during the trial?", "How often would I need to visit the clinic?"],
    missing_profile_fields: ["When you were diagnosed with asthma"],
    why_surfaced: m.why_surfaced, disclaimer: DISCLAIMER,
  };
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const strip = ({ ...d }: DB["doses"][number]): T.Dose => d;

export async function previewRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 250)); // let loading states show briefly
  const s = state();
  const method = (init.method ?? "GET").toUpperCase();
  const [route, query] = path.split("?");
  const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
  const now = new Date();

  if (route === "/auth/session") return { authenticated: true, email: "maya.preview@example.com", demo_mode: true };
  if (route === "/auth/logout") { setPreview(false); return { status: "ok" }; }
  if (route.startsWith("/auth/")) return { status: "ok" };

  if (route === "/profile") {
    if (method === "PUT") { s.profile = { id: "p-1", user_id: "u-1", ...body }; return s.profile; }
    if (!s.profile) throw new PreviewError("profile_not_found", "Profile not created yet.", 404);
    return s.profile;
  }

  if (route === "/prescriptions/parse") {
    const photos = init.body instanceof FormData ? init.body.getAll("files").length : 1;
    return {
      medication_name: "Amoxicillin", strength: "500 mg", dose_instructions: "Take one capsule three times a day with water", frequency: "three_times_daily",
      times: [], duration_days: 7, plain_language_summary: "Preview sample: an antibiotic capsule taken three times a day for a week.",
      uncertainties: [`Preview mode: sample text, not read from your ${photos} photo${photos === 1 ? "" : "s"}.`, "No administration times are printed; times were not found."],
    } satisfies T.ParsedPrescription;
  }
  const stopMed = route.match(/^\/medications\/(.+)\/stop$/);
  if (stopMed && method === "POST") {
    const m = s.meds.find((x) => x.id === stopMed[1]);
    if (!m) throw new PreviewError("not_found", "Medication not found.", 404);
    if (!m.confirmed_schedule.stopped_at) {
      m.confirmed_schedule = { ...m.confirmed_schedule, stopped_at: now.toISOString() };
      s.doses = s.doses.filter((d) => !(d.medication_id === m.id && d.status === "SCHEDULED" && new Date(d.scheduled_at) > now));
    }
    return m;
  }
  const logDose = route.match(/^\/medications\/(.+)\/doses$/);
  if (logDose && method === "POST") {
    const m = s.meds.find((x) => x.id === logDose[1]);
    if (!m) throw new PreviewError("not_found", "Medication not found.", 404);
    if (m.confirmed_schedule.pattern !== "as_needed") throw new PreviewError("not_as_needed", "Log scheduled doses from your schedule instead.", 409);
    const d = { id: uid(), medication_id: m.id, medication_name: `${m.name}${m.strength ? ` ${m.strength}` : ""}`, scheduled_at: now.toISOString(), status: "TAKEN" as const, confirmed_at: now.toISOString() };
    s.doses.push(d); return strip(d);
  }
  if (route === "/medications" && method === "POST") {
    const m: T.Medication = { id: uid(), name: body.name, strength: body.strength, instructions: body.instructions, frequency: body.frequency, confirmed_schedule: body.schedule };
    s.meds.push(m); s.doses.push(...makeDoses(m, 0)); return m;
  }
  if (route === "/medications") return s.meds;

  if (route === "/schedule/today") return s.doses.filter((d) => sameDay(new Date(d.scheduled_at), now)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).map(strip);
  if (route === "/schedule/week") {
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return s.doses.filter((d) => { const t = new Date(d.scheduled_at); return t >= start && t < end; }).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).map(strip);
  }
  const dose = route.match(/^\/doses\/(.+)\/status$/);
  if (dose) {
    const d = s.doses.find((x) => x.id === dose[1]);
    if (!d) throw new PreviewError("not_found", "Dose not found.", 404);
    d.status = body.status; d.confirmed_at = body.status === "SCHEDULED" ? null : now.toISOString(); return strip(d);
  }

  if (route === "/adherence/summary") {
    const due = s.doses.filter((d) => new Date(d.scheduled_at) <= now);
    const c = (st: T.DoseStatus) => due.filter((d) => d.status === st).length;
    return { scheduled_doses: due.length, reported_taken: c("TAKEN"), reported_missed: c("MISSED"), reported_skipped: c("SKIPPED"),
      reported_adherence_percentage: due.length ? Math.round((1000 * c("TAKEN")) / due.length) / 10 : null, note: "Preview sample data." };
  }
  if (route === "/adherence/history") {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - 6 + i);
      const ds = s.doses.filter((d) => sameDay(new Date(d.scheduled_at), day) && new Date(d.scheduled_at) <= now);
      const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      return { day: ymd, scheduled: ds.length, taken: ds.filter((d) => d.status === "TAKEN").length, missed: ds.filter((d) => d.status === "MISSED").length };
    });
  }

  if (route === "/trials/matches") {
    if (!s.profile?.conditions.length) return [];
    const order: Record<T.MatchStatus, number> = { POTENTIAL_MATCH: 0, MORE_INFORMATION_NEEDED: 1, KNOWN_CRITERIA_MISMATCH: 2 };
    return [...MATCHES, demoMatch(s)].sort((a, b) => order[a.status] - order[b.status]);
  }
  if (route === "/agent/updates") {
    const u = demoUpdate(s.demo);
    return { new_count: u.is_new ? 1 : 0, updates: [{ ...u, nct_id: DEMO_NCT, title: DEMO_MATCH.trial.title }], handled_events: [] };
  }
  if (route === "/agent/updates/seen") { s.demo.seen = true; return undefined; }
  if (route === "/agent/corrections") {
    const facts: { type: string }[] = body?.facts ?? [];
    const before = s.demo.stoppedInsulin;
    if (facts.some((f) => f.type === "medication_stopped")) s.demo.stoppedInsulin = true;
    if (facts.some((f) => f.type === "medication_taking")) s.demo.stoppedInsulin = false;
    if (body?.text && /stop/i.test(body.text) && /insulin/i.test(body.text)) s.demo.stoppedInsulin = true;
    if (before !== s.demo.stoppedInsulin) { s.demo.seen = false; s.demo.changedAt = now.toISOString(); }
    return { conclusions: [], conflicts: [], handled_events: [] };
  }
  if (route === "/trials/bookmarks") { if (method === "POST") s.bookmarks.push(body.nct_id); return method === "POST" ? { nct_id: body.nct_id } : s.bookmarks.map((n) => ({ nct_id: n, created_at: now.toISOString() })); }
  if (route === "/trials/search") {
    const q = new URLSearchParams(query).get("q")?.toLowerCase() ?? "";
    return MATCHES.map((m) => m.trial).filter((t) => t.title.toLowerCase().includes(q) || t.conditions.some((c) => c.toLowerCase().includes(q)));
  }
  const explain = route.match(/^\/trials\/(.+)\/explain$/);
  if (explain && decodeURIComponent(explain[1]) === DEMO_NCT) {
    const m = demoMatch(s);
    return { ...explanation(m), update: m.update, plain_summary: "Preview sample: this trial looks at how well metformin works for people with different versions of one gene." };
  }
  if (explain) {
    const m = MATCHES.find((x) => x.trial.nct_id === decodeURIComponent(explain[1]));
    if (!m) throw new PreviewError("not_found", "Trial not found in preview data.", 404);
    // Sample 2 shows the fallback view, as when Gemini is not configured.
    if (m.trial.nct_id === "NCT-SAMPLE-2") throw new PreviewError("gemini_unavailable", "Preview sample: explanation unavailable.", 503);
    return explanation(m);
  }
  if (route.startsWith("/trials/")) {
    const t = [...MATCHES, DEMO_MATCH].find((m) => m.trial.nct_id === decodeURIComponent(route.slice(8)))?.trial;
    if (!t) throw new PreviewError("not_found", "Trial not found in preview data.", 404);
    return t;
  }

  if (route === "/health-checkins") {
    if (method === "POST") {
      if (!body.consent_given) throw new PreviewError("validation_error", "Consent is required to save a check-in.", 422);
      const c: T.Checkin = { id: uid(), heart_rate: body.heart_rate, breathing_rate: body.breathing_rate, symptom_report: body.symptom_report, measurement_source: body.measurement_source, recorded_at: now.toISOString() };
      s.checkins.push(c); return c;
    }
    return s.checkins;
  }

  throw new PreviewError("not_in_preview", `Preview mode has no sample data for ${route}.`, 404);
}

export { PreviewError };
