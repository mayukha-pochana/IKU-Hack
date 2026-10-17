// OWNER: Member 2
import type { Trial } from "@/types";

export function TrialDetails({ trial }: { trial: Trial }) {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold">{trial.title}</h1>
      <p>{trial.brief_summary}</p>
      <p className="text-sm">Ages: {trial.min_age ?? "n/a"} – {trial.max_age ?? "n/a"} · Phase: {trial.phases.join(", ") || "n/a"}</p>
      <section><h2 className="font-semibold">Inclusion criteria</h2><pre className="whitespace-pre-wrap text-sm">{trial.inclusion_criteria ?? "Not listed"}</pre></section>
      <section><h2 className="font-semibold">Exclusion criteria</h2><pre className="whitespace-pre-wrap text-sm">{trial.exclusion_criteria ?? "Not listed"}</pre></section>
      <section><h2 className="font-semibold">Locations</h2>
        <ul className="text-sm">{trial.locations.slice(0, 10).map((l, i) => <li key={i}>{[l.facility, l.city, l.country].filter(Boolean).join(", ")}</li>)}</ul></section>
      <a href={trial.url} target="_blank" rel="noreferrer" className="underline">Official study page (ClinicalTrials.gov)</a>
      {/* TODO(M2): Listen button + "Questions to ask the study team" list */}
    </article>
  );
}
