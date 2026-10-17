// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { profile, trials } from "@/lib/api";
import type { TrialMatch } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdherenceSummary } from "@/components/dashboard/AdherenceSummary";
import { HealthHistory } from "@/components/dashboard/HealthHistory";
import { MedicationCalendar } from "@/components/medications/MedicationCalendar";
import { TrialMatchCard } from "@/components/trials/TrialMatchCard";

export default function Dashboard() {
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<TrialMatch[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    profile.get().then((p) => setName(p.display_name)).catch(() => {});
    trials.matches().then((m) => setMatches(m.slice(0, 3))).catch(() => {});
  }, []);
  return (
    <DashboardLayout>
      <h1 className="mb-6 text-3xl font-bold">Hello{name && `, ${name}`}</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="mb-2 text-xl font-semibold">This week&apos;s medications</h2><MedicationCalendar onDoseChange={() => setTick(tick + 1)} /></section>
        <AdherenceSummary refreshKey={tick} />
        <section><h2 className="mb-2 text-xl font-semibold">Potential clinical trials</h2>
          {matches.length ? matches.map((m) => <TrialMatchCard key={m.trial.nct_id} match={m} />) : <p className="text-slate-600">Add a condition to your profile to see trials.</p>}</section>
        <section><h2 className="mb-2 text-xl font-semibold">Health check-ins</h2><HealthHistory /><Link href="/check-in" className="underline">Start a check-in</Link></section>
      </div>
    </DashboardLayout>
  );
}
