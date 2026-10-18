// OWNER: Member 2 - today's doses as MedicationCard rows (design system: MedicationCard).
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { schedule } from "@/lib/api";
import type { Dose } from "@/types";
import { Loader, errorMessage } from "@/components/ui/pz";
import { ErrorState } from "../dashboard/ErrorState";
import { time24 } from "@/lib/format";
import { DoseConfirmation } from "./DoseConfirmation";

export function DoseList({ onDoseChange, refreshKey = 0, showScanLink = false }: { onDoseChange?: () => void; refreshKey?: number; showScanLink?: boolean }) {
  const [doses, setDoses] = useState<Dose[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => { setErr(null); schedule.today().then(setDoses).catch((e) => setErr(errorMessage(e))); }, [refreshKey, retry]);

  if (err) return <ErrorState message={err} onRetry={() => setRetry(retry + 1)} />;
  if (!doses) return <Loader label="Loading today's doses…" />;
  if (!doses.length) return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-ink-muted">No doses today. Scan a prescription and your schedule fills in by itself.</p>
      {showScanLink && <Link href="/medications" className="pz-btn pz-btn--secondary pz-btn--sm"><Upload aria-hidden="true" size={16} />Scan prescription</Link>}
    </div>
  );
  const update = (d: Dose) => { setDoses(doses.map((x) => (x.id === d.id ? d : x))); onDoseChange?.(); };
  return (
    <ul className="flex flex-col gap-3">
      {doses.map((d) => (
        <li key={d.id} className="pz-card !p-4">
          <div className="pz-dose flex-wrap">
            <time className="pz-dose__time" dateTime={d.scheduled_at}>{time24(d.scheduled_at)}</time>
            <div className="pz-dose__main" style={{ minWidth: "9rem" }}><p className="pz-dose__name">{d.medication_name}</p></div>
            <DoseConfirmation dose={d} onChange={update} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function nextDose(doses: Dose[]): Dose | undefined {
  const now = Date.now();
  return doses.filter((d) => d.status === "SCHEDULED" && new Date(d.scheduled_at).getTime() >= now)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
}
