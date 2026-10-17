// OWNER: Member 2
import type { Medication } from "@/types";

export function MedicationCard({ med }: { med: Medication }) {
  return (
    <article className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{med.name} {med.strength}</h3>
      <p>{med.instructions}</p>
      <p className="text-sm text-slate-600">Times: {med.confirmed_schedule.times.join(", ")} · {med.confirmed_schedule.duration_days} days</p>
      {/* TODO(M2): Listen button -> voice.explain({kind:"medication", medication_id}) */}
    </article>
  );
}
