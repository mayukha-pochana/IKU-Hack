// OWNER: Member 2 - keeps the last match list for the detail page (per tab, best effort).
import type { TrialMatch } from "@/types";
const KEY = "pz:matches";
export function saveMatches(m: TrialMatch[]) { try { sessionStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage off */ } }
export function findMatch(nct: string): TrialMatch | undefined {
  try { return (JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as TrialMatch[]).find((m) => m.trial.nct_id === nct); } catch { return undefined; }
}
