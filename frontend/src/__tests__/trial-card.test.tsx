import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrialMatchCard } from "@/components/trials/TrialMatchCard";
import type { TrialMatch } from "@/types";

const match: TrialMatch = {
  trial: { nct_id: "NCT00000001", title: "Asthma Test Study", brief_summary: null, status: "RECRUITING", conditions: ["Asthma"], interventions: [], phases: [], inclusion_criteria: null, exclusion_criteria: null, min_age: null, max_age: null, locations: [], url: "https://clinicaltrials.gov/study/NCT00000001" },
  status: "MORE_INFORMATION_NEEDED", why_surfaced: ["Condition matches"], relevant_criteria: [], missing_information: [], needs_coordinator_confirmation: [], plain_language_summary: null,
  disclaimer: "Preliminary match only.",
};

describe("TrialMatchCard", () => {
  it("renders status and disclaimer", () => {
    render(<TrialMatchCard match={match} />);
    expect(screen.getByText("More information needed")).toBeTruthy();
    expect(screen.getByText(/Preliminary/)).toBeTruthy();
  });
});
