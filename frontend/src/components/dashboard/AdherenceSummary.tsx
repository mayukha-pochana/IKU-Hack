// OWNER: Member 2 - self-reported adherence from GET /api/adherence/summary and /history.
"use client";
import { useEffect, useState } from "react";
import { adherence } from "@/lib/api";
import type { AdherenceDay, AdherenceSummary as S } from "@/types";
import { errorMessage } from "@/components/ui/pz";
import { AdherenceWeek } from "./AdherenceWeek";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

export function AdherenceSummary({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<S | null>(null);
  const [days, setDays] = useState<AdherenceDay[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setErr(null);
    adherence.summary().then(setData).catch((e) => setErr(errorMessage(e)));
    adherence.history().then(setDays).catch(() => setDays([]));
  }, [refreshKey, retry]);

  return (
    <section aria-labelledby="adh" className="pz-card">
      <h2 id="adh" className="pz-card__title">Your doses so far</h2>
      {err ? <ErrorState message={err} onRetry={() => setRetry(retry + 1)} /> : !data ? <LoadingState label="Adding up your doses…" /> : data.scheduled_doses === 0 ? (
        <p className="pz-card__body text-ink-muted">No doses were due yet. Once a dose time passes, it shows here.</p>
      ) : (
        <>
          <p className="pz-card__body"><span className="text-h2 text-ink">{data.reported_taken} of {data.scheduled_doses}</span> <span className="text-ink-muted">doses marked taken</span></p>
          <div className="pz-progress" role="img" aria-label={`${data.reported_taken} of ${data.scheduled_doses} doses marked taken`}>
            <span style={{ width: `${(100 * data.reported_taken) / data.scheduled_doses}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {data.reported_missed > 0 && <span className="pz-badge pz-badge--danger">{data.reported_missed} missed</span>}
            {data.reported_skipped > 0 && <span className="pz-badge pz-badge--neutral">{data.reported_skipped} skipped</span>}
          </div>
          {days.length > 0 && <AdherenceWeek days={days} />}
        </>
      )}
      <p className="text-caption text-ink-muted">Based on doses you marked yourself. We can&apos;t check whether a dose was actually taken.</p>
    </section>
  );
}
