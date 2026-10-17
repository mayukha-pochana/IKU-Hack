// OWNER: Member 2 - diary history from GET /api/health-checkins.
"use client";
import { useEffect, useState } from "react";
import { HeartPulse, Wind } from "lucide-react";
import { checkins } from "@/lib/api";
import type { Checkin } from "@/types";
import { dateTimeUK } from "@/lib/format";
import { fromReport } from "@/lib/diary";
import { Loader } from "@/components/ui/pz";
import { MoodIcon } from "@/components/biometrics/MoodIcon";

export function HealthHistory({ refreshKey = 0, limit }: { refreshKey?: number; limit?: number }) {
  const [rows, setRows] = useState<Checkin[] | null>(null);
  useEffect(() => { checkins.list().then(setRows).catch(() => setRows([])); }, [refreshKey]);
  if (!rows) return <Loader label="Loading your diary…" />;
  if (!rows.length) return <p className="text-ink-muted">No diary entries yet.</p>;
  const list = [...rows].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)).slice(0, limit);
  return (
    <ul className="flex flex-col gap-3">
      {list.map((c) => {
        const { mood, note } = fromReport(c.symptom_report);
        return (
          <li key={c.id} className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <time dateTime={c.recorded_at} className="text-label">{dateTimeUK(c.recorded_at)}</time>
              {mood && <span className="pz-badge pz-badge--neutral"><MoodIcon mood={mood} size={16} />Feeling {mood.toLowerCase()}</span>}
            </div>
            {(c.heart_rate != null || c.breathing_rate != null) && (
              <div className="flex flex-wrap gap-4">
                {c.heart_rate != null && <span className="flex items-center gap-2"><HeartPulse aria-hidden="true" size={18} className="text-violet-text" />{Math.round(c.heart_rate)} bpm</span>}
                {c.breathing_rate != null && <span className="flex items-center gap-2"><Wind aria-hidden="true" size={18} className="text-violet-text" />{Math.round(c.breathing_rate)} breaths/min</span>}
                {c.measurement_source === "presage_sdk" && <span className="self-center text-caption text-ink-muted">Measured with Presage</span>}
              </div>
            )}
            {note && <p className="text-ink-muted">{note}</p>}
            {!mood && !note && c.heart_rate == null && c.breathing_rate == null && <p className="text-ink-muted">Checked in, no details added.</p>}
          </li>
        );
      })}
    </ul>
  );
}
