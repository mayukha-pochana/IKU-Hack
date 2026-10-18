// OWNER: Member 1 - product demonstration preview, built from the real design-system components.
import { MapPin, Volume2 } from "lucide-react";
import { Badge, MatchBadge } from "@/components/ui/pz";
import { TrialStatusBadge } from "@/components/trials/TrialMatchCard";

export function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full min-w-0 max-w-md p-3 md:p-0" aria-label="Example of the PhaseZero dashboard with sample data">
      <div aria-hidden="true" className="absolute inset-0 rounded-[28px] bg-violet md:-inset-6" />
      <div className="relative flex flex-col gap-3">
        <div className="pz-card shadow-card">
          <p className="text-label text-ink-muted">Good morning, Maya</p>
          <div className="pz-dose">
            <span className="pz-dose__time">09:00</span>
            <div className="pz-dose__main"><p className="pz-dose__name">Beclometasone 100 mcg</p><p className="pz-dose__how">2 puffs, morning and night</p></div>
            <Badge tone="success">Taken</Badge>
          </div>
        </div>
        <article className="pz-card shadow-card">
          <div className="pz-card__row"><MatchBadge status="POTENTIAL_MATCH" /><span className="pz-badge pz-badge--neutral">Phase 3</span><TrialStatusBadge status="RECRUITING" /></div>
          <h3 className="pz-card__title">Asthma: once-daily inhaler trial</h3>
          <p className="pz-card__meta inline-flex items-center gap-1"><MapPin aria-hidden="true" size={14} />London</p>
          <p className="pz-card__body">Shown because you have asthma and are aged 18 to 65.</p>
          <div className="pz-card__actions">
            <span className="pz-btn pz-btn--secondary pz-btn--sm">Explain this trial</span>
            <span className="pz-btn pz-btn--icon" style={{ width: 36, minHeight: 36 }}><Volume2 aria-hidden="true" size={18} /></span>
          </div>
        </article>
        <figcaption className="text-caption text-violet-on opacity-90">Example screens with sample data.</figcaption>
      </div>
    </figure>
  );
}
