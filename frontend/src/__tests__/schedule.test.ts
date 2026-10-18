import { describe, expect, it } from "vitest";
import { describeSchedule, fieldOf, fromFrequency } from "@/lib/schedule";

describe("fromFrequency", () => {
  it("suggests times for recognised frequencies, as a suggestion only", () => {
    expect(fromFrequency("twice_daily")).toEqual({ pattern: "daily", suggested: ["08:00", "20:00"] });
    expect(fromFrequency("Three times daily").suggested).toEqual(["08:00", "14:00", "20:00"]);
    expect(fromFrequency("four_times_daily").suggested).toEqual(["08:00", "12:00", "16:00", "20:00"]);
    expect(fromFrequency("once a day").suggested).toEqual(["08:00"]);
  });
  it("treats when-needed medicines as as_needed with no times", () => {
    expect(fromFrequency("as needed")).toEqual({ pattern: "as_needed", suggested: null });
  });
  it("never guesses when the frequency is unclear", () => {
    expect(fromFrequency("see leaflet").suggested).toBeNull();
    expect(fromFrequency(null).suggested).toBeNull();
  });
});

describe("describeSchedule", () => {
  const base = { duration_days: 14, timezone: "Europe/London" };
  it("reads each pattern in plain words", () => {
    expect(describeSchedule({ ...base, times: ["08:00", "20:00"] })).toBe("Twice a day at 08:00 and 20:00, for 14 days");
    expect(describeSchedule({ ...base, pattern: "every_n_days", interval_days: 3, times: ["09:00"] })).toBe("Every 3 days at 09:00, for 14 days");
    expect(describeSchedule({ ...base, pattern: "weekly", weekdays: [0, 3], times: ["10:00"] })).toBe("Every Monday and Thursday at 10:00, for 14 days");
    expect(describeSchedule({ ...base, pattern: "as_needed", times: [] })).toBe("When needed, for up to 14 days");
  });
});

describe("fieldOf", () => {
  it("places label-reading doubts next to the right field", () => {
    expect(fieldOf("strength was not found on the prescription.")).toBe("strength");
    expect(fieldOf("No administration times are printed")).toBe("times");
    expect(fieldOf("duration days was not found")).toBe("duration");
    expect(fieldOf("Preview mode: sample text")).toBeNull();
  });
});
