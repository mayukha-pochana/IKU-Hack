import { describe, expect, it } from "vitest";
import { EMPTY, ageFromDob, toPayload, validateDob, validateName } from "@/components/onboarding/profileDraft";

describe("profile draft", () => {
  it("requires a name and a real date of birth", () => {
    expect(validateName(EMPTY)).toBeTruthy();
    expect(validateDob({ ...EMPTY, dob: "1998-03-14" })).toBeNull();
    expect(validateDob({ ...EMPTY, dob: "2999-01-01" })).toBeTruthy();
  });
  it("works out age on the birthday, the UK way", () => {
    expect(ageFromDob("1998-10-17", new Date(2026, 9, 17))).toBe(28);
    expect(ageFromDob("1998-10-18", new Date(2026, 9, 17))).toBe(27);
  });
  it("maps to the PUT /api/profile body, with age from date of birth", () => {
    const body = toPayload({ ...EMPTY, display_name: " Barbra ", dob: "1998-03-14", conditions: ["Asthma"], location: "London", sex: "female", smoking: "never", pregnant: "no", travel: "40" }); // km in the form, miles in the API
    expect(body).toMatchObject({ display_name: "Barbra", conditions: ["Asthma"], location: "London", date_of_birth: "1998-03-14", sex_at_birth: "female", smoking_status: "never", pregnant_or_breastfeeding: "no", max_travel_miles: 25 });
    expect(typeof body.age).toBe("number");
    expect(toPayload({ ...EMPTY, display_name: "Sam", sex: "male", pregnant: "yes" }).pregnant_or_breastfeeding).toBeNull();
  });
});

import { streak } from "@/components/dashboard/AdherenceWeek";
describe("streak", () => {
  const day = (d: string, scheduled: number, taken: number, missed = 0) => ({ day: d, scheduled, taken, missed });
  const today = new Date("2026-10-17T20:00:00");
  it("counts complete days back from today, skipping no-dose days and an unfinished today", () => {
    expect(streak([day("2026-10-14", 2, 2), day("2026-10-15", 0, 0), day("2026-10-16", 2, 2), day("2026-10-17", 2, 1)], today)).toBe(2);
  });
  it("stops at a missed dose", () => {
    expect(streak([day("2026-10-15", 2, 2), day("2026-10-16", 2, 1, 1), day("2026-10-17", 2, 2)], today)).toBe(1);
  });
});

import { doseAmount } from "@/lib/doseAmount";
describe("doseAmount", () => {
  it("reads a clear amount from confirmed instructions", () => {
    expect(doseAmount("2 puffs, morning and night")?.text).toBe("2 puffs");
    expect(doseAmount("Take 1 tablet at night")?.text).toBe("1 tablet");
  });
  it("shows nothing when the amount is unclear", () => {
    expect(doseAmount("1 to 2 puffs when needed")).toBeNull();
    expect(doseAmount("Apply thinly")).toBeNull();
    expect(doseAmount(null)).toBeNull();
  });
});

import { routeOf } from "@/lib/route";
describe("routeOf", () => {
  it("groups medicines into the four administration routes", () => {
    expect(routeOf("Beclometasone", "2 puffs, morning and night")).toBe("pulmonary");
    expect(routeOf("Omalizumab", "Inject under the skin every 2 weeks")).toBe("parenteral");
    expect(routeOf("Hydrocortisone cream", "Apply thinly to the rash")).toBe("topical");
    expect(routeOf("Montelukast", "1 tablet at night")).toBe("enteral");
    expect(routeOf("Unknown", null)).toBe("enteral");
  });
});

import { recognise, searchConditions } from "@/lib/conditions";
describe("conditions", () => {
  it("accepts listed names and everyday aliases, rejects made-up ones", () => {
    expect(recognise("asthma")).toBe("Asthma");
    expect(recognise("hay fever")).toBe("Allergic rhinitis (hay fever)");
    expect(recognise("sjogrens syndrome")).toBe("Sjögren's syndrome");
    expect(recognise("asthmaa")).toBeNull();
    expect(recognise("dragon pox")).toBeNull();
  });
  it("suggests names as you type", () => {
    expect(searchConditions("diab")).toContain("Type 2 diabetes");
    expect(searchConditions("canc").length).toBeGreaterThan(3);
  });
});
