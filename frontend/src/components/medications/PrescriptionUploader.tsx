// OWNER: Member 2 - photos of the label (1-3 sides) -> Gemini extraction -> patient checks and edits every field
// -> explicit confirm -> save. Nothing about dosing is invented or saved without the patient confirming it.
"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Plus, Sparkles, Trash2, X } from "lucide-react";
import { PrescriptionDoodle } from "@/components/ui/Doodles";
import { medications, prescriptions } from "@/lib/api";
import type { ParsedPrescription, SchedulePattern } from "@/types";
import { Chip, Loader, Notice, Segmented, Spinner, TextField, errorMessage } from "@/components/ui/pz";
import { WEEKDAYS, fieldOf, fromFrequency } from "@/lib/schedule";

type Form = {
  name: string; strength: string; instructions: string; frequency: string; pattern: SchedulePattern;
  times: string[]; suggested: boolean; interval: string; weekdays: number[]; duration: string;
};
const MAX_MB = 8;
const MAX_PHOTOS = 3;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const PATTERNS: { value: SchedulePattern; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "every_n_days", label: "Every few days" },
  { value: "weekly", label: "Some weekdays" },
  { value: "as_needed", label: "When needed" },
];

function toForm(p: ParsedPrescription): Form {
  const { pattern, suggested } = fromFrequency(p.frequency);
  const printed = p.times.length > 0; // times printed on the label always win over suggestions
  return {
    name: p.medication_name ?? "", strength: p.strength ?? "", instructions: p.dose_instructions ?? "", frequency: (p.frequency ?? "").replace(/_/g, " "),
    pattern, times: printed ? p.times : suggested ?? [""], suggested: !printed && !!suggested,
    interval: "2", weekdays: [], duration: p.duration_days ? String(p.duration_days) : "",
  };
}

type Photo = { file: File; url: string };

export function PrescriptionUploader({ onSaved }: { onSaved: () => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [parsed, setParsed] = useState<ParsedPrescription | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  function addFiles(list: FileList | null | undefined) {
    setErr(null); setSaved(null);
    const incoming = Array.from(list ?? []);
    for (const file of incoming) {
      if (!TYPES.includes(file.type)) { setErr("That file type won't work. Use a JPG, PNG or WebP photo."); return; }
      if (file.size > MAX_MB * 1024 * 1024) { setErr(`That photo is over ${MAX_MB} MB. Try a smaller one.`); return; }
    }
    const room = MAX_PHOTOS - photos.length;
    if (incoming.length > room) setErr(`Up to ${MAX_PHOTOS} photos of the same label.`);
    setPhotos([...photos, ...incoming.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    if (camera.current) camera.current.value = "";
    if (gallery.current) gallery.current.value = "";
  }

  const remove = (i: number) => { URL.revokeObjectURL(photos[i].url); setPhotos(photos.filter((_, j) => j !== i)); };

  async function read() {
    if (!photos.length) return;
    setBusy("read"); setErr(null);
    try { const p = await prescriptions.parse(photos.map((x) => x.file)); setParsed(p); setF(toForm(p)); }
    catch (e) { setErr(errorMessage(e, "We couldn't read that label. Try clearer, well-lit photos.")); }
    finally { setBusy(null); }
  }

  function reset() { photos.forEach((p) => URL.revokeObjectURL(p.url)); setPhotos([]); setParsed(null); setF(null); setErr(null); }

  const needsTimes = f?.pattern !== "as_needed";
  const timesOk = f ? !needsTimes || (f.times.filter(Boolean).length > 0 && f.times.filter(Boolean).every((t) => TIME.test(t))) : false;
  const durationOk = f ? /^\d+$/.test(f.duration) && Number(f.duration) >= 1 : false;
  const intervalOk = f ? f.pattern !== "every_n_days" || (/^\d+$/.test(f.interval) && Number(f.interval) >= 2 && Number(f.interval) <= 90) : false;
  const weekdaysOk = f ? f.pattern !== "weekly" || f.weekdays.length > 0 : false;

  async function confirm(e: React.FormEvent) {
    e.preventDefault(); if (!f) return;
    if (!f.name.trim() || !timesOk || !durationOk || !intervalOk || !weekdaysOk) { setErr("Check the highlighted details, then confirm."); return; }
    setBusy("save"); setErr(null);
    try {
      await medications.create({
        name: f.name.trim(), strength: f.strength.trim() || null, instructions: f.instructions.trim() || null, frequency: f.frequency.trim() || null,
        schedule: {
          pattern: f.pattern, times: needsTimes ? f.times.filter(Boolean).sort() : [], duration_days: Number(f.duration),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
          interval_days: f.pattern === "every_n_days" ? Number(f.interval) : null, weekdays: f.pattern === "weekly" ? f.weekdays : null,
        },
      });
      setSaved(`${f.name.trim()} saved. ${f.pattern === "as_needed" ? "Log a dose from Saved medicines whenever you take it." : "Your schedule is ready."}`);
      reset(); onSaved();
    } catch (e) { setErr(errorMessage(e, "We couldn't save that medicine. Please try again.")); }
    finally { setBusy(null); }
  }

  const setTime = (i: number, v: string) => f && setF({ ...f, suggested: false, times: f.times.map((t, j) => (j === i ? v : t)) });
  const unsure = (field: ReturnType<typeof fieldOf>) => parsed?.uncertainties.filter((u) => fieldOf(u) === field) ?? [];
  const general = parsed?.uncertainties.filter((u) => fieldOf(u) === null) ?? [];
  const Unsure = ({ field }: { field: ReturnType<typeof fieldOf> }) => (
    <>{unsure(field).map((u) => <span key={u} className="pz-field__help !text-warning">Check this: {u}</span>)}</>
  );

  return (
    <section className="pz-diary !gap-5" aria-labelledby="scan-h">
      <input ref={camera} type="file" accept={TYPES.join(",")} capture="environment" className="sr-only" tabIndex={-1}
        onChange={(e) => addFiles(e.target.files)} aria-label="Take a photo of the label" />
      <input ref={gallery} type="file" accept={TYPES.join(",")} multiple className="sr-only" tabIndex={-1}
        onChange={(e) => addFiles(e.target.files)} aria-label="Upload photos of the label" />

      {!f && busy !== "read" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          className={`flex flex-col items-center gap-4 rounded-[22px] text-center transition-colors ${drag ? "bg-violet-soft/70 outline-dashed outline-2 outline-violet" : ""}`}>
          {photos.length === 0 && <PrescriptionDoodle />}
          <div className="flex flex-col gap-1.5">
            <h2 id="scan-h" className="text-[24px] font-semibold leading-8 tracking-[-0.01em]">Scan a prescription</h2>
            {photos.length === 0 && <p className="mx-auto max-w-[32ch] text-ink-muted">Snap your prescription or medicine label. If it wraps round the bottle, add up to {MAX_PHOTOS} sides.</p>}
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
          {photos.length === 0 ? (
            <>
              <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
                <button type="button" className="pz-btn pz-btn--primary w-full sm:w-auto" onClick={() => camera.current?.click()}><Camera aria-hidden="true" size={20} />Take a photo</button>
                <button type="button" className="pz-link inline-flex items-center gap-1.5 text-label" onClick={() => gallery.current?.click()}><ImagePlus aria-hidden="true" size={16} />or choose from your photos</button>
              </div>
              <p className="text-caption text-ink-muted">JPG, PNG or WebP, up to {MAX_MB} MB each. We read it, then you check every detail.</p>
            </>
          ) : (
            <>
              <ul className="flex flex-wrap justify-center gap-3" aria-label="Label photos">
                {photos.map((p, i) => (
                  <li key={p.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Label photo ${i + 1}`} className="h-24 w-24 rounded-[18px] border-2 border-white object-cover shadow-[0_6px_16px_rgba(59,47,143,0.15)]" />
                    <button type="button" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}
                      className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-pill border border-line bg-surface-raised shadow-sm"><X aria-hidden="true" size={16} /></button>
                  </li>
                ))}
              </ul>
              <p className="text-label font-normal text-ink-muted">{photos.length} of {MAX_PHOTOS} photos. Add another side if part of the label is hidden.</p>
              <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
                <button type="button" className="pz-btn pz-btn--primary w-full sm:w-auto" onClick={read}><Sparkles aria-hidden="true" size={20} />Read label</button>
                {photos.length < MAX_PHOTOS && (
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                    <button type="button" className="pz-link inline-flex items-center gap-1.5 text-label" onClick={() => camera.current?.click()}><Camera aria-hidden="true" size={16} />Add another side</button>
                    <button type="button" className="pz-link inline-flex items-center gap-1.5 text-label" onClick={() => gallery.current?.click()}><ImagePlus aria-hidden="true" size={16} />From your photos</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {(f || busy === "read") && <h2 id="scan-h" className="text-h2">Scan a prescription</h2>}
      {busy === "read" && <Loader label={`Reading ${photos.length > 1 ? `${photos.length} photos of your label` : "your label"}…`} />}
      {saved && <Notice tone="success">{saved}</Notice>}
      {err && <Notice tone="danger">{err}</Notice>}
      {f && parsed && (
        <form onSubmit={confirm} className="flex flex-col gap-4">
          <Notice>Check these details match your prescription. Nothing is saved until you confirm.</Notice>
          {general.length > 0 && (
            <Notice tone="warning">
              <p className="font-medium">Please check:</p>
              <ul className="mt-1 list-disc pl-5">{general.map((u) => <li key={u}>{u}</li>)}</ul>
            </Notice>
          )}
          {parsed.plain_language_summary && <p className="rounded-md bg-mint-soft p-4"><span className="text-label">In plain English: </span>{parsed.plain_language_summary}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <TextField id="rx-name" label="Medicine" wide required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={!f.name.trim() ? "Not found on the label. Type it in." : null} />
              <Unsure field="name" />
            </div>
            <div className="flex flex-col gap-1">
              <TextField id="rx-strength" label="Strength" wide value={f.strength} placeholder="For example, 100 mcg" onChange={(e) => setF({ ...f, strength: e.target.value })} />
              <Unsure field="strength" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <TextField id="rx-instructions" label="How to take it" wide value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} help="Exactly as written on your label." />
            <Unsure field="instructions" />
          </div>
          <div className="flex flex-col gap-1">
            <TextField id="rx-frequency" label="How often (as written)" wide value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} />
            <Unsure field="frequency" />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="pz-field__label mb-1">Schedule</legend>
            <Segmented label="How the doses repeat" value={f.pattern} options={PATTERNS} onChange={(pattern) => setF({ ...f, pattern })} />
            {f.pattern === "every_n_days" && (
              <TextField id="rx-interval" label="Every how many days" inputMode="numeric" className="max-w-[200px]" value={f.interval}
                onChange={(e) => setF({ ...f, interval: e.target.value.replace(/[^0-9]/g, "") })} error={!intervalOk ? "Between 2 and 90 days." : null} />
            )}
            {f.pattern === "weekly" && (
              <div className="flex flex-col gap-2" role="group" aria-label="Days of the week">
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d, i) => (
                    <Chip key={d} pressed={f.weekdays.includes(i)} onClick={() => setF({ ...f, weekdays: f.weekdays.includes(i) ? f.weekdays.filter((x) => x !== i) : [...f.weekdays, i] })}>{d}</Chip>
                  ))}
                </div>
                {!weekdaysOk && <span className="pz-field__help !text-danger">Pick at least one day.</span>}
              </div>
            )}
            {f.pattern === "as_needed" ? (
              <p className="text-ink-muted">No set times. Log a dose from Saved medicines whenever you take it.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="pz-field__label">Dose times (24-hour)</span>
                {f.suggested && <span className="pz-badge pz-badge--neutral self-start"><Sparkles aria-hidden="true" strokeWidth={2.5} />Suggested, change if needed</span>}
                {f.times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input aria-label={`Dose time ${i + 1}`} type="time" className="pz-field__input w-36" value={t} onChange={(e) => setTime(i, e.target.value)} />
                    {f.times.length > 1 && <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" aria-label={`Remove time ${i + 1}`} onClick={() => setF({ ...f, suggested: false, times: f.times.filter((_, j) => j !== i) })}><Trash2 aria-hidden="true" size={16} /></button>}
                  </div>
                ))}
                {f.times.length < 4 && <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm self-start" onClick={() => setF({ ...f, suggested: false, times: [...f.times, ""] })}><Plus aria-hidden="true" size={16} />Add a time</button>}
                {!timesOk && <span className="pz-field__help !text-danger">Add at least one time, like 09:00.</span>}
                <Unsure field="times" />
              </div>
            )}
          </fieldset>

          <div className="flex flex-col gap-1">
            <TextField id="rx-duration" label={f.pattern === "as_needed" ? "For up to how many days" : "For how many days"} inputMode="numeric" className="max-w-[200px]" value={f.duration}
              onChange={(e) => setF({ ...f, duration: e.target.value.replace(/[^0-9]/g, "") })}
              error={!durationOk ? "Not on the label. Check with your pharmacist and type it in." : null} />
            <Unsure field="duration" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="pz-btn pz-btn--primary" disabled={busy === "save"} aria-busy={busy === "save"}>{busy === "save" ? <><Spinner /> Saving…</> : "Confirm and save"}</button>
            <button type="button" className="pz-btn pz-btn--ghost" onClick={reset}>Start again</button>
          </div>
        </form>
      )}
    </section>
  );
}
