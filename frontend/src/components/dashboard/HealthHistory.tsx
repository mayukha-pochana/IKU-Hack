// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import { checkins } from "@/lib/api";
import type { Checkin } from "@/types";

export function HealthHistory({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<Checkin[]>([]);
  useEffect(() => { checkins.list().then(setRows).catch(() => setRows([])); }, [refreshKey]);
  if (!rows.length) return <p className="text-slate-600">No check-ins yet. Check-ins are optional.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((c) => (
        <li key={c.id} className="rounded border p-3">
          <time dateTime={c.recorded_at}>{new Date(c.recorded_at).toLocaleString()}</time>
          {c.heart_rate != null && <span className="ml-3">HR {c.heart_rate}</span>}
          {c.breathing_rate != null && <span className="ml-3">Breathing {c.breathing_rate}</span>}
          {c.symptom_report && <p className="text-sm">{c.symptom_report}</p>}
        </li>
      ))}
    </ul>
  );
}
