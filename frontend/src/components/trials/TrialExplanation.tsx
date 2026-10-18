// OWNER: Member 2 - Gemini trial explanation (POST /trials/{nct_id}/explain). Pre-screen only, never an eligibility decision.
import Link from "next/link";
import { CircleHelp, UserRound } from "lucide-react";
import type { CriterionAssessment, CriterionEffect, EvidenceSource, TrialExplanation as Explanation } from "@/types";
import { Badge, Notice } from "@/components/ui/pz";
import { GeminiCredit } from "@/components/ui/GeminiCredit";

/** supports = success, conflicts = danger, unknown = warning. Badge always pairs an icon with the word. */
export const EFFECT_LABEL: Record<CriterionEffect, { tone: "success" | "danger" | "warning"; label: string }> = {
  supports: { tone: "success", label: "In your favour" },
  conflicts: { tone: "danger", label: "May not fit you" },
  unknown: { tone: "warning", label: "Not known yet" },
};

/** Where the evidence for a criterion came from, in the patient's words. */
export const EVIDENCE_LABEL: Record<EvidenceSource, string> = {
  profile: "From your profile",
  medication: "From your medication list",
  patient_correction: "From what you told us",
  patient_note: "From your note",
  sensor_reading: "From your check-in (camera estimate)",
  none: "From your profile",
};

export const KIND_HEADING: Record<CriterionAssessment["kind"], string> = {
  inclusion: "Who can take part",
  exclusion: "Who can't take part",
};

/** Inclusion before exclusion; within each, things that may not fit first, then unknowns, then the rest. */
export function groupCriteria(criteria: CriterionAssessment[]) {
  const order: Record<CriterionEffect, number> = { conflicts: 0, unknown: 1, supports: 2 };
  const sort = (xs: CriterionAssessment[]) => xs.map((c, i) => ({ c, i })).sort((a, b) => order[a.c.effect] - order[b.c.effect] || a.i - b.i).map((x) => x.c);
  return (["inclusion", "exclusion"] as const)
    .map((kind) => ({ kind, heading: KIND_HEADING[kind], items: sort(criteria.filter((c) => c.kind === kind)) }))
    .filter((g) => g.items.length > 0);
}

function Criterion({ c }: { c: CriterionAssessment }) {
  const e = EFFECT_LABEL[c.effect];
  return (
    <li className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-body-lg">{c.plain_text}</p>
        <Badge tone={e.tone}>{e.label}</Badge>
      </div>
      {c.evidence && <p className="text-caption text-ink-muted">{EVIDENCE_LABEL[c.evidence_source ?? "profile"]}: {c.evidence}</p>}
      {c.note && <p className="text-caption text-ink-muted">{c.note}</p>}
      <details>
        <summary className="pz-link cursor-pointer text-caption">Original wording</summary>
        <p className="mt-1 whitespace-pre-wrap text-caption text-ink-muted">{c.original_text}</p>
        {!c.quote_verified && <p className="mt-1 text-caption text-ink-muted">We couldn&apos;t find this exact wording on ClinicalTrials.gov. Check the official trial page.</p>}
      </details>
    </li>
  );
}

export function ExplanationCriteria({ criteria }: { criteria: CriterionAssessment[] }) {
  const groups = groupCriteria(criteria);
  if (!groups.length) return null;
  return (
    <section className="pz-card" aria-labelledby="explain-criteria-h">
      <h2 id="explain-criteria-h" className="pz-card__title">How the requirements compare with your profile</h2>
      <p className="pz-card__meta">An early check against what you&apos;ve told us. The trial team decides who can take part.</p>
      {groups.map((g) => (
        <div key={g.kind} className="flex flex-col">
          <h3 className="text-h3">{g.heading}</h3>
          <ul>{g.items.map((c, i) => <Criterion key={`${g.kind}-${i}`} c={c} />)}</ul>
        </div>
      ))}
      <GeminiCredit what="Requirements explained by Gemini" />
    </section>
  );
}

export function ExplanationExtras({ explanation: x }: { explanation: Explanation }) {
  return (
    <>
      {x.missing_profile_fields.length > 0 && (
        <Notice tone="warning">
          <p className="font-medium">Adding these to your profile would help us check this trial:</p>
          <ul className="my-2 list-disc pl-5">{x.missing_profile_fields.map((f) => <li key={f}>{f}</li>)}</ul>
          <Link href="/profile" className="pz-btn pz-btn--secondary pz-btn--sm"><UserRound aria-hidden="true" size={16} />Update My profile</Link>
        </Notice>
      )}
      {x.questions_to_ask.length > 0 && (
        <section className="pz-card bg-violet-soft"><h2 className="pz-card__title">Questions to ask the trial team</h2>
          <ul className="flex flex-col gap-2">{x.questions_to_ask.map((q) => <li key={q} className="flex gap-2"><CircleHelp aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-violet-text" />{q}</li>)}</ul>
          <GeminiCredit what="Suggested by Gemini" />
        </section>
      )}
    </>
  );
}
