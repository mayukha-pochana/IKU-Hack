// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import { medications } from "@/lib/api";
import type { Medication } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PrescriptionUploader } from "@/components/medications/PrescriptionUploader";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { MedicationCalendar } from "@/components/medications/MedicationCalendar";

export default function MedicationsPage() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => { medications.list().then(setMeds).catch(() => {}); }, [tick]);
  return (
    <DashboardLayout>
      <h1 className="mb-4 text-3xl font-bold">My Medications</h1>
      <PrescriptionUploader onSaved={() => setTick(tick + 1)} />
      <div className="my-6 space-y-3">{meds.map((m) => <MedicationCard key={m.id} med={m} />)}</div>
      <h2 className="mb-2 text-xl font-semibold">Schedule</h2>
      <MedicationCalendar key={tick} />
    </DashboardLayout>
  );
}
