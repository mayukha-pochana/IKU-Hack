// OWNER: Member 2 (UI) with Member 4 (SDK). Daily diary entry: how you feel, an optional note,
// Heart rate / breathing are measured by the Presage desktop companion (integrations/presage-desktop): the Presage
// SDK has no browser or iOS build, so this page never opens the camera. NO simulated readings - ever.
"use client";
import { useState } from "react";
import { ChevronDown, Laptop } from "lucide-react";
import { checkins } from "@/lib/api";
import { MOODS, toReport, type Mood } from "@/lib/diary";
import { Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { cn } from "@/lib/utils";
import { MOOD_STYLE, MoodFace } from "./MoodIcon";
import { PresageInfo } from "@/components/ui/InfoTip";
import { HeartDoodle, SprigDoodle, SunDoodle } from "@/components/ui/Doodles";
import { greeting } from "@/lib/format";

export function PresageCameraCheckIn({ onSaved }: { onSaved: () => void }) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true); setErr(null);
    try {
      await checkins.create({
        heart_rate: null, breathing_rate: null,
        symptom_report: toReport(mood, note), measurement_source: "none",
        consent_given: true, // the person pressed "Save to my diary"
      });
      setSaved(true); setMood(null); setNote(""); setOpen(false); onSaved();
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
            <span><span className="block font-semibold">Add heart rate and breathing</span><span className="text-label font-normal text-ink-muted">Measured by Presage on your computer</span></span>
          </span>
          <ChevronDown aria-hidden="true" size={20} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        <div id="vitals" hidden={!open} className="border-t border-white/70 bg-white/60 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-white/90 text-[#c2547f] shadow-sm"><Laptop aria-hidden="true" size={20} /></span>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="flex items-center gap-1 font-semibold">Measure with the PhaseZero desktop app <PresageInfo /></p>
              <p className="text-ink-muted">Presage reads your heart rate and breathing from a short look at your face through your computer&apos;s webcam. Open the PhaseZero Presage app on your computer, sit in good light and keep still.</p>
              <p className="text-ink-muted">When you save a reading there, it appears in your history below, marked &ldquo;Measured with Presage&rdquo;. No video is saved.</p>
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
