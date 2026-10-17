// OWNER: Member 2
import Link from "next/link";
import type { TrialMatch } from "@/types";

const LABEL = {
  POTENTIAL_MATCH: "Potential match",
  MORE_INFORMATION_NEEDED: "More information needed",
  KNOWN_CRITERIA_MISMATCH: "Known criteria mismatch",
} as const;

export function TrialMatchCard({ match }: { match: TrialMatch }) {
  return (
    <article className="rounded-lg border p-4">
      <p className="text-sm font-medium text-brand-700">{LABEL[match.status]}</p>
      <h3 className="text-lg font-semibold">{match.trial.title}</h3>
      <ul className="list-disc pl-5 text-sm">{match.why_surfaced.map((w) => <li key={w}>{w}</li>)}</ul>
      <Link href={`/trials/${match.trial.nct_id}`} className="mt-2 inline-block underline">View details</Link>
      <p className="mt-2 text-xs text-slate-600">{match.disclaimer}</p>
    </article>
  );
}
