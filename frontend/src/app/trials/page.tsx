// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { trials } from "@/lib/api";
import type { MatchStatus, TrialMatch } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TrialMatchCard } from "@/components/trials/TrialMatchCard";
import { TrialSearch } from "@/components/trials/TrialSearch";
import { saveMatches } from "@/components/trials/matchCache";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { Chip, Loader, MATCH_LABEL, Notice, errorMessage } from "@/components/ui/pz";
import { ClinicalTrialInfo, MatchTypeInfo, PhaseInfo } from "@/components/ui/InfoTip";
import { phaseLabel } from "@/components/trials/TrialMatchCard";

const ORDER: MatchStatus[] = ["POTENTIAL_MATCH", "MORE_INFORMATION_NEEDED", "KNOWN_CRITERIA_MISMATCH"];

export default function TrialsPage() {
  const [m, setM] = useState<TrialMatch[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [hide, setHide] = useState<MatchStatus[]>(["KNOWN_CRITERIA_MISMATCH"]);
  const [hidePhase, setHidePhase] = useState<string[]>([]);

  useEffect(() => { setErr(null); setM(null); trials.matches().then((x) => { saveMatches(x); setM(x); }).catch((e) => setErr(errorMessage(e))); }, [retry]);

  const count = (s: MatchStatus) => m?.filter((x) => x.status === s).length ?? 0;
  const phasesOf = (x: TrialMatch) => (x.trial.phases.length ? x.trial.phases.map(phaseLabel) : ["No phase"]);
  // Always list every phase so people see the full range; ones with no matches show (0) and can't be toggled.
  const allPhases = ["Early phase 1", "Phase 1", "Phase 2", "Phase 3", "Phase 4", "No phase"];
  // A trial that just changed stays visible even if its status is filtered out, so the patient can see why.
  const visible = (x: TrialMatch) => !hide.includes(x.status) || !!x.update?.is_new;
  const phaseCount = (p: string) => (m ?? []).filter((x) => visible(x) && phasesOf(x).includes(p)).length;
  const shown = (m ?? [])
    .filter((x) => visible(x) && phasesOf(x).some((p) => !hidePhase.includes(p)))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <DashboardLayout>
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-1 text-h1">Clinical trials <ClinicalTrialInfo /></h1>
        <p className="text-ink-muted">Recruiting trials from ClinicalTrials.gov, checked against your profile.</p>
      </header>
      <Notice>These are preliminary matches, not a confirmation of eligibility. The trial team makes the final decision.</Notice>

      <section aria-labelledby="matches-h" className="flex flex-col gap-4">
        <h2 id="matches-h" className="flex items-center gap-1 text-h2">Your matches <MatchTypeInfo /></h2>
        {err && <ErrorState message={err} onRetry={() => setRetry(retry + 1)} />}
        {!m && !err && <Loader label="Checking trials for you…" />}
        {m && m.length === 0 && <Notice>No matches yet. Add a condition in <Link href="/profile" className="pz-link">My profile</Link> and we&apos;ll check again.</Notice>}
        {m && m.length > 0 && (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center" role="group" aria-labelledby="f-match">
                <span id="f-match" className="text-label text-ink-muted sm:min-w-[88px]">Match</span>
                <div className="pz-chip-row">
                  {ORDER.map((s) => (
                    <Chip key={s} pressed={!hide.includes(s)} onClick={() => setHide(hide.includes(s) ? hide.filter((x) => x !== s) : [...hide, s])}>
                      {MATCH_LABEL[s].label} ({count(s)})
                    </Chip>
                  ))}
                </div>
              </div>
              {(m ?? []).length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center" role="group" aria-labelledby="f-phase">
                  <span id="f-phase" className="flex items-center text-label text-ink-muted sm:min-w-[88px]">Phase <PhaseInfo /></span>
                  <div className="pz-chip-row">
                    {allPhases.map((p) => phaseCount(p) === 0 ? (
                      <span key={p} className="pz-chip cursor-default border-line text-ink-muted opacity-60" aria-disabled="true">{p} (0)</span>
                    ) : (
                      <Chip key={p} pressed={!hidePhase.includes(p)} onClick={() => setHidePhase(hidePhase.includes(p) ? hidePhase.filter((x) => x !== p) : [...hidePhase, p])}>
                        {p} ({phaseCount(p)})
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {shown.length ? <div className="grid gap-4 lg:grid-cols-2">{shown.map((x) => <TrialMatchCard key={x.trial.nct_id} match={x} />)}</div>
              : <p className="text-ink-muted">No trials with these filters. Turn a filter on to see more.</p>}
          </>
        )}
      </section>

      <TrialSearch />
    </DashboardLayout>
  );
}
