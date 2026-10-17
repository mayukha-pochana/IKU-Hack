// OWNER: Member 2 (UI) with Member 4 (SDK). NO simulated readings - ever.
"use client";
import { useRef, useState } from "react";
import { checkins } from "@/lib/api";

type Phase = "idle" | "preview" | "measuring" | "done" | "unavailable" | "failed";
type Reading = { heart_rate: number | null; breathing_rate: number | null };

/** TODO(M4): replace with the real Presage SDK call once platform support is confirmed
 *  (see backend/app/services/presage/README.md). Must resolve with real SDK output only. */
async function runPresageMeasurement(_video: HTMLVideoElement): Promise<Reading> {
  throw new Error("PRESAGE_NOT_INTEGRATED");
}

export function PresageCameraCheckIn({ onSaved }: { onSaved: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reading, setReading] = useState<Reading | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true }); // explicit permission prompt
      if (video.current) video.current.srcObject = stream;
      setPhase("measuring");
      const r = await runPresageMeasurement(video.current!);
      setReading(r); setPhase("done");
    } catch (e: any) {
      setPhase(e.message === "PRESAGE_NOT_INTEGRATED" ? "unavailable" : "failed");
      setMsg(e.message === "PRESAGE_NOT_INTEGRATED" ? "Contactless measurement isn't available in this build. You can still save a symptom note." : "Measurement failed. Please try again in good lighting.");
    } finally {
      (video.current?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop()); // never keep/store video
    }
  }

  async function save() {
    await checkins.create({
      heart_rate: reading?.heart_rate ?? null, breathing_rate: reading?.breathing_rate ?? null,
      symptom_report: symptoms || null, measurement_source: reading ? "presage_sdk" : "none", consent_given: consent,
    });
    onSaved();
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Daily health check-in (optional)</h2>
      <p className="text-sm">Sit still, face the camera in good light for the measurement. Video is not recorded or stored. Readings are for your own record and are not a medical assessment.</p>
      <video ref={video} autoPlay playsInline muted className="max-w-sm rounded bg-slate-100" aria-label="Camera preview" />
      {phase === "idle" && <button className="rounded bg-brand-600 px-4 py-2 text-white" onClick={start}>Allow camera & start</button>}
      {phase === "measuring" && <p role="status">Measuring…</p>}
      {msg && <p role="alert">{msg}</p>}
      {reading && <p className="text-xl">Heart rate {reading.heart_rate ?? "–"} · Breathing {reading.breathing_rate ?? "–"}</p>}
      <label className="block">How do you feel? (optional)
        <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to saving this check-in.</label>
      <button disabled={!consent} onClick={save} className="rounded bg-brand-700 px-4 py-2 text-white disabled:opacity-50">Save check-in</button>
    </section>
  );
}
