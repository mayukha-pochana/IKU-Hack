// Daily diary entries are stored in the existing check-in `symptom_report` text as "Feeling: <mood>\n<note>",
// so no backend change is needed. Older free-text reports still display as a plain note.
export const MOODS = ["Great", "Good", "Okay", "Low", "Unwell"] as const;
export type Mood = (typeof MOODS)[number];

export function toReport(mood: Mood | null, note: string): string | null {
  const parts = [mood ? `Feeling: ${mood}` : null, note.trim() || null].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

export function fromReport(report: string | null): { mood: Mood | null; note: string } {
  if (!report) return { mood: null, note: "" };
  const m = report.match(/^Feeling: (\w+)\n?/);
  const mood = m && (MOODS as readonly string[]).includes(m[1]) ? (m[1] as Mood) : null;
  return { mood, note: mood ? report.slice(m![0].length).trim() : report };
}
