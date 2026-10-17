// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import { adherence } from "@/lib/api";
import type { AdherenceSummary as S } from "@/types";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

export function AdherenceSummary({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<S | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { adherence.summary().then(setData).catch((e) => setErr(e.message)); }, [refreshKey]);
  if (err) return <ErrorState message={err} />;
  if (!data) return <LoadingState />;
  return (
    <section aria-labelledby="adh" className="rounded-lg border p-4">
      <h2 id="adh" className="text-lg font-semibold">Adherence (self-reported)</h2>
      {data.scheduled_doses === 0 ? <p className="text-slate-600">No doses due yet.</p> : (
        <p className="text-3xl font-bold">{data.reported_adherence_percentage}%
          <span className="ml-2 text-base font-normal text-slate-600">{data.reported_taken} of {data.scheduled_doses} doses reported taken</span></p>
      )}
      <p className="text-xs text-slate-600">{data.note}</p>
      {/* TODO(M2): 7-day history chart from /api/adherence/history */}
    </section>
  );
}
