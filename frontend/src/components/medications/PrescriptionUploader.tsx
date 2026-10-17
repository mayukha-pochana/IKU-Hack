// OWNER: Member 2 - upload -> Gemini extraction -> explicit confirmation -> save.
"use client";
import { useState } from "react";
import { medications, prescriptions } from "@/lib/api";
import type { ParsedPrescription } from "@/types";
import { ErrorState } from "../dashboard/ErrorState";

export function PrescriptionUploader({ onSaved }: { onSaved: () => void }) {
  const [parsed, setParsed] = useState<ParsedPrescription | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true); setErr(null);
    try { setParsed(await prescriptions.parse(f)); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function confirm() {
    if (!parsed?.medication_name || !parsed.times.length || !parsed.duration_days) {
      setErr("Please fill in medication name, times and duration before saving."); return;
    }
    await medications.create({
      name: parsed.medication_name, strength: parsed.strength, instructions: parsed.dose_instructions,
      frequency: parsed.frequency, schedule: { times: parsed.times, duration_days: parsed.duration_days, timezone: "Europe/London" },
    });
    setParsed(null); onSaved();
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Scan a prescription</h2>
      <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
        onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload prescription image" />
      {busy && <p role="status">Reading prescription…</p>}
      {err && <ErrorState message={err} />}
      {parsed && (
        <div className="mt-4 space-y-2">
          <p className="font-medium">Please check these details. Nothing is saved until you confirm.</p>
          {/* TODO(M2): editable inputs bound to `parsed` so the patient can correct fields */}
          <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-sm">{JSON.stringify(parsed, null, 2)}</pre>
          {parsed.uncertainties.length > 0 && <ul className="list-disc pl-5 text-amber-800">{parsed.uncertainties.map((u) => <li key={u}>{u}</li>)}</ul>}
          <button onClick={confirm} className="rounded bg-brand-600 px-4 py-2 text-white">Confirm and save</button>
        </div>
      )}
    </section>
  );
}
