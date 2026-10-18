// OWNER: Member 2 - upload -> Gemini extraction -> patient checks and edits every field -> explicit confirm -> save.
"use client";
import { useRef, useState } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { PrescriptionDoodle } from "@/components/ui/Doodles";
import { medications, prescriptions } from "@/lib/api";
import type { ParsedPrescription } from "@/types";
import { Loader, Notice, Spinner, TextField, errorMessage } from "@/components/ui/pz";

type Form = { name: string; strength: string; instructions: string; frequency: string; times: string[]; duration: string };
const MAX_MB = 10;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const toForm = (p: ParsedPrescription): Form => ({
  name: p.medication_name ?? "", strength: p.strength ?? "", instructions: p.dose_instructions ?? "",
  frequency: p.frequency ?? "", times: p.times.length ? p.times : [""], duration: p.duration_days ? String(p.duration_days) : "",
});

export function PrescriptionUploader({ onSaved }: { onSaved: () => void }) {
  const input = useRef<HTMLInputElement>(null); // opens the camera on phones
  const library = useRef<HTMLInputElement>(null); // photo library / files
  const [parsed, setParsed] = useState<ParsedPrescription | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setErr(null); setSaved(null);
    if (!TYPES.includes(file.type)) { setErr("That file type won't work. Use a JPG, PNG or WebP photo."); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setErr(`That photo is over ${MAX_MB} MB. Try a smaller one.`); return; }
    setBusy("read");
    try { const p = await prescriptions.parse(file); setParsed(p); setF(toForm(p)); }
    catch (e) { setErr(errorMessage(e, "We couldn't read that prescription. Try a clearer, well-lit photo.")); }
    finally { setBusy(null); if (input.current) input.current.value = ""; }
  }

  const timesOk = f ? f.times.filter(Boolean).length > 0 && f.times.filter(Boolean).every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) : false;
  const durationOk = f ? /^\d+$/.test(f.duration) && Number(f.duration) >= 1 : false;

  async function confirm(e: React.FormEvent) {
    e.preventDefault(); if (!f) return;
    if (!f.name.trim() || !timesOk || !durationOk) { setErr("Fill in the medicine name, at least one time (like 09:00) and how many days, then confirm."); return; }
    setBusy("save"); setErr(null);
    try {
      await medications.create({
        name: f.name.trim(), strength: f.strength.trim() || null, instructions: f.instructions.trim() || null, frequency: f.frequency.trim() || null,
        schedule: { times: f.times.filter(Boolean).sort(), duration_days: Number(f.duration), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London" },
      });
      setSaved(`${f.name.trim()} saved. Your schedule is ready.`); setParsed(null); setF(null); onSaved();
    } catch (e) { setErr(errorMessage(e, "We couldn't save that medicine. Please try again.")); }
    finally { setBusy(null); }
  }

  const setTime = (i: number, v: string) => f && setF({ ...f, times: f.times.map((t, j) => (j === i ? v : t)) });

  return (
    <section className="pz-diary !gap-5" aria-labelledby="scan-h">
      {!f && busy !== "read" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void onFile(e.dataTransfer.files?.[0]); }}
          className={`flex flex-col items-center gap-4 rounded-[22px] text-center transition-colors ${drag ? "bg-violet-soft/70 outline-dashed outline-2 outline-violet" : ""}`}>
          <PrescriptionDoodle />
          <div className="flex flex-col gap-1.5">
            <h2 id="scan-h" className="text-[24px] font-semibold leading-8 tracking-[-0.01em]">Scan a prescription</h2>
            <p className="mx-auto max-w-[30ch] text-ink-muted">Snap your prescription or medicine label. We read it, then you check every detail.</p>
          </div>
          {/* Three tiny steps, so it's clear nothing is saved until you check it. */}
          <ol className="flex items-center gap-2 text-label font-medium" aria-label="How it works">
            {[["Snap", "#e6faf3", "#0b7a5c"], ["Check", "#f1edfd", "#5a46b8"], ["Done", "#fff8e1", "#8a6206"]].map(([t, bg, fg], i) => (
              <li key={t} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="h-px w-4 bg-line-strong" />}
                <span className="inline-flex items-center gap-1.5 rounded-pill py-1 pl-1 pr-3" style={{ background: bg, color: fg }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-white text-[12px]">{i + 1}</span>{t}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
            <button type="button" className="pz-btn pz-btn--primary w-full sm:w-auto" onClick={() => input.current?.click()}><Camera aria-hidden="true" size={20} />Take a photo</button>
            <button type="button" className="pz-link text-label" onClick={() => library.current?.click()}>or choose one from your photos</button>
          </div>
          <p className="text-caption text-ink-muted">JPG, PNG or WebP, up to {MAX_MB} MB</p>
          <input ref={input} type="file" accept={TYPES.join(",")} capture="environment" className="sr-only" tabIndex={-1}
            onChange={(e) => onFile(e.target.files?.[0])} aria-label="Take a photo of your prescription" />
          <input ref={library} type="file" accept={TYPES.join(",")} className="sr-only" tabIndex={-1}
            onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choose a prescription photo" />
        </div>
      )}
      {(f || busy === "read") && <h2 id="scan-h" className="text-h2">Scan a prescription</h2>}
      {busy === "read" && <Loader label="Reading your prescription…" />}
      {saved && <Notice tone="success">{saved}</Notice>}
      {err && <Notice tone="danger">{err}</Notice>}
      {f && parsed && (
        <form onSubmit={confirm} className="flex flex-col gap-4">
          <Notice>Check these details match your prescription. Nothing is saved until you confirm.</Notice>
          {parsed.uncertainties.length > 0 && (
            <Notice tone="warning">
              <p className="font-medium">Please check these. We couldn&apos;t read them clearly:</p>
              <ul className="mt-1 list-disc pl-5">{parsed.uncertainties.map((u) => <li key={u}>{u}</li>)}</ul>
            </Notice>
          )}
          {parsed.plain_language_summary && <p className="rounded-md bg-mint-soft p-4"><span className="text-label">In plain English: </span>{parsed.plain_language_summary}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="rx-name" label="Medicine" wide required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={!f.name.trim() ? "Not found on the prescription. Type it in." : null} />
            <TextField id="rx-strength" label="Strength" wide value={f.strength} placeholder="For example, 100 mcg" onChange={(e) => setF({ ...f, strength: e.target.value })} />
          </div>
          <TextField id="rx-instructions" label="How to take it" wide value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} help="Exactly as written on your prescription." />
          <TextField id="rx-frequency" label="How often" wide value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} />
          <fieldset className="flex flex-col gap-2">
            <legend className="pz-field__label mb-1">Dose times (24-hour)</legend>
            {f.times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input aria-label={`Dose time ${i + 1}`} type="time" className="pz-field__input w-36" value={t} onChange={(e) => setTime(i, e.target.value)} />
                {f.times.length > 1 && <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" aria-label={`Remove time ${i + 1}`} onClick={() => setF({ ...f, times: f.times.filter((_, j) => j !== i) })}><Trash2 aria-hidden="true" size={16} /></button>}
              </div>
            ))}
            {f.times.length < 4 && <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm self-start" onClick={() => setF({ ...f, times: [...f.times, ""] })}><Plus aria-hidden="true" size={16} />Add a time</button>}
            {!timesOk && <span className="pz-field__help !text-danger">Add at least one time, like 09:00.</span>}
          </fieldset>
          <TextField id="rx-duration" label="For how many days" inputMode="numeric" className="max-w-[200px]" value={f.duration}
            onChange={(e) => setF({ ...f, duration: e.target.value.replace(/[^0-9]/g, "") })}
            error={!durationOk ? "Not on the prescription. Check with your pharmacist and type it in." : null} />
          <div className="flex flex-wrap gap-3">
            <button className="pz-btn pz-btn--primary" disabled={busy === "save"} aria-busy={busy === "save"}>{busy === "save" ? <><Spinner /> Saving…</> : "Confirm and save"}</button>
            <button type="button" className="pz-btn pz-btn--ghost" onClick={() => { setParsed(null); setF(null); setErr(null); }}>Start again</button>
          </div>
        </form>
      )}
    </section>
  );
}
