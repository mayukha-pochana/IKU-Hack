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
import { Loader, Notice, errorMessage } from "@/components/ui/pz";
import { ClinicalTrialInfo, MatchTypeInfo } from "@/components/ui/InfoTip";
import { PhaseFilter } from "@/components/trials/PhaseFilter";
import { cn } from "@/lib/utils";
import { phaseLabel } from "@/components/trials/TrialMatchCard";
import { PoundSterling } from "lucide-react";
import { isPaid } from "@/lib/payment";

const ORDER: MatchStatus[] = ["POTENTIAL_MATCH", "MORE_INFORMATION_NEEDED", "KNOWN_CRITERIA_MISMATCH"];
type View = "best" | MatchStatus | "all";
const VIEWS: { value: View; label: string; statuses: MatchStatus[] }[] = [
  { value: "best", label: "Best matches", statuses: ["POTENTIAL_MATCH", "MORE_INFORMATION_NEEDED"] },
  { value: "POTENTIAL_MATCH", label: "Possible", statuses: ["POTENTIAL_MATCH"] },
  { value: "MORE_INFORMATION_NEEDED", label: "Needs info", statuses: ["MORE_INFORMATION_NEEDED"] },
  { value: "KNOWN_CRITERIA_MISMATCH", label: "Not a match", statuses: ["KNOWN_CRITERIA_MISMATCH"] },
  { value: "all", label: "All", statuses: ORDER },
];

export default function TrialsPage() {
  const [m, setM] = useState<TrialMatch[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState<View>("best");
  const [phases, setPhases] = useState<string[]>([]); // empty = any phase
  const [paidOnly, setPaidOnly] = useState(false);

  useEffect(() => { setErr(null); setM(null); trials.matches().then((x) => { saveMatches(x); setM(x); }).catch((e) => setErr(errorMessage(e))); }, [retry]);

  const statuses = VIEWS.find((v) => v.value === view)!.statuses;
  const phasesOf = (x: TrialMatch) => (x.trial.phases.length ? x.trial.phases.map(phaseLabel) : ["No phase"]);
  const paidOk = (x: TrialMatch) => !paidOnly || isPaid(x.trial);
  const inView = (m ?? []).filter((x) => statuses.includes(x.status) && paidOk(x));
  const viewCount = (v: (typeof VIEWS)[number]) => (m ?? []).filter((x) => v.statuses.includes(x.status) && paidOk(x) && (phases.length === 0 || phasesOf(x).some((p) => phases.includes(p)))).length;
  const paidCount = (m ?? []).filter((x) => statuses.includes(x.status) && isPaid(x.trial) && (phases.length === 0 || phasesOf(x).some((p) => phases.includes(p)))).length;
  const phaseCount = (p: string) => inView.filter((x) => phasesOf(x).includes(p)).length;
  const shown = inView
    .filter((x) => phases.length === 0 || phasesOf(x).some((p) => phases.includes(p)))
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
            {/* One sleek bar: match view (segmented) + phase dropdown. */}
            <div className="pz-glass flex items-center gap-2 rounded-[22px] border border-line p-1.5 shadow-[0_6px_20px_rgba(59,47,143,0.08)]">
              <div className="pz-fade-right min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max gap-1" role="radiogroup" aria-label="Show matches">
                  {VIEWS.map((v) => {
                    const on = v.value === view;
                    return (
                      <button key={v.value} type="button" role="radio" aria-checked={on} onClick={() => setView(v.value)}
                        className={cn("inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-label transition-all duration-300",
                          on ? "bg-violet text-violet-on shadow-[0_4px_12px_rgba(59,47,143,0.3)]" : "text-ink-muted hover:bg-violet-soft hover:text-ink")}>
                        {v.label}
                        <span className={cn("rounded-pill px-1.5 text-[13px] leading-5", on ? "bg-white/20" : "bg-violet-soft text-violet-text")}>{viewCount(v)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="button" aria-pressed={paidOnly} onClick={() => setPaidOnly(!paidOnly)} title="Only trials that say they pay participants or cover costs"
                className={cn("inline-flex h-10 shrink-0 items-center gap-1 rounded-pill border-[1.5px] px-2.5 text-label transition-colors sm:px-3",
                  paidOnly ? "border-[#f4cf5d] bg-[#fff4d6] text-[#8a6206]" : "border-line-strong bg-surface-raised text-ink hover:border-violet")}>
                <PoundSterling aria-hidden="true" size={15} /><span className="max-sm:sr-only">Paid</span><span className="sr-only"> trials only</span>
                <span className={cn("rounded-pill px-1.5 text-[13px] leading-5", paidOnly ? "bg-white/70" : "bg-violet-soft text-violet-text")}>{paidCount}</span>
              </button>
              <PhaseFilter selected={phases} onChange={setPhases} count={phaseCount} />
            </div>
            {shown.length ? <div className="grid gap-4 lg:grid-cols-2">{shown.map((x) => <TrialMatchCard key={x.trial.nct_id} match={x} />)}</div>
              : <p className="text-ink-muted">No trials match these filters. Try another view, or clear the Paid and phase filters.</p>}
          </>
        )}
      </section>

      <TrialSearch />
    </DashboardLayout>
  );
}
