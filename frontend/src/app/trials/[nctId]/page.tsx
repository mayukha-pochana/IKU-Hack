// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { trials } from "@/lib/api";
import type { Trial } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TrialDetails } from "@/components/trials/TrialDetails";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { ErrorState } from "@/components/dashboard/ErrorState";

export default function TrialPage() {
  const { nctId } = useParams<{ nctId: string }>();
  const [t, setT] = useState<Trial | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { trials.get(nctId).then(setT).catch((e) => setErr(e.message)); }, [nctId]);
  return (
    <DashboardLayout>
      {err && <ErrorState message={err} />}
      {!t && !err && <LoadingState />}
      {t && <TrialDetails trial={t} />}
    </DashboardLayout>
  );
}
