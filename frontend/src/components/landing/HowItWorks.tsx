// OWNER: Member 1 - the three-step journey plus the before/after friction comparison (Max Ease).
import { Check, ClipboardList, Search, Upload, X } from "lucide-react";

const STEPS = [
  { icon: Upload, title: "Scan your prescription", body: "Take a photo. We read the medicine, dose and times, and you check every detail before anything is saved." },
  { icon: Search, title: "See trials that might fit", body: "Your profile is checked against recruiting trials on ClinicalTrials.gov. Each result says why it was shown." },
  { icon: ClipboardList, title: "Stay on track", body: "Your schedule builds itself. Mark doses as taken, and add an optional camera check-in when you want one." },
];

const BEFORE = [
  "Search trial registries one condition at a time",
  "Re-type the same details for every trial",
  "Decode eligibility criteria written for researchers",
  "Track doses and symptoms in a separate app or on paper",
];
const AFTER = [
  "One profile, filled in once",
  "Prescription details read from a photo",
  "Every trial explained in plain English, with the reason it was shown",
  "Doses, check-ins and trials on one dashboard",
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-surface-raised">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:px-6 md:py-24">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="text-h1">How it works</h2>
          <p className="text-body-lg text-ink-muted">Three steps from a prescription to a plan you can follow.</p>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-violet-soft text-violet-text"><s.icon aria-hidden="true" size={20} /></span>
                <span className="text-label text-ink-muted">Step {i + 1}</span>
              </div>
              <h3 className="text-h3">{s.title}</h3>
              <p className="text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="pz-card">
            <h3 className="pz-card__title">Without PhaseZero</h3>
            <ul className="flex flex-col gap-2">
              {BEFORE.map((b) => <li key={b} className="flex gap-2 text-ink-muted"><X aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-danger" />{b}</li>)}
            </ul>
          </div>
          <div className="pz-card bg-mint-soft">
            <h3 className="pz-card__title">With PhaseZero</h3>
            <ul className="flex flex-col gap-2">
              {AFTER.map((a) => <li key={a} className="flex gap-2"><Check aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-mint-text" />{a}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

