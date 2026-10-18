// OWNER: Member 2 - one trial in a list (design system: TrialCard). Never claims eligibility.
"use client";
import { useState } from "react";
import Link from "next/link";
import { CircleDot, CircleOff, MapPin } from "lucide-react";
import type { Trial, TrialMatch, TrialUpdate } from "@/types";
import { MatchBadge } from "@/components/ui/pz";
import { FixIt, UpdateDetails } from "./TrialUpdate";

/** ClinicalTrials.gov phase codes in plain English: EARLY_PHASE1, PHASE1..PHASE4, NA. */
export function phaseLabel(p: string) {
  const code = p.toUpperCase();
  if (code === "NA") return "No phase";
  const m = code.match(/^(EARLY_)?PHASE\s*(\d)$/);
  return m ? `${m[1] ? "Early phase" : "Phase"} ${m[2]}` : p;
}
const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/** Recruiting = green; any other ClinicalTrials.gov status (not yet recruiting, completed, ...) = red. */
export function TrialStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return status === "RECRUITING"
    ? <span className="pz-badge pz-badge--success"><CircleDot aria-hidden="true" />Recruiting</span>
    : <span className="pz-badge pz-badge--danger"><CircleOff aria-hidden="true" />{statusLabel(status)}</span>;
}

const age = (a: string | null) => a?.replace(/\s*Years?$/i, "").replace(/\s*Months?$/i, " months").trim() ?? null;
export function ageRange(min: string | null, max: string | null) {
  const lo = age(min), hi = age(max);
  if (lo && hi) return `${lo} to ${hi}${/months/.test(hi) ? "" : " years"}`;
  if (lo) return `${lo}${/months/.test(lo) ? "" : " years"} and over`;
  if (hi) return `Up to ${hi}${/months/.test(hi) ? "" : " years"}`;
  return "Not listed";
}

export function trialPlace(t: Trial) {
  const l = t.locations.find((x) => x.country === "United Kingdom") ?? t.locations[0];
  if (!l) return null;
  const more = t.locations.length > 1 ? ` and ${t.locations.length - 1} more` : "";
  return [l.facility, l.city].filter(Boolean).join(", ") + more;
}

export function TrialMatchCard({ match, trial: bare }: { match?: TrialMatch; trial?: Trial }) {
  const t = match?.trial ?? bare!;
  const place = trialPlace(t);
  // A trial the patient has opened carries CareFlow's latest update; a fix updates this card in place.
  const [update, setUpdate] = useState<TrialUpdate | null | undefined>(match?.update);
  const status = update?.status ?? match?.status;
  return (
    <article className="pz-card">
      <div className="pz-card__row">
        {status ? <MatchBadge status={status} /> : <span className="pz-badge pz-badge--neutral">Search result</span>}
        {t.phases.map((p) => <span key={p} className="pz-badge pz-badge--neutral">{phaseLabel(p)}</span>)}
        <TrialStatusBadge status={t.status} />
      </div>
      <h3 className="pz-card__title">{t.title}</h3>
      {place && <p className="pz-card__meta inline-flex items-center gap-1"><MapPin aria-hidden="true" size={14} />{place}</p>}
      {update && <UpdateDetails update={update} />}
      {update && <FixIt nctId={t.nct_id} update={update} onUpdated={(u) => setUpdate(u ?? update)} />}
      {!update && match && match.why_surfaced.length > 0 && <p className="pz-card__body">Shown because {match.why_surfaced.map((w) => w.replace(/\.$/, "").toLowerCase()).join(", ")}.</p>}
      {!match && t.brief_summary && <p className="pz-card__body line-clamp-3 text-ink-muted">{t.brief_summary}</p>}
      <div className="pz-card__actions">
        <Link href={`/trials/${t.nct_id}`} className="pz-btn pz-btn--secondary pz-btn--sm">Explain this trial</Link>
      </div>
      {match && <p className="text-caption text-ink-muted">{match.disclaimer}</p>}
    </article>
  );
}
