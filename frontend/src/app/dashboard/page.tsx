// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";
import { checkins, profile, schedule, trials } from "@/lib/api";
import type { Checkin, Dose, TrialMatch } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdherenceSummary } from "@/components/dashboard/AdherenceSummary";
import { nextDose } from "@/components/medications/DoseList";
import { MedicationCalendar } from "@/components/medications/MedicationCalendar";
import { TrialMatchCard } from "@/components/trials/TrialMatchCard";
import { saveMatches } from "@/components/trials/matchCache";
import { Loader, Notice } from "@/components/ui/pz";
import { ReadAloud } from "@/components/ui/ReadAloud";
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

  const shown = matches?.filter((m) => m.status !== "KNOWN_CRITERIA_MISMATCH").slice(0, 3) ?? [];
  return (
    <DashboardLayout>
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{greeting()}{name && `, ${name}`}</h1>
        <p className="text-ink-muted">Here&apos;s your day at a glance.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="today-h" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="today-h" className="text-h2">Your medications this week</h2>
              <ReadAloud request={{ kind: "schedule" }} label="Read today's schedule aloud" />
            </div>
            <div className="pz-card"><MedicationCalendar showScanLink refreshKey={tick} onDoseChange={() => setTick((t) => t + 1)} /></div>
          </section>

          <section aria-labelledby="trials-h" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="trials-h" className="flex items-center gap-1 text-h2">Your trial matches <ClinicalTrialInfo /></h2>
              <Link href="/trials" className="pz-btn pz-btn--ghost pz-btn--sm whitespace-nowrap">See all <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
            {!matches ? <Loader label="Checking trials for you…" /> : shown.length ? (
              <div className="flex flex-col gap-3">{shown.map((m) => <TrialMatchCard key={m.trial.nct_id} match={m} />)}</div>
            ) : (
              <Notice>No possible matches yet. Add or update your conditions in <Link href="/profile" className="pz-link">My profile</Link> and we&apos;ll check again.</Notice>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="next-h" className="pz-card bg-violet-soft">
            <h2 id="next-h" className="text-label text-ink-muted">Next dose</h2>
            {next === undefined ? <p className="text-ink-muted">Loading…</p> : next ? (
              <div className="pz-dose"><time className="pz-dose__time" dateTime={next.scheduled_at}>{time24(next.scheduled_at)}</time><p className="pz-dose__name">{next.medication_name}</p></div>
            ) : <p className="pz-card__body">Nothing else scheduled this week.</p>}
          </section>

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
