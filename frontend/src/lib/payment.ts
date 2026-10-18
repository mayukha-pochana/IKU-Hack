// OWNER: Member 2 - whether a trial pays participants. ClinicalTrials.gov has no structured payment field, so this
// uses the trial's own `compensation` text when the API sends it (docs/requests/trial-compensation.md), otherwise
// the trial's own wording in its summary or criteria. We never invent or estimate an amount.
import type { Trial } from "@/types";

const PAY_WORDS = /\b(compensat\w*|reimburs\w*|stipend|paid for (your )?(time|participation)|payment for (your )?(time|participation)|£\s?\d[\d,]*)/i;

/** The sentence from the trial that mentions payment, or null if it doesn't say. */
export function paymentNote(t: Trial): string | null {
  if (t.compensation?.trim()) return t.compensation.trim();
  for (const text of [t.brief_summary, t.inclusion_criteria]) {
    if (!text) continue;
    const sentence = text.split(/(?<=[.!?])\s+|\n+/).find((s) => PAY_WORDS.test(s));
    if (sentence) return sentence.trim();
  }
  return null;
}

export const isPaid = (t: Trial) => paymentNote(t) !== null;
