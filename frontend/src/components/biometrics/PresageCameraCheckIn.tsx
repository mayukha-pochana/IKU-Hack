// OWNER: Member 2 (UI) with Member 4 (SDK). Daily diary entry: how you feel, an optional note,
// and optional heart rate / breathing measured with Presage. NO simulated readings - ever.
"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, HeartPulse, RotateCcw, Wind } from "lucide-react";
import { checkins } from "@/lib/api";
import { MOODS, toReport, type Mood } from "@/lib/diary";
import { Loader, Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { cn } from "@/lib/utils";
import { MoodIcon } from "./MoodIcon";
import { PresageInfo } from "@/components/ui/InfoTip";

type Phase = "idle" | "measuring" | "done" | "unavailable" | "failed" | "denied";
type Reading = { heart_rate: number | null; breathing_rate: number | null };

/** TODO(M4): replace with the real Presage SDK call once platform support is confirmed
 *  (see backend/app/services/presage/README.md). Must resolve with real SDK output only. */
async function runPresageMeasurement(_video: HTMLVideoElement): Promise<Reading> {
  throw new Error("PRESAGE_NOT_INTEGRATED");
}

export function PresageCameraCheckIn({ onSaved }: { onSaved: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cameraOk, setCameraOk] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [keepReading, setKeepReading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; if (video.current) video.current.srcObject = null; };
  useEffect(() => stop, []);

  async function measure() {
    setErr(null); setReading(null);
    if (!navigator.mediaDevices?.getUserMedia) { setPhase("unavailable"); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }); // browser asks for permission here
      if (video.current) video.current.srcObject = stream.current;
      setPhase("measuring");
      setReading(await runPresageMeasurement(video.current!)); setPhase("done"); setKeepReading(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : e instanceof Error ? e.message : "";
      setPhase(name === "PRESAGE_NOT_INTEGRATED" ? "unavailable" : name === "NotAllowedError" ? "denied" : "failed");
    } finally { stop(); } // never keep or store video
  }

  const withReading = reading && keepReading ? reading : null;

  async function save() {
    setSaving(true); setErr(null);
    try {
      await checkins.create({
        heart_rate: withReading?.heart_rate ?? null, breathing_rate: withReading?.breathing_rate ?? null,
        symptom_report: toReport(mood, note), measurement_source: withReading ? "presage_sdk" : "none",
        consent_given: true, // the person pressed "Save to my diary"; vitals also need the camera consent above
      });
      setSaved(true); setMood(null); setNote(""); setReading(null); setPhase("idle"); setOpen(false); onSaved();
    } catch (e) { setErr(errorMessage(e, "We couldn't save your entry. Please try again.")); }
    finally { setSaving(false); }
  }

  if (saved) return (
    <section className="pz-card items-start">
      <Notice tone="success">Saved to your diary. You can see it in your history below.</Notice>
      <button type="button" className="pz-btn pz-btn--secondary" onClick={() => setSaved(false)}>Add another entry</button>
    </section>
  );

  return (
    <section className="pz-card gap-6" aria-labelledby="diary-h">
      <fieldset className="flex flex-col gap-3">
        <legend id="diary-h" className="pz-card__title mb-3">How are you feeling today?</legend>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-labelledby="diary-h">
          {MOODS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mood === m} onClick={() => setMood(mood === m ? null : m)}
              className={cn("flex min-h-tap min-w-0 flex-col items-center gap-1.5 rounded-md border-[1.5px] px-0.5 py-3 text-[13px] font-medium leading-5 transition-colors sm:text-label",
                mood === m ? "border-violet bg-violet text-violet-on hover:bg-violet" : "border-line-strong bg-surface-raised text-ink hover:bg-violet-soft")}>
              <MoodIcon mood={m} size={28} />{m}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="pz-field pz-field--wide">
        <label htmlFor="diary-note" className="pz-field__label">Anything else you want to note?</label>
        <textarea id="diary-note" className="pz-field__input pz-field__textarea" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="For example, a bit wheezy after climbing stairs" />
      </div>

      <div className="rounded-md border border-line">
        <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={open} aria-controls="vitals" onClick={() => setOpen(!open)}>
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-violet-soft text-violet-text"><HeartPulse aria-hidden="true" size={20} /></span>
            <span><span className="block font-semibold">Add heart rate and breathing</span><span className="text-label font-normal text-ink-muted">Measured with your camera by Presage</span></span>
          </span>
          <ChevronDown aria-hidden="true" size={20} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        <div id="vitals" hidden={!open} className="border-t border-line p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_1fr]">
            <div className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-lg bg-violet-soft ring-4 ring-mint">
              <video ref={video} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" aria-label="Camera preview" />
              {phase !== "measuring" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-violet-text"><Camera aria-hidden="true" size={28} /><span className="text-label">Camera preview</span></div>}
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              {phase === "idle" && (
                <>
                  <p className="flex items-center gap-1 font-semibold">Before you start <PresageInfo /></p>
                  <p className="text-ink-muted">Sit in good, even light, hold your device still at eye level, and breathe normally until it finishes.</p>
                  <label className="pz-check"><input type="checkbox" checked={cameraOk} onChange={(e) => setCameraOk(e.target.checked)} />Use my camera to measure heart rate and breathing. No video is saved.</label>
                  <button type="button" className="pz-btn pz-btn--secondary self-start" disabled={!cameraOk} onClick={measure}><Camera aria-hidden="true" size={20} />Start measuring</button>
                </>
              )}
              {phase === "measuring" && <Loader label="Measuring with Presage… keep still" />}
              {phase === "unavailable" && <Notice>Contactless measurement isn&apos;t available in this build or on this device yet. You can still save how you feel.</Notice>}
              {phase === "denied" && <Notice tone="warning">Camera access was blocked. Allow the camera in your browser settings to measure.</Notice>}
              {phase === "failed" && <Notice tone="warning">We couldn&apos;t get a reading. Try again in brighter light and keep still.</Notice>}
              {(phase === "failed" || phase === "denied") && <button type="button" className="pz-btn pz-btn--ghost self-start" onClick={measure}><RotateCcw aria-hidden="true" size={18} />Try again</button>}
              {phase === "done" && reading && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-mint-soft p-4"><HeartPulse aria-hidden="true" size={20} className="text-mint-text" /><p className="text-h1">{reading.heart_rate != null ? Math.round(reading.heart_rate) : "–"}</p><p className="text-label font-normal text-ink-muted">heart rate, bpm</p></div>
                    <div className="rounded-md bg-mint-soft p-4"><Wind aria-hidden="true" size={20} className="text-mint-text" /><p className="text-h1">{reading.breathing_rate != null ? Math.round(reading.breathing_rate) : "–"}</p><p className="text-label font-normal text-ink-muted">breaths per minute</p></div>
                  </div>
                  <label className="pz-check"><input type="checkbox" checked={keepReading} onChange={(e) => setKeepReading(e.target.checked)} />Save these readings with today&apos;s entry.</label>
                  <p className="text-caption text-ink-muted">Measured with Presage. For your records only. They don&apos;t diagnose anything.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {err && <Notice tone="danger">{err}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="pz-btn pz-btn--primary w-full sm:w-auto" disabled={saving} aria-busy={saving} onClick={save}>{saving ? <><Spinner /> Saving…</> : "Save to my diary"}</button>
      </div>
    </section>
  );
}
