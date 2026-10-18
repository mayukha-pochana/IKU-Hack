// OWNER: Member 2 - free-text search of ClinicalTrials.gov via GET /api/trials/search. Labels cached results.
"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { trials } from "@/lib/api";
import type { Trial } from "@/types";
import { Loader, Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { TrialMatchCard } from "./TrialMatchCard";

export function TrialSearch() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ trials: Trial[]; source: "live" | "cache"; q: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) { setErr("Type at least 2 letters, like a condition or treatment name."); return; }
    setBusy(true); setErr(null);
    try { setRes({ ...(await trials.search(q.trim())), q: q.trim() }); }
    catch (e) { setErr(errorMessage(e, "Search isn't working right now. Try again in a moment.")); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="search-h" className="flex flex-col gap-4">
      <h2 id="search-h" className="text-h2">Search all recruiting trials</h2>
      <form onSubmit={run} role="search" className="flex flex-wrap items-end gap-2">
        <div className="pz-field pz-field--wide flex-1">
          <label htmlFor="trial-q" className="pz-field__label">Condition or treatment</label>
          <input id="trial-q" type="search" className="pz-field__input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example, eczema" />
        </div>
        <button className="pz-btn pz-btn--secondary" disabled={busy} aria-busy={busy}>{busy ? <Spinner /> : <Search aria-hidden="true" size={20} />}Search</button>
      </form>
      {err && <Notice tone="danger">{err}</Notice>}
      {busy && <Loader label="Searching ClinicalTrials.gov…" />}
      {res && !busy && (
        <>
          {res.source === "cache" && <Notice tone="warning">ClinicalTrials.gov didn&apos;t respond, so these are saved results and may be out of date.</Notice>}
          <p className="text-label font-normal text-ink-muted" role="status">{res.trials.length ? `${res.trials.length} trials for “${res.q}”. These aren't checked against your profile.` : `No recruiting trials found for “${res.q}”. Try a different word.`}</p>
          <div className="grid gap-4 lg:grid-cols-2">{res.trials.map((t) => <TrialMatchCard key={t.nct_id} trial={t} />)}</div>
        </>
      )}
    </section>
  );
}
