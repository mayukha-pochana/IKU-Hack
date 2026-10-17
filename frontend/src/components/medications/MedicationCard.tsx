// OWNER: Member 2 - one confirmed medication, with ElevenLabs read-aloud of its confirmed instructions.
import { Pill } from "lucide-react";
import type { Medication } from "@/types";
import { ReadAloud } from "@/components/ui/ReadAloud";

export function MedicationCard({ med }: { med: Medication }) {
  const s = med.confirmed_schedule;
  return (
    <article className="pz-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-mint-soft text-mint-text"><Pill aria-hidden="true" size={20} /></span>
          <div className="min-w-0">
            <h3 className="pz-card__title">{med.name}{med.strength && ` ${med.strength}`}</h3>
            {med.instructions && <p className="text-body-lg">{med.instructions}</p>}
          </div>
        </div>
        <ReadAloud request={{ kind: "medication", medication_id: med.id }} label={`Read ${med.name} instructions aloud`} />
      </div>
      <div className="pz-card__row">
        {s.times.map((t) => <span key={t} className="pz-badge pz-badge--neutral">{t}</span>)}
        <span className="pz-card__meta">for {s.duration_days} {s.duration_days === 1 ? "day" : "days"}</span>
      </div>
    </article>
  );
}
