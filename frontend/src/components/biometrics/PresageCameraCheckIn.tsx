// OWNER: Member 2 (UI) with Member 4 (SDK). Daily diary entry: how you feel, an optional note,
// and optional heart rate / breathing measured with Presage. The camera frames go to the PhaseZero web gateway
// (integrations/presage-desktop/web-gateway.mjs), which runs the real Presage SDK. NO simulated readings - ever.
"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, HeartPulse, RotateCcw, Wind } from "lucide-react";
import { checkins } from "@/lib/api";
import { MOODS, toReport, type Mood } from "@/lib/diary";
import { Loader, Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { cn } from "@/lib/utils";
import { MOOD_STYLE, MoodFace } from "./MoodIcon";
import { PresageInfo } from "@/components/ui/InfoTip";
import { HeartDoodle, SprigDoodle, SunDoodle } from "@/components/ui/Doodles";
import { greeting } from "@/lib/format";

type Phase = "idle" | "measuring" | "done" | "unavailable" | "failed" | "denied";
type Live = { seconds: number; heart_rate: number | null; breathing_rate: number | null; hint?: string };
type Reading = { heart_rate: number | null; breathing_rate: number | null };

const FPS = 30;
const FRAME_WIDTH = 640;

/** Streams camera frames (JPEG, prefixed with a µs capture time) to the gateway's Presage SDK session and resolves
 *  with its stable reading. Rejects with PRESAGE_NOT_INTEGRATED when no gateway is reachable from this page. */
function runPresageMeasurement(video: HTMLVideoElement, onLive: (l: Live) => void, stopRef: { current: (() => void) | null }): Promise<Reading> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/presage/ws`);
    ws.binaryType = "arraybuffer";
    const canvas = document.createElement("canvas");
    let timer: ReturnType<typeof setInterval> | undefined;
    let pending = false;
    let sized = false;
    let ready = false;
    let settled = false;
    let hint: string | undefined;
    const end = (fn: () => void) => { if (settled) return; settled = true; clearInterval(timer); stopRef.current = null; fn(); ws.close(); };
    stopRef.current = () => { if (ws.readyState === WebSocket.OPEN) ws.send("stop"); };

    function sendFrame() {
      if (pending || ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > 512_000 || !video.videoWidth) return;
      if (!sized) { sized = true; // lock the frame size: the SDK needs every frame the same shape
        canvas.width = FRAME_WIDTH;
        canvas.height = Math.round(FRAME_WIDTH * video.videoHeight / video.videoWidth / 2) * 2;
      }
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      const ts = BigInt(Math.round(performance.now() * 1000));
      pending = true;
      canvas.toBlob(async (blob) => {
        pending = false;
        if (!blob || ws.readyState !== WebSocket.OPEN) return;
        const jpg = new Uint8Array(await blob.arrayBuffer());
        const msg = new Uint8Array(8 + jpg.length);
        new DataView(msg.buffer).setBigUint64(0, ts, true);
        msg.set(jpg, 8);
        ws.send(msg);
      }, "image/jpeg", 0.8);
    }

    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data));
      if (m.type === "ready") { ready = true; timer = setInterval(sendFrame, 1000 / FPS); }
      else if (m.type === "hint") hint = m.hint;
      else if (m.type === "progress") onLive({ seconds: m.seconds, heart_rate: m.heart_rate, breathing_rate: m.breathing_rate, hint });
      else if (m.type === "result") end(() => resolve(m.result));
      else if (m.type === "error") end(() => reject(new Error(m.message || "We couldn't get a reading.")));
    };
    ws.onerror = () => end(() => reject(new Error(ready ? "The connection to Presage dropped. Try again." : "PRESAGE_NOT_INTEGRATED")));
    ws.onclose = () => end(() => reject(new Error(ready ? "The connection to Presage dropped. Try again." : "PRESAGE_NOT_INTEGRATED")));
  });
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
  const [live, setLive] = useState<Live | null>(null);
  const [failMsg, setFailMsg] = useState<string | null>(null);
  const stopMeasuring = useRef<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; if (video.current) video.current.srcObject = null; };
  useEffect(() => () => { stopMeasuring.current?.(); stop(); }, []);

  async function measure() {
    setErr(null); setReading(null); setLive(null); setFailMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) { setPhase("unavailable"); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } }); // browser asks for permission here
      if (video.current) video.current.srcObject = stream.current;
      setPhase("measuring");
      setReading(await runPresageMeasurement(video.current!, setLive, stopMeasuring)); setPhase("done"); setKeepReading(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : e instanceof Error ? e.message : "";
      setPhase(name === "PRESAGE_NOT_INTEGRATED" ? "unavailable" : name === "NotAllowedError" ? "denied" : "failed");
      if (!(e instanceof DOMException) && name !== "PRESAGE_NOT_INTEGRATED") setFailMsg(name);
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
    <section className="pz-diary items-center text-center">
      <Notice tone="success">Saved to your diary. You can see it in this week&apos;s faces below.</Notice>
      <button type="button" className="pz-btn pz-btn--secondary" onClick={() => setSaved(false)}>Add another entry</button>
    </section>
  );

  return (
    <section className="pz-diary" aria-labelledby="diary-h">
      {/* Greeting and the question, centred like a mobile journal app. */}
      <fieldset className="flex flex-col items-center gap-5 text-center">
        <p className="flex items-center gap-1.5 text-label text-ink-muted"><SunDoodle />{greeting()}</p>
        <legend id="diary-h" className="sr-only">How have things been today?</legend>
        <p aria-hidden="true" className="-mt-2 max-w-[18ch] text-[28px] font-semibold leading-9 tracking-[-0.02em] text-ink md:text-[34px] md:leading-[42px]">How have things been today?</p>
        <div className="flex max-w-xl flex-wrap justify-center gap-2.5" role="radiogroup" aria-labelledby="diary-h">
          {MOODS.map((m) => {
            const on = mood === m;
            const st = MOOD_STYLE[m];
            return (
              <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMood(on ? null : m)}
                className={cn("pz-mood inline-flex min-h-tap items-center gap-2 rounded-pill py-1.5 pl-1.5 pr-4 text-body font-medium", on && "pz-mood--on")}
                style={on ? { background: st.tint, boxShadow: `inset 0 0 0 2px ${st.deep}`, color: st.deep } : undefined}>
                <MoodFace mood={m} size={30} className="pz-mood__face" />{m}
              </button>
            );
          })}
        </div>
        {mood && <p key={mood} role="status" className="pz-mood__line max-w-md text-label font-normal text-ink-muted">{MOOD_STYLE[mood].line}</p>}
      </fieldset>

      {/* Journal prompt card with a small illustration. */}
      <div className="pz-soft-card pz-soft-card--mint relative overflow-hidden">
        <SprigDoodle className="absolute -right-1 -top-1 hidden sm:block" />
        <label htmlFor="diary-note" className="block pr-0 text-h3 sm:pr-20">Write freely about what&apos;s on your mind</label>
        <p className="mb-3 mt-1 text-label font-normal text-ink-muted sm:pr-20">A word or a few lines is plenty.</p>
        <textarea id="diary-note" className="pz-field__input pz-field__textarea w-full border-line bg-white/85" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="For example, a bit wheezy after climbing stairs" />
      </div>

      <div className="pz-soft-card pz-soft-card--pink overflow-hidden !p-0">
        <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={open} aria-controls="vitals" onClick={() => setOpen(!open)}>
          <span className="flex items-center gap-3">
            <HeartDoodle size={48} className="shrink-0" />
            <span><span className="block font-semibold">Add heart rate and breathing</span><span className="text-label font-normal text-ink-muted">Measured with your camera by Presage</span></span>
          </span>
          <ChevronDown aria-hidden="true" size={20} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        <div id="vitals" hidden={!open} className="border-t border-white/70 bg-white/60 p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_1fr]">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-[24px] border border-white shadow-[0_8px_24px_rgba(194,84,127,0.12)] md:mx-0"
              style={{ background: "radial-gradient(80% 60% at 50% 30%, #ffffff 0%, transparent 70%), linear-gradient(160deg, #ffe4ee 0%, #efeaff 100%)" }}>
              <video ref={video} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" aria-label="Camera preview" />
              {/* Face guide: where to place your face. Shown over the live view too. */}
              <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[14%] h-[58%] w-[64%] -translate-x-1/2 rounded-[50%] border-2 border-dashed border-[#ef8fab]/70" />
              {phase !== "measuring" && (
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-3 text-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-white/90 text-[#c2547f] shadow-sm"><Camera aria-hidden="true" size={16} /></span>
                  <span className="text-caption text-ink-muted">Your face goes in the oval</span>
                </div>
              )}
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
              {phase === "measuring" && (
                <>
                  <Loader label={`Measuring with Presage… keep still${live ? ` (${live.seconds}s)` : ""}`} />
                  {live && (live.heart_rate != null || live.breathing_rate != null) && (
                    <p className="text-ink-muted">So far: {live.heart_rate != null ? `${Math.round(live.heart_rate)} bpm` : "heart rate…"} · {live.breathing_rate != null ? `${Math.round(live.breathing_rate)} breaths/min` : "breathing…"}</p>
                  )}
                  {live?.hint && <p className="text-caption text-ink-muted">{live.hint}</p>}
                  <p className="text-caption text-ink-muted">Takes 15 to 60 seconds.</p>
                  <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm self-start" onClick={() => stopMeasuring.current?.()}>Stop</button>
                </>
              )}
              {phase === "unavailable" && <Notice>Presage measuring isn&apos;t connected on this page. Open PhaseZero from the demo link to measure. You can still save how you feel.</Notice>}
              {phase === "denied" && <Notice tone="warning">Camera access was blocked. Allow the camera in your browser settings to measure.</Notice>}
              {phase === "failed" && <Notice tone="warning">{failMsg ?? "We couldn't get a reading. Try again in brighter light and keep still."}</Notice>}
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
