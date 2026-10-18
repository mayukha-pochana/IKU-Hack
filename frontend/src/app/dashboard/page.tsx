// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, NotebookPen, Search } from "lucide-react";
import { checkins, profile, schedule, trials } from "@/lib/api";
import type { Checkin, Dose, TrialMatch } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdherenceSummary } from "@/components/dashboard/AdherenceSummary";
import { nextDose } from "@/components/medications/DoseList";
import { MedicationCalendar } from "@/components/medications/MedicationCalendar";
import { TrialMatchCard } from "@/components/trials/TrialMatchCard";
import { saveMatches } from "@/components/trials/matchCache";
import { Loader, Notice } from "@/components/ui/pz";
import { ClinicalTrialInfo } from "@/components/ui/InfoTip";
import { dateTimeUK, greeting, time24 } from "@/lib/format";

export default function Dashboard() {
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<TrialMatch[] | null>(null);
  const [next, setNext] = useState<Dose | null | undefined>(undefined);
  const [last, setLast] = useState<Checkin | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    profile.get().then((p) => setName(p.display_name)).catch(() => {});
    trials.matches().then((m) => { saveMatches(m); setMatches(m); }).catch(() => setMatches([]));
    checkins.list().then((c) => setLast([...c].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0] ?? null)).catch(() => {});
  }, []);
  useEffect(() => { schedule.week().then((w) => setNext(nextDose(w) ?? null)).catch(() => setNext(null)); }, [tick]);

  const possible = matches?.filter((m) => m.status === "POTENTIAL_MATCH").length ?? 0;
  const shown = matches?.filter((m) => m.status !== "KNOWN_CRITERIA_MISMATCH").slice(0, 3) ?? [];
  return (
    <DashboardLayout>
      {/* Hero: violet blending into mint, with today's key facts as frosted chips. */}
      <section className="pz-hero" aria-labelledby="hello-h">
        <p className="text-label font-normal opacity-85">{greeting()}</p>
        <h1 id="hello-h" className="text-[34px] font-semibold leading-[40px] tracking-[-0.02em] md:text-display">{name || "Welcome back"}</h1>
        <p className="mt-1 text-body-lg opacity-90">Here&apos;s your day at a glance.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="pz-hero__chip"><Clock aria-hidden="true" size={18} />
            <span>{next === undefined ? "Checking your next dose…" : next ? <>Next dose <strong className="font-semibold">{time24(next.scheduled_at)}</strong> · {next.medication_name}</> : "Nothing else scheduled this week"}</span>
          </span>
          {matches && possible > 0 && (
            <Link href="/trials" className="pz-hero__chip transition-colors hover:bg-white/25"><Search aria-hidden="true" size={18} /><span>{possible} possible trial {possible === 1 ? "match" : "matches"}</span><ArrowRight aria-hidden="true" size={16} /></Link>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="today-h" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="today-h" className="whitespace-nowrap text-[20px] font-semibold leading-7 md:text-h2">Your medications this week</h2>
            </div>
            <div className="pz-card"><MedicationCalendar showScanLink refreshKey={tick} onDoseChange={() => setTick((t) => t + 1)} /></div>
          </section>

          <section aria-labelledby="trials-h" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="trials-h" className="flex min-w-0 items-center gap-1 whitespace-nowrap text-[20px] font-semibold leading-7 md:text-h2">Your trial matches <ClinicalTrialInfo /></h2>
              <Link href="/trials" className="pz-btn pz-btn--ghost pz-btn--sm shrink-0 whitespace-nowrap max-sm:!px-2">See all <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
            {!matches ? <Loader label="Checking trials for you…" /> : shown.length ? (
              <div className="flex flex-col gap-3">{shown.map((m) => <TrialMatchCard key={m.trial.nct_id} match={m} />)}</div>
            ) : (
              <Notice>No possible matches yet. Add or update your conditions in <Link href="/profile" className="pz-link">My profile</Link> and we&apos;ll check again.</Notice>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="ci-h" className="pz-card">
            <h2 id="ci-h" className="pz-card__title">Daily diary</h2>
            <p className="pz-card__body text-ink-muted">{last ? `Last entry: ${dateTimeUK(last.recorded_at)}.` : "How are you feeling today? Add a quick note, and heart rate and breathing if you like."}</p>
            <Link href="/check-in" className="pz-btn pz-btn--secondary self-start"><NotebookPen aria-hidden="true" size={20} />Write today&apos;s entry</Link>
          </section>

          <AdherenceSummary refreshKey={tick} />
        </div>
      </div>
    </DashboardLayout>
  );
}
