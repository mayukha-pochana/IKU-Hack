// OWNER: Member 2
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { trials } from "@/lib/api";
import type { Trial, TrialMatch } from "@/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TrialDetails } from "@/components/trials/TrialDetails";
import { findMatch } from "@/components/trials/matchCache";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { Loader, errorMessage } from "@/components/ui/pz";

export default function TrialPage() {
  const { nctId } = useParams<{ nctId: string }>();
  const [t, setT] = useState<Trial | null>(null);
  const [match, setMatch] = useState<TrialMatch | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setErr(null);
    const cached = findMatch(nctId);
    setMatch(cached);
    trials.get(nctId).then(setT).catch((e) => setErr(errorMessage(e, "We couldn't load this trial.")));
    if (!cached) trials.matches().then((all) => setMatch(all.find((x) => x.trial.nct_id === nctId))).catch(() => {});
  }, [nctId, retry]);

  return (
    <DashboardLayout>
      <Link href="/trials" className="group inline-flex min-h-tap items-center gap-2.5 self-start text-body-lg font-semibold text-violet-text">
        <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-violet-soft transition-transform group-hover:-translate-x-0.5"><ArrowLeft aria-hidden="true" size={20} /></span>All trials
      </Link>
      {err && <ErrorState message={err} onRetry={() => setRetry(retry + 1)} />}
      {!t && !err && <Loader label="Loading this trial…" />}
      {t && <TrialDetails trial={t} match={match} />}
    </DashboardLayout>
  );
}
