// Reads "2 puffs" / "Take 1 tablet" from the patient-confirmed instructions. Display only:
// returns null unless the text clearly starts with one whole number and a known unit (ranges like "1 to 2" are ignored).
const UNITS = ["puff", "tablet", "capsule", "pill", "spray", "drop", "sachet", "patch", "injection"];

export type DoseAmount = { count: number; unit: string; text: string };

export function doseAmount(instructions: string | null | undefined): DoseAmount | null {
  if (!instructions) return null;
  const m = instructions.trim().match(/^(?:take\s+|inhale\s+|use\s+)?(\d+)\s+([a-z]+)/i);
  if (!m) return null;
  const count = Number(m[1]);
  const word = m[2].toLowerCase();
  const unit = UNITS.find((u) => word === u || word === `${u}s` || (u === "patch" && word === "patches"));
  if (!unit || count < 1 || count > 20) return null;
  if (/^\s*(?:take\s+|inhale\s+|use\s+)?\d+\s*(?:to|-|or)\s*\d+/i.test(instructions)) return null;
  const plural = count === 1 ? unit : unit === "patch" ? "patches" : `${unit}s`;
  return { count, unit, text: `${count} ${plural}` };
}
