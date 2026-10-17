// OWNER: Member 2 - weekly/daily schedule list grouped by day.
"use client";
import { useEffect, useState } from "react";
import { schedule } from "@/lib/api";
import type { Dose } from "@/types";
import { DoseConfirmation } from "./DoseConfirmation";
import { LoadingState } from "../dashboard/LoadingState";

export function MedicationCalendar({ onDoseChange }: { onDoseChange?: () => void }) {
  const [doses, setDoses] = useState<Dose[] | null>(null);
  useEffect(() => { schedule.week().then(setDoses).catch(() => setDoses([])); }, []);
  if (!doses) return <LoadingState />;
  if (!doses.length) return <p className="text-slate-600">No doses scheduled. Scan a prescription to get started.</p>;
  const update = (d: Dose) => { setDoses(doses.map((x) => (x.id === d.id ? d : x))); onDoseChange?.(); };
  return (
    <ul className="space-y-2">
      {doses.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between rounded border p-3">
          <span><time dateTime={d.scheduled_at}>{new Date(d.scheduled_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</time> · {d.medication_name}</span>
          <DoseConfirmation dose={d} onChange={update} />
        </li>
      ))}
    </ul>
  );
}
