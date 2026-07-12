import { lookupEhgFamiliesGrant } from "../policies/policyConfig.ts";
import type { EhgMode } from "../types.ts";

export type EhgAssessment = {
  status:
    | "unassessed"
    | "conditional-estimate"
    | "confirmed"
    | "ineligible"
    | "none";
  amount: number | null;
  note: string;
};

export function calculateEhgAssessment({
  mode,
  assessedAverageMonthlyIncome,
  confirmedAmount,
  familyEligibilityConfirmed,
}: {
  mode: EhgMode;
  assessedAverageMonthlyIncome: number | null;
  confirmedAmount: number | null;
  familyEligibilityConfirmed: boolean;
}): EhgAssessment {
  if (mode === "none") {
    return {
      status: "none",
      amount: 0,
      note: "No EHG is included in this plan.",
    };
  }

  if (mode === "confirmed") {
    return confirmedAmount === null
      ? {
          status: "unassessed",
          amount: null,
          note: "Enter the EHG amount stated in your HFE letter.",
        }
      : {
          status: "confirmed",
          amount: confirmedAmount,
          note: "Uses the EHG amount entered from your HFE letter.",
        };
  }

  if (mode === "family-estimate") {
    if (!familyEligibilityConfirmed || assessedAverageMonthlyIncome === null) {
      return {
        status: "unassessed",
        amount: null,
        note:
          "Confirm the first-timer-family conditions and enter the assessed 12-month average income.",
      };
    }

    const band = lookupEhgFamiliesGrant(assessedAverageMonthlyIncome);
    if (!band) {
      return {
        status: "ineligible",
        amount: 0,
        note:
          "The entered assessed income is above the family EHG ceiling. HFE remains authoritative.",
      };
    }

    return {
      status: "conditional-estimate",
      amount: band.grantAmount,
      note:
        "Conditional family estimate only. HDB checks employment, household, property and lease conditions through HFE.",
    };
  }

  return {
    status: "unassessed",
    amount: null,
    note: "EHG is excluded until you choose an assessment mode.",
  };
}
