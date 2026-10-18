// OWNER: Member 1
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface-raised">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-start md:justify-between md:px-6">
        <Logo width={128} />
        <div className="flex max-w-xl flex-col gap-2 text-label font-normal text-ink-muted">
          <p>PhaseZero is a hackathon prototype using synthetic data. It does not give medical advice or decide whether you can join a trial. The trial team makes that decision.</p>
          <p className="text-caption">Trial data: ClinicalTrials.gov. In an emergency, call 999.</p>
        </div>
      </div>
    </footer>
  );
}
