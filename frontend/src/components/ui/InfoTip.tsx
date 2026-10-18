// OWNER: Member 2 (shared) - small "i" button that opens a short plain-English explanation.
"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Info, X } from "lucide-react";

export function InfoTip({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <span ref={box} className="relative inline-flex align-middle">
      <button type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-pill text-violet-text hover:bg-violet-soft">
        <Info aria-hidden="true" size={20} />
      </button>
      {open && (
        <span id={id} role="dialog" aria-label={title}
          className="absolute left-0 top-full z-30 mt-2 flex w-[min(320px,80vw)] flex-col gap-2 rounded-md border border-line bg-surface-raised p-4 text-left text-body font-normal tracking-normal text-ink shadow-card">
          <span className="flex items-start justify-between gap-2">
            <span className="text-label">{title}</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="-mr-1 -mt-1 rounded-pill p-1 text-ink-muted hover:bg-violet-soft"><X aria-hidden="true" size={16} /></button>
          </span>
          <span className="flex flex-col gap-2 text-label font-normal text-ink-muted">{children}</span>
        </span>
      )}
    </span>
  );
}

/** The shared "What is a clinical trial?" explanation. */
export function ClinicalTrialInfo() {
  return (
    <InfoTip label="What is a clinical trial?" title="What is a clinical trial?">
      <span>A clinical trial is research that tests whether a new medicine, treatment or device is safe and works well.</span>
      <span>Volunteers are looked after by a research team throughout. Taking part is always your choice, and you can stop at any time.</span>
    </InfoTip>
  );
}

/** What each clinical trial phase means. General descriptions, no statistics. */
export function PhaseInfo() {
  return (
    <InfoTip label="What do the trial phases mean?" title="What do the phases mean?">
      <span><strong className="text-ink">Early phase 1:</strong> a very small, very early look at how a treatment behaves in people.</span>
      <span><strong className="text-ink">Phase 1:</strong> a small group tries the treatment for the first time, to check it&apos;s safe and find the right dose.</span>
      <span><strong className="text-ink">Phase 2:</strong> more people with the condition take part, to see if it works and learn about side effects.</span>
      <span><strong className="text-ink">Phase 3:</strong> large groups compare it with the usual treatment, before it can be approved.</span>
      <span><strong className="text-ink">Phase 4:</strong> the treatment is already approved; the trial watches how it does over a longer time.</span>
      <span><strong className="text-ink">No phase:</strong> trials that don&apos;t test a medicine, such as devices, exercise or diet.</span>
    </InfoTip>
  );
}

/** What the three match results mean. Never an eligibility decision. */
export function MatchTypeInfo() {
  return (
    <InfoTip label="What do the match results mean?" title="What do the match results mean?">
      <span><strong className="text-ink">Possible match:</strong> what we know about you fits the trial&apos;s main requirements.</span>
      <span><strong className="text-ink">Needs more info:</strong> it might fit, but the trial asks about something your profile doesn&apos;t cover yet.</span>
      <span><strong className="text-ink">Not a match:</strong> something we know, like your age, is outside what the trial allows.</span>
      <span>Only the trial team can confirm whether you can take part.</span>
    </InfoTip>
  );
}

/** Inclusion and exclusion criteria in plain English. */
export function CriteriaInfo() {
  return (
    <InfoTip label="What are eligibility criteria?" title="What are eligibility criteria?">
      <span><strong className="text-ink">Inclusion criteria</strong> are what you need to have to join, such as a condition or an age range.</span>
      <span><strong className="text-ink">Exclusion criteria</strong> are things that would stop you joining, often to keep you safe, such as smoking or pregnancy.</span>
      <span>They&apos;re written by the researchers. The trial team will go through them with you.</span>
    </InfoTip>
  );
}

/** What Presage measures. */
export function PresageInfo() {
  return (
    <InfoTip label="How does the camera measurement work?" title="How does it work?">
      <span>Presage uses your camera to pick up tiny changes in your face and chest as your heart beats and you breathe.</span>
      <span>No video is saved, only the two numbers. They&apos;re for your diary and don&apos;t diagnose anything.</span>
    </InfoTip>
  );
}
