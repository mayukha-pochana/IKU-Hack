import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EFFECT_LABEL, ExplanationCriteria, groupCriteria } from "@/components/trials/TrialExplanation";
import type { CriterionAssessment } from "@/types";

const c = (kind: CriterionAssessment["kind"], plain_text: string, effect: CriterionAssessment["effect"]): CriterionAssessment =>
  ({ kind, original_text: `Registry: ${plain_text}`, plain_text, applies_to_patient: "UNKNOWN", evidence: null, question_for_coordinator: null, effect, quote_verified: true });

const criteria = [
  c("exclusion", "No smokers", "supports"),
  c("inclusion", "Aged 18 to 65", "supports"),
  c("inclusion", "Asthma for 6 months", "unknown"),
  c("inclusion", "Aged 50 or over", "conflicts"),
];

describe("groupCriteria", () => {
  it("puts inclusion before exclusion and may-not-fit before unknown before in-your-favour", () => {
    const g = groupCriteria(criteria);
    expect(g.map((x) => x.heading)).toEqual(["Who can take part", "Who can't take part"]);
    expect(g[0].items.map((x) => x.plain_text)).toEqual(["Aged 50 or over", "Asthma for 6 months", "Aged 18 to 65"]);
    expect(g[1].items.map((x) => x.plain_text)).toEqual(["No smokers"]);
  });
  it("drops empty groups", () => {
    expect(groupCriteria([c("exclusion", "No smokers", "supports")]).map((x) => x.kind)).toEqual(["exclusion"]);
    expect(groupCriteria([])).toEqual([]);
  });
});

describe("ExplanationCriteria", () => {
  it("maps each effect to a tone and a word, never colour alone", () => {
    expect(EFFECT_LABEL.supports.tone).toBe("success");
    expect(EFFECT_LABEL.conflicts.tone).toBe("danger");
    expect(EFFECT_LABEL.unknown.tone).toBe("warning");
    const { container } = render(<ExplanationCriteria criteria={criteria} />);
    const row = screen.getByText("Aged 50 or over").closest("li")!;
    const badge = within(row).getByText("May not fit you");
    expect(badge.className).toContain("pz-badge--danger");
    expect(badge.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("Not known yet").className).toContain("pz-badge--warning");
    expect(screen.getAllByText("In your favour")).toHaveLength(2);
    expect(container.textContent).not.toMatch(/eligible|study/i);
  });
});

describe("criterion evidence", () => {
  it("names where the evidence came from and shows the sensor note", () => {
    const sensor: CriterionAssessment = { ...c("exclusion", "Resting heart rate above 100", "unknown"), evidence: "heart rate 104", evidence_source: "sensor_reading",
      note: "Based only on a contactless sensor estimate; confirm with the study team." };
    const med: CriterionAssessment = { ...c("exclusion", "Taking insulin", "conflicts"), evidence: "Insulin 10 units", evidence_source: "medication" };
    render(<ExplanationCriteria criteria={[sensor, med]} />);
    expect(screen.getByText("From your check-in (camera estimate): heart rate 104")).toBeTruthy();
    expect(screen.getByText("From your medication list: Insulin 10 units")).toBeTruthy();
    expect(screen.getByText(/contactless sensor estimate/)).toBeTruthy();
  });
});
