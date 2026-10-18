// OWNER: Member 2
"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PresageCameraCheckIn } from "@/components/biometrics/PresageCameraCheckIn";
import { HealthHistory } from "@/components/dashboard/HealthHistory";

export default function CheckInPage() {
  const [tick, setTick] = useState(0);
  return (
    <DashboardLayout>
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Daily diary</h1>
        <p className="text-ink-muted">A quick note on how you feel each day. Add heart rate and breathing from Presage if you like. For your records only.</p>
      </header>
      <PresageCameraCheckIn onSaved={() => setTick((t) => t + 1)} />
      <HealthHistory refreshKey={tick} />
    </DashboardLayout>
  );
}
