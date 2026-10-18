// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import { medications } from "@/lib/api";
import type { Medication } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PrescriptionUploader } from "@/components/medications/PrescriptionUploader";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { MedicationCalendar } from "@/components/medications/MedicationCalendar";
import { DoseList } from "@/components/medications/DoseList";
import { Loader, Segmented } from "@/components/ui/pz";

export default function MedicationsPage() {
  const [meds, setMeds] = useState<Medication[] | null>(null);
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<"today" | "week">("week");
  useEffect(() => { medications.list().then(setMeds).catch(() => setMeds([])); }, [tick]);
  const bump = () => setTick((t) => t + 1);

  return (
    <DashboardLayout>
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">My medications</h1>
        <p className="text-ink-muted">Scan a prescription once and your schedule builds itself.</p>
      </header>
      <PrescriptionUploader onSaved={bump} />

      <section aria-labelledby="sched-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sched-h" className="text-h2">Schedule</h2>
          <Segmented label="Schedule view" value={view} onChange={setView} options={[{ value: "today", label: "Today" }, { value: "week", label: "Week" }]} />
        </div>
        {view === "week" ? <MedicationCalendar refreshKey={tick} /> : <DoseList refreshKey={tick} />}
      </section>

      <section aria-labelledby="meds-h" className="flex flex-col gap-3">
        <h2 id="meds-h" className="text-h2">Saved medicines</h2>
        {!meds ? <Loader label="Loading your medicines…" /> : meds.length ? (
          <div className="grid gap-4 md:grid-cols-2">{meds.map((m) => <MedicationCard key={m.id} med={m} />)}</div>
        ) : <p className="text-ink-muted">No medicines yet. Scan a prescription above to add your first.</p>}
      </section>
    </DashboardLayout>
  );
}
