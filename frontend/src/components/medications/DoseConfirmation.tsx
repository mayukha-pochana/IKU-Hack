// OWNER: Member 2 - patient-reported status only (not verified ingestion).
"use client";
import { schedule } from "@/lib/api";
import type { Dose } from "@/types";

export function DoseConfirmation({ dose, onChange }: { dose: Dose; onChange: (d: Dose) => void }) {
  const set = async (status: "TAKEN" | "SKIPPED") => onChange(await schedule.setStatus(dose.id, status));
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{dose.status}</span>
      {dose.status === "SCHEDULED" && (<>
        <button className="rounded bg-brand-600 px-3 py-1 text-white" onClick={() => set("TAKEN")}>I took it</button>
        <button className="rounded border px-3 py-1" onClick={() => set("SKIPPED")}>Skip</button>
      </>)}
    </div>
  );
}
