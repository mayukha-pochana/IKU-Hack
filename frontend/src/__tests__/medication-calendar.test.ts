import { describe, expect, it } from "vitest";
import { buildWeek } from "@/components/medications/MedicationCalendar";
import type { Dose } from "@/types";

// Week of Monday 12 Oct 2026 to Sunday 18 Oct 2026.
const at = (dayOffset: number, h: number) => new Date(2026, 9, 12 + dayOffset, h, 0).toISOString();
const dose = (id: string, day: number, h: number, med = "m1"): Dose => ({ id, medication_id: med, medication_name: med === "m1" ? "Beclometasone" : "Salbutamol", scheduled_at: at(day, h), status: "SCHEDULED", confirmed_at: null });

describe("buildWeek", () => {
  it("lays out Monday to Sunday, whatever day it is, with one row per time and medicine", () => {
    const w = buildWeek([dose("a", 0, 9), dose("b", 0, 21), dose("c", 1, 9), dose("d", 0, 9, "m2")], new Date(2026, 9, 17)); // a Saturday
    expect(w.days.map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(w.days[0].getDate()).toBe(12);
    expect(w.rows.map((r) => `${r.time} ${r.med}`)).toEqual(["09:00 Beclometasone", "09:00 Salbutamol", "21:00 Beclometasone"]);
    expect(w.cell(w.rows[0], w.days[1])?.id).toBe("c");
    expect(w.cell(w.rows[2], w.days[1])).toBeUndefined();
  });
});

import { isLaterDay } from "@/lib/format";
describe("isLaterDay", () => {
  it("lets any time today be logged but locks tomorrow", () => {
    const now = new Date(2026, 9, 18, 0, 15);
    expect(isLaterDay(new Date(2026, 9, 18, 21, 0).toISOString(), now)).toBe(false);
    expect(isLaterDay(new Date(2026, 9, 19, 9, 0).toISOString(), now)).toBe(true);
  });
});
