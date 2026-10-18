import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
    expect(screen.getByText("We need to check")).toBeTruthy();
    expect(screen.getByText("Phase 2")).toBeTruthy();
    expect(screen.getByText(/Shown because condition matches/)).toBeTruthy();
    expect(screen.getByText(/Preliminary/)).toBeTruthy();
  });
  it("never says eligible", () => {
    const { container } = render(<TrialMatchCard match={{ ...match, status: "POTENTIAL_MATCH" }} />);
    expect(container.textContent).not.toMatch(/eligible/i);
    expect(screen.getByText("Could be a fit")).toBeTruthy();
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

describe("TrialMatchCard with a trial update", () => {
  afterEach(cleanup);
  const update = { status: "KNOWN_CRITERIA_MISMATCH" as const, label: "Not a fit right now", previous_status: "MORE_INFORMATION_NEEDED" as const,
    previous_label: "We need to check", reason: "Insulin now means this study may not fit you.", changed_at: "2026-10-18T09:00:00Z",
    is_new: true, provisional: false, fix_options: [{ label: "I stopped taking Insulin", facts: [{ type: "medication_stopped", value: "Insulin" }] }] };
  it("shows the new status, the reason, what it was, and the fix link, in patient words", () => {
    const { container } = render(<TrialMatchCard match={{ ...match, status: "KNOWN_CRITERIA_MISMATCH", update }} />);
    expect(screen.getByText("Not a fit right now")).toBeTruthy();
    expect(screen.getByText("Updated today")).toBeTruthy();
    expect(screen.getByText(/Insulin now means/)).toBeTruthy();
    expect(screen.getByText("Was: We need to check")).toBeTruthy();
    expect(screen.getByText("Not right? Fix it")).toBeTruthy();
    expect(container.textContent).not.toMatch(/agent|event|conflict/i);
  });
  it("says it will double-check instead of offering fixes while provisional", () => {
    render(<TrialMatchCard match={{ ...match, update: { ...update, provisional: true } }} />);
    expect(screen.getByText(/double-check this shortly/)).toBeTruthy();
    expect(screen.queryByText("Not right? Fix it")).toBeNull();
  });
});
