// OWNER: Member 1 - clinical trial participation benefits. General, factual statements only; no statistics.
import { HeartHandshake, Microscope, ShieldCheck, Stethoscope } from "lucide-react";
import { ClinicalTrialInfo } from "@/components/ui/InfoTip";

const BENEFITS = [
  { icon: Microscope, title: "Access to new treatments", body: "Some trials test treatments that are not yet widely available." },
  { icon: Stethoscope, title: "Extra care from a research team", body: "Trials often include regular check-ups and close monitoring." },
  { icon: HeartHandshake, title: "Help people with your condition", body: "Every trial adds to what doctors know about treating it." },
  { icon: ShieldCheck, title: "Your choice, always", body: "Taking part is voluntary. You can ask questions first and stop at any time." },
];

export function Benefits() {
  return (
    <section id="benefits" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-16 md:px-6 md:py-24">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 className="text-h1">Why people take part in clinical trials <ClinicalTrialInfo /></h2>
        <p className="text-body-lg text-ink-muted">PhaseZero shows you trials that might fit. The trial team always makes the final decision with you.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <li key={b.title} className="pz-card">
            <b.icon aria-hidden="true" size={24} className="text-violet-text" />
            <h3 className="pz-card__title">{b.title}</h3>
            <p className="pz-card__body text-ink-muted">{b.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
