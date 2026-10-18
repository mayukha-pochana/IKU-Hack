// OWNER: Member 2 - one confirmed medication, its schedule in plain words, "Log a dose" for when-needed medicines,
// and "Stop taking" (future doses are removed; past history is kept).
"use client";
import { useState } from "react";
import { Check, CircleOff, Pill, Plus } from "lucide-react";
import { medications } from "@/lib/api";
import type { Medication } from "@/types";
import { Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { describeSchedule } from "@/lib/schedule";
import { dateTimeUK, time24 } from "@/lib/format";

export function MedicationCard({ med, onChanged }: { med: Medication; onChanged?: () => void }) {
  const s = med.confirmed_schedule;
  const asNeeded = s.pattern === "as_needed";
  const [busy, setBusy] = useState<"log" | "stop" | null>(null);
  const [logged, setLogged] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function logDose() {
    setBusy("log"); setErr(null);
    try { const d = await medications.logDose(med.id); setLogged(time24(d.scheduled_at)); onChanged?.(); }
    catch (e) { setErr(errorMessage(e, "Couldn't log that dose. Try again.")); }
    finally { setBusy(null); }
  }

  async function stop() {
    setBusy("stop"); setErr(null);
    try { await medications.stop(med.id); setConfirmStop(false); onChanged?.(); }
    catch (e) { setErr(errorMessage(e, "Couldn't stop that medicine. Try again.")); }
    finally { setBusy(null); }
  }

  return (
    <article className={`pz-card ${s.stopped_at ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-mint-soft text-mint-text"><Pill aria-hidden="true" size={20} /></span>
          <div className="min-w-0">
            <h3 className="pz-card__title">{med.name}{med.strength && ` ${med.strength}`}</h3>
            {med.instructions && <p className="text-body-lg">{med.instructions}</p>}
          </div>
        </div>
      </div>
      {s.stopped_at ? (
        <p className="pz-badge pz-badge--neutral self-start"><CircleOff aria-hidden="true" strokeWidth={2.5} />Stopped {dateTimeUK(s.stopped_at)}</p>
      ) : (
        <>
          <p className="pz-card__meta">{describeSchedule(s)}</p>
          <div className="flex flex-wrap items-center gap-2">
            {asNeeded && (
              <button type="button" className="pz-btn pz-btn--secondary pz-btn--sm" onClick={logDose} disabled={!!busy} aria-busy={busy === "log"}>
                {busy === "log" ? <Spinner /> : <Plus aria-hidden="true" size={16} />}Log a dose
              </button>
            )}
            {!confirmStop && <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={() => setConfirmStop(true)}>Stop taking</button>}
          </div>
          {logged && <p className="inline-flex items-center gap-1 text-caption text-ink-muted"><Check aria-hidden="true" size={14} />Dose logged at {logged}.</p>}
          {confirmStop && (
            <div className="flex flex-col gap-2 rounded-lg border border-line p-3" role="group" aria-label={`Stop taking ${med.name}`}>
              <p>Stop {med.name}? Upcoming doses are removed from your schedule. Doses you&apos;ve already logged stay.</p>
              <p className="text-caption text-ink-muted">Only stop a medicine if your doctor or pharmacist has told you to, or you haven&apos;t started it.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="pz-btn pz-btn--secondary pz-btn--sm" onClick={stop} disabled={!!busy} aria-busy={busy === "stop"}>
                  {busy === "stop" ? <Spinner /> : <CircleOff aria-hidden="true" size={16} />}Yes, stop it
                </button>
                <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={() => setConfirmStop(false)} disabled={!!busy}>Cancel</button>
              </div>
            </div>
          )}
          {err && <Notice tone="danger">{err}</Notice>}
        </>
      )}
    </article>
  );
}
