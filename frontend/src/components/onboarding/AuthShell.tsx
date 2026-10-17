// OWNER: Member 1 - page frame for sign-in and onboarding screens.
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { MatchBadge } from "@/components/ui/pz";
import { PreviewBanner } from "@/components/ui/PreviewBanner";

const POINTS = [
  "Fill in your details once",
  "Every recruiting trial checked for you",
  "Each result explained in plain English",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[1fr_minmax(0,440px)] lg:grid-cols-[1fr_minmax(0,520px)]">
      <div className="flex flex-col">
        <PreviewBanner />
        <div className="flex flex-1 flex-col px-4 py-6 md:px-10 md:py-8">
        <Logo />
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-10">{children}</main>
        </div>
      </div>
      <aside className="hidden flex-col justify-center gap-8 bg-violet px-10 py-12 text-violet-on md:flex lg:px-14">
        <div className="flex flex-col gap-3">
          <h2 className="text-h1">Less admin. More taking part.</h2>
          <ul className="flex flex-col gap-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-body-lg">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-mint text-violet"><Check aria-hidden="true" size={16} strokeWidth={3} /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <figure className="flex flex-col gap-2" aria-label="Example trial match with sample data">
          <div className="pz-card text-ink shadow-card">
            <div className="pz-card__row"><MatchBadge status="POTENTIAL_MATCH" /><span className="pz-badge pz-badge--neutral">Phase 3</span></div>
            <p className="pz-card__title">Asthma: once-daily inhaler trial</p>
            <p className="pz-card__body">Shown because you have asthma and are aged 18 to 65.</p>
          </div>
          <figcaption className="text-caption opacity-80">Example with sample data.</figcaption>
        </figure>
      </aside>
    </div>
  );
}
