import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrialMatchCard } from "@/components/trials/TrialMatchCard";
import type { TrialMatch } from "@/types";

const match: TrialMatch = {
  trial: { nct_id: "NCT00000001", title: "Asthma Test Study", brief_summary: null, status: "RECRUITING", conditions: ["Asthma"], interventions: [], phases: ["PHASE2"], inclusion_criteria: null, exclusion_criteria: null, min_age: null, max_age: null, locations: [{ facility: "Guy's Hospital", city: "London", country: "United Kingdom" }], url: "https://clinicaltrials.gov/study/NCT00000001" },
  status: "MORE_INFORMATION_NEEDED", why_surfaced: ["Condition matches"], relevant_criteria: [], missing_information: [], needs_coordinator_confirmation: [], plain_language_summary: null,
  disclaimer: "Preliminary match only.",
};

describe("TrialMatchCard", () => {
  it("renders the design-system status label, reason and disclaimer", () => {
    render(<TrialMatchCard match={match} />);
    expect(screen.getByText("Needs more info")).toBeTruthy();
    expect(screen.getByText("Phase 2")).toBeTruthy();
    expect(screen.getByText(/Shown because condition matches/)).toBeTruthy();
    expect(screen.getByText(/Preliminary/)).toBeTruthy();
  });
  it("never says eligible", () => {
    const { container } = render(<TrialMatchCard match={{ ...match, status: "POTENTIAL_MATCH" }} />);
    expect(container.textContent).not.toMatch(/eligible/i);
    expect(screen.getByText("Possible match")).toBeTruthy();
  });
});

import { ageRange } from "@/components/trials/TrialMatchCard";
describe("ageRange", () => {
  it("reads ClinicalTrials.gov ages in plain English", () => {
    expect(ageRange("18 Years", "65 Years")).toBe("18 to 65 years");
    expect(ageRange("18 Years", null)).toBe("18 years and over");
    expect(ageRange(null, null)).toBe("Not listed");
  });
});

import { phaseLabel } from "@/components/trials/TrialMatchCard";
describe("phaseLabel", () => {
  it("reads ClinicalTrials.gov phase codes", () => {
    expect(phaseLabel("PHASE3")).toBe("Phase 3");
    expect(phaseLabel("EARLY_PHASE1")).toBe("Early phase 1");
    expect(phaseLabel("NA")).toBe("No phase");
  });
});
