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
      <h1 className="mb-4 text-3xl font-bold">Health Check-In</h1>
      <PresageCameraCheckIn onSaved={() => setTick(tick + 1)} />
      <h2 className="mb-2 mt-8 text-xl font-semibold">History</h2>
      <HealthHistory refreshKey={tick} />
    </DashboardLayout>
  );
}
