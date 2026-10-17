// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import { trials } from "@/lib/api";
import type { TrialMatch } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TrialMatchCard } from "@/components/trials/TrialMatchCard";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";

export default function TrialsPage() {
  const [m, setM] = useState<TrialMatch[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { trials.matches().then(setM).catch((e) => setErr(e.message)); }, []);
  return (
    <DashboardLayout>
      <h1 className="mb-1 text-3xl font-bold">Clinical Trials</h1>
      <p className="mb-4 text-sm text-slate-600">Preliminary matches from ClinicalTrials.gov. The study team decides eligibility.</p>
      {err && <ErrorState message={err} />}
      {!m && !err && <LoadingState />}
      {m?.length === 0 && <p>No matches yet. Add a condition in your profile.</p>}
      <div className="space-y-3">{m?.map((x) => <TrialMatchCard key={x.trial.nct_id} match={x} />)}</div>
      {/* TODO(M2): free-text search box -> trials.search(); show "cached data" banner if X-Trials-Source: cache */}
    </DashboardLayout>
  );
}
