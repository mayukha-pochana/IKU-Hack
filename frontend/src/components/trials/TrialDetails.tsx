// OWNER: Member 2 - trial overview, location, criteria, known mismatches, open questions and the official link.
"use client";
import { useEffect, useState } from "react";
import { Activity, Bookmark, BookmarkCheck, Check, CircleHelp, ExternalLink, MapPin, Pill, Stethoscope, UsersRound, X } from "lucide-react";
import { trials } from "@/lib/api";
import type { Trial, TrialExplanation, TrialMatch } from "@/types";
import { Loader, MatchBadge, Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { ReadAloud } from "@/components/ui/ReadAloud";
import { CriteriaInfo, PhaseInfo } from "@/components/ui/InfoTip";
import { TrialStatusBadge, ageRange, phaseLabel } from "./TrialMatchCard";
import { ExplanationCriteria, ExplanationExtras } from "./TrialExplanation";

function List({ items, icon: I, tone }: { items: string[]; icon: typeof Check; tone: string }) {
  return <ul className="flex flex-col gap-2">{items.map((x) => <li key={x} className="flex gap-2"><I aria-hidden="true" size={20} className={`mt-0.5 shrink-0 ${tone}`} />{x}</li>)}</ul>;
}

function Fact({ icon: I, label, children }: { icon: typeof Check; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-raised p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-violet-soft text-violet-text"><I aria-hidden="true" size={20} /></span>
      <div className="flex min-w-0 flex-col gap-1">
        <dt className="text-label text-ink-muted">{label}</dt>
        <dd className="text-body-lg font-medium">{children}</dd>
      </div>
    </div>
  );
}

export function TrialDetails({ trial: t, match }: { trial: Trial; match?: TrialMatch }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Gemini explanation; on any error we keep the match-based view below.
  const [explanation, setExplanation] = useState<TrialExplanation | null>(null);
  const [explaining, setExplaining] = useState(true);
  const uk = t.locations.filter((l) => l.country === "United Kingdom");
  const places = (uk.length ? uk : t.locations).slice(0, 8);

  useEffect(() => {
    let live = true;
    setExplanation(null); setExplaining(true);
    trials.explain(t.nct_id).then((x) => { if (live) setExplanation(x); }).catch(() => {}).finally(() => { if (live) setExplaining(false); });
    return () => { live = false; };
  }, [t.nct_id]);
  const x = explanation;
  const status = x?.status ?? match?.status;
  const summary = x?.plain_summary ?? match?.plain_language_summary ?? null;

  async function bookmark() {
    setBusy(true); setErr(null);
    try { await trials.bookmark(t.nct_id); setSaved(true); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="pz-card__row">
          {status && <MatchBadge status={status} />}
          {t.phases.map((p) => <span key={p} className="pz-badge pz-badge--neutral">{phaseLabel(p)}</span>)}
          {t.phases.length > 0 && <PhaseInfo />}
          <TrialStatusBadge status={t.status} />
          <span className="text-caption text-ink-muted">{t.nct_id}</span>
        </div>
        <h1 className="text-h1">{t.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="pz-btn pz-btn--secondary pz-btn--sm" onClick={bookmark} disabled={busy || saved} aria-busy={busy}>
            {busy ? <Spinner /> : saved ? <BookmarkCheck aria-hidden="true" size={16} /> : <Bookmark aria-hidden="true" size={16} />}{saved ? "Saved" : "Save trial"}
          </button>
          <ReadAloud request={{ kind: "trial", nct_id: t.nct_id }} label="Read this trial aloud" />
          <a href={t.url} target="_blank" rel="noreferrer" className="pz-btn pz-btn--ghost pz-btn--sm">Official trial page <ExternalLink aria-hidden="true" size={16} /></a>
        </div>
        {err && <Notice tone="danger">{err}</Notice>}
      </header>

      <Notice>This is a preliminary match, not a confirmation of eligibility. The trial team makes the final decision.</Notice>

      {explaining && <Loader label="Explaining this trial…" />}

      {!explaining && (summary || t.brief_summary) && (
        <section className="pz-card"><h2 className="pz-card__title">What this trial is about</h2>
          <p className="text-body-lg">{summary ?? t.brief_summary}</p>
          {summary && t.brief_summary && <details><summary className="pz-link cursor-pointer">Official summary</summary><p className="mt-2 text-ink-muted">{t.brief_summary}</p></details>}
        </section>
      )}

      {x && (
        <>
          {x.why_surfaced.length > 0 && <section className="pz-card"><h2 className="pz-card__title">Why it was shown</h2><List items={x.why_surfaced} icon={Check} tone="text-success" /></section>}
          <ExplanationCriteria criteria={x.criteria} />
          <ExplanationExtras explanation={x} />
        </>
      )}

      {!explaining && !x && match && (
        <div className="grid gap-4 md:grid-cols-2">
          {match.why_surfaced.length > 0 && <section className="pz-card"><h2 className="pz-card__title">Why it was shown</h2><List items={match.why_surfaced} icon={Check} tone="text-success" /></section>}
          {match.relevant_criteria.length > 0 && <section className="pz-card"><h2 className="pz-card__title">Requirements that look relevant to you</h2><List items={match.relevant_criteria} icon={match.status === "KNOWN_CRITERIA_MISMATCH" ? X : Check} tone={match.status === "KNOWN_CRITERIA_MISMATCH" ? "text-danger" : "text-success"} /></section>}
          {match.missing_information.length > 0 && <section className="pz-card"><h2 className="pz-card__title">What we don&apos;t know yet</h2><List items={match.missing_information} icon={CircleHelp} tone="text-warning" /></section>}
          {match.needs_coordinator_confirmation.length > 0 && <section className="pz-card bg-violet-soft"><h2 className="pz-card__title">Questions to ask the trial team</h2><List items={match.needs_coordinator_confirmation} icon={CircleHelp} tone="text-violet-text" /></section>}
        </div>
      )}

      <section aria-labelledby="facts-h" className="flex flex-col gap-3">
        <h2 id="facts-h" className="text-h2">Key facts</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact icon={UsersRound} label="Ages">{ageRange(t.min_age, t.max_age)}</Fact>
          <Fact icon={Activity} label="Recruitment">{t.status ? <TrialStatusBadge status={t.status} /> : "Not listed"}</Fact>
          <Fact icon={Stethoscope} label="Conditions">{t.conditions.join(", ") || "Not listed"}</Fact>
          <Fact icon={Pill} label="Treatments tested">{t.interventions.join(", ") || "Not listed"}</Fact>
        </dl>
      </section>

      {places.length > 0 && (
        <section className="pz-card"><h2 className="pz-card__title">Where it runs{uk.length ? " in the UK" : ""}</h2>
          <ul className="flex flex-col gap-2">{places.map((l, i) => <li key={i} className="flex gap-2"><MapPin aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-violet-text" />{[l.facility, l.city, l.country].filter(Boolean).join(", ")}</li>)}</ul>
          {t.locations.length > places.length && <p className="pz-card__meta">And {t.locations.length - places.length} more sites. See the official page for the full list.</p>}
        </section>
      )}

      <section className="pz-card"><h2 className="pz-card__title flex items-center gap-1">Full eligibility criteria <CriteriaInfo /></h2>
        <p className="pz-card__meta">As written by the researchers on ClinicalTrials.gov.</p>
        <details><summary className="pz-link cursor-pointer">Who can take part (inclusion)</summary><p className="mt-2 whitespace-pre-wrap text-ink-muted">{t.inclusion_criteria ?? "Not listed."}</p></details>
        <details><summary className="pz-link cursor-pointer">Who can&apos;t take part (exclusion)</summary><p className="mt-2 whitespace-pre-wrap text-ink-muted">{t.exclusion_criteria ?? "Not listed."}</p></details>
      </section>
    </article>
  );
}
