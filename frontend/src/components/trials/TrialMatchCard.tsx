// OWNER: Member 2 - one trial in a list (design system: TrialCard). Never claims eligibility.
"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleDot, CircleOff, MapPin, PoundSterling } from "lucide-react";
import { isPaid } from "@/lib/payment";
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
    <article className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface-raised p-4 shadow-[0_4px_16px_rgba(59,47,143,0.05)] sm:p-5">
      {/* One quiet row: the match badge, then phase and recruitment as plain text. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {status ? <MatchBadge status={status} /> : <span className="pz-badge pz-badge--neutral">Search result</span>}
        <span className="flex items-center gap-1.5 text-caption text-ink-muted">
          {t.phases.map((p) => <span key={p}>{phaseLabel(p)}</span>)}
          {t.phases.length > 0 && t.status && <span aria-hidden="true">·</span>}
          {t.status && <span className={t.status === "RECRUITING" ? "text-mint-text" : "text-danger"}>{t.status === "RECRUITING" ? "Recruiting" : statusLabel(t.status)}</span>}
        </span>
      </div>
      <h3 className="text-[18px] font-semibold leading-6 tracking-[-0.01em]">{t.title}</h3>
      {(place || isPaid(t)) && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-muted">
          {place && <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={13} />{place}</span>}
          {isPaid(t) && <span className="inline-flex items-center gap-1 rounded-pill bg-[#fff4d6] px-2 py-0.5 font-medium text-[#8a6206]"><PoundSterling aria-hidden="true" size={12} />Pays participants</span>}
        </p>
      )}
      {update && <UpdateDetails update={update} />}
      {update && <FixIt nctId={t.nct_id} update={update} onUpdated={(u) => setUpdate(u ?? update)} />}
      {!update && match && match.why_surfaced.length > 0 && <p className="line-clamp-2 text-label font-normal text-ink">Shown because {match.why_surfaced.map((w) => w.replace(/\.$/, "").toLowerCase()).join(", ")}.</p>}
      {!match && t.brief_summary && <p className="line-clamp-3 text-label font-normal text-ink-muted">{t.brief_summary}</p>}
      <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
        {match ? <p className="text-[12px] leading-4 text-ink-muted">{match.disclaimer}</p> : <span />}
        <Link href={`/trials/${t.nct_id}`} className="group inline-flex shrink-0 items-center gap-1 text-label font-semibold text-violet-text">
          Explain<span className="max-sm:hidden"> this trial</span><ArrowRight aria-hidden="true" size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
