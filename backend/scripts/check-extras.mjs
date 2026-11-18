import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const { eligibilityChecks } = await import("../../frontend/src/utils/journey.ts");
const { shareUrl, readSharedPlan } = await import("../../frontend/src/utils/share.ts");
const { calculateEhgAssessment } = await import("../../frontend/src/utils/ehg.ts");
const { estimateMonthlyOa } = await import("../../frontend/src/utils/cpfProjection.ts");
const { calculateFinancingEstimate } = await import("../../frontend/src/utils/affordability.ts");
const { EMPTY_BUDGET_INPUTS, parseBudgetInputs } = await import("../../frontend/src/utils/budgetStorage.ts");

const byKey = (checks) => Object.fromEntries(checks.map((check) => [check.key, check]));

// Singles: 35 and over, a 2-room Flexi, up to S$8,000, the singles grant up to S$4,500.
let checks = byKey(eligibilityChecks({ income: 7500, firstTimers: "both", flatType: "2-room", grant: 0, household: "single", age: 38 }));
assert.equal(checks.who.status, "ok");
assert.equal(checks.ceiling.status, "ok");
assert.match(checks.grant.body, /4,500/);
assert.equal(checks.priority, undefined);
checks = byKey(eligibilityChecks({ income: 5000, firstTimers: "both", flatType: "4-room", grant: 0, household: "single", age: 38 }));
assert.equal(checks.who.status, "caution");
checks = byKey(eligibilityChecks({ income: 5000, firstTimers: "both", flatType: "2-room", grant: 0, household: "single", age: 30 }));
assert.match(checks.who.title, /from age 35/);
checks = byKey(eligibilityChecks({ income: 8500, firstTimers: "both", flatType: "2-room", grant: 0, household: "single", age: 40 }));
assert.equal(checks.ceiling.status, "caution");
checks = byKey(eligibilityChecks({ income: 6000, firstTimers: "both", flatType: "4-room", grant: 40000, hfe: true }));
assert.match(checks.loan.title, /HFE letter/);

const single = (income) =>
  calculateEhgAssessment({ mode: "single-estimate", assessedAverageMonthlyIncome: income, confirmedAmount: null, familyEligibilityConfirmed: true }).amount;
assert.equal(single(700), 60000);
assert.equal(single(4000), 10000);
assert.equal(single(4500), 2500);
assert.equal(single(4501), 0);

// One earner has one S$8,000 wage ceiling; two have two.
assert.equal(estimateMonthlyOa(12000, 30, 1), Math.round(8000 * 0.37 * 0.6217));
assert.equal(estimateMonthlyOa(12000, 30, 2), Math.round(12000 * 0.37 * 0.6217));

// An HFE loan replaces the income-based limit.
const base = {
  financing: "hdb",
  purchasePrice: 500000,
  grossMonthlyIncome: 6500,
  availableCash: 5000,
  availableCpfOa: 150000,
  grantAmount: 40000,
  monthlyDebtPayments: 0,
  monthlyPropertyLoanPayments: 0,
  bankThereafterRatePercent: 2.6,
  cashOnlyPurchaseAmount: 2000,
  fixedAdditionalCosts: 300,
  cashOnlyCosts: 10,
  ageForLoanRules: 30,
  outstandingHousingLoans: 0,
  requestedTenureYears: 25,
  repaymentRatePercent: 2.6,
};
assert.ok(Math.abs(calculateFinancingEstimate(base).serviceabilityLoanLimit - 411209) < 10);
assert.equal(calculateFinancingEstimate({ ...base, confirmedLoanLimit: 380000 }).serviceabilityLoanLimit, 380000);

// Share links round-trip in the hash and reject junk.
const plan = {
  budget: { ...EMPTY_BUDGET_INPUTS, cpfOa: 63000, age: 30, household: "couple", hfeLoan: 380000, hfeGrant: 40000, hfeIssued: "2026-10" },
  combinedIncome: 6500,
  flatType: "4-room",
  financing: "hdb",
  projectId: "chencharu-acres",
};
const url = shareUrl(plan, "https://example.test/?tab=bto#old");
assert.match(url, /^https:\/\/example\.test\/#plan=/);
assert.deepEqual(readSharedPlan(new URL(url).hash), plan);
assert.equal(readSharedPlan("#plan=not-base64!"), null);
assert.equal(readSharedPlan("#other"), null);
assert.equal(parseBudgetInputs({ household: "spaceship" }).household, "couple");
assert.equal(parseBudgetInputs({ hfeIssued: "soon" }).hfeIssued, null);

console.log("extras checks passed");
