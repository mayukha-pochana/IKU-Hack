// OWNER: Member 2 - one confirmed medication, its schedule in plain words, and "Log a dose" for when-needed medicines.
"use client";
import { useState } from "react";
import { Check, Pill, Plus } from "lucide-react";
import { medications } from "@/lib/api";
import type { Medication } from "@/types";
import { Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { describeSchedule } from "@/lib/schedule";
import { time24 } from "@/lib/format";

export function MedicationCard({ med, onLogged }: { med: Medication; onLogged?: () => void }) {
  const s = med.confirmed_schedule;
  const asNeeded = s.pattern === "as_needed";
  const [busy, setBusy] = useState(false);
  const [logged, setLogged] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function logDose() {
    setBusy(true); setErr(null);
    try { const d = await medications.logDose(med.id); setLogged(time24(d.scheduled_at)); onLogged?.(); }
    catch (e) { setErr(errorMessage(e, "Couldn't log that dose. Try again.")); }
    finally { setBusy(false); }
  }

  return (
    <article className="pz-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-mint-soft text-mint-text"><Pill aria-hidden="true" size={20} /></span>
          <div className="min-w-0">
            <h3 className="pz-card__title">{med.name}{med.strength && ` ${med.strength}`}</h3>
            {med.instructions && <p className="text-body-lg">{med.instructions}</p>}
          </div>
        </div>
      </div>
      <p className="pz-card__meta">{describeSchedule(s)}</p>
      {asNeeded && (
        <div className="flex flex-col gap-2">
          <button type="button" className="pz-btn pz-btn--secondary pz-btn--sm self-start" onClick={logDose} disabled={busy} aria-busy={busy}>
            {busy ? <Spinner /> : <Plus aria-hidden="true" size={16} />}Log a dose
          </button>
          {logged && <p className="inline-flex items-center gap-1 text-caption text-ink-muted"><Check aria-hidden="true" size={14} />Dose logged at {logged}.</p>}
          {err && <Notice tone="danger">{err}</Notice>}
        </div>
      )}
    </article>
  );
}
