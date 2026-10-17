// OWNER: Member 2 - patient-reported dose status only (never verified ingestion).
"use client";
import { useState } from "react";
import { Check, Undo2 } from "lucide-react";
import { schedule } from "@/lib/api";
import type { Dose, DoseStatus } from "@/types";
import { DoseBadge, Spinner, errorMessage } from "@/components/ui/pz";
import { isLaterDay, time24 } from "@/lib/format";

export function DoseConfirmation({ dose, onChange }: { dose: Dose; onChange: (d: Dose) => void }) {
  const [busy, setBusy] = useState<DoseStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const due = !isLaterDay(dose.scheduled_at); // any of today's doses can be logged

  async function set(status: DoseStatus) {
    setBusy(status); setErr(null);
    try { onChange(await schedule.setStatus(dose.id, status)); }
    catch (e) { setErr(errorMessage(e, "That didn't save. Try again.")); }
    finally { setBusy(null); }
  }

  return (
    <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {dose.status === "SCHEDULED" && due ? (
          <>
            <button type="button" className="pz-btn pz-btn--success pz-btn--sm" onClick={() => set("TAKEN")} disabled={busy !== null} aria-busy={busy === "TAKEN"}>
              {busy === "TAKEN" ? <Spinner /> : <Check aria-hidden="true" size={16} strokeWidth={2.5} />} Mark taken
            </button>
            <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={() => set("SKIPPED")} disabled={busy !== null}>Skip</button>
          </>
        ) : (
          <>
            <DoseBadge status={dose.status} at={time24(dose.scheduled_at)} />
            {dose.status !== "SCHEDULED" && (
              <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={() => set("SCHEDULED")} disabled={busy !== null} aria-label={`Undo, mark ${dose.medication_name} as not logged`}>
                {busy === "SCHEDULED" ? <Spinner /> : <Undo2 aria-hidden="true" size={16} />} Undo
              </button>
            )}
            {dose.status === "MISSED" && (
              <button type="button" className="pz-btn pz-btn--success pz-btn--sm" onClick={() => set("TAKEN")} disabled={busy !== null}>I took it late</button>
            )}
          </>
        )}
      </div>
      {err && <span role="alert" className="text-label font-normal text-danger">{err}</span>}
    </div>
  );
}
