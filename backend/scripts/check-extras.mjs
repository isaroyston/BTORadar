import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const { eligibilityChecks, ballotChances, roughOdds } = await import("../../frontend/src/utils/journey.ts");
const { loanBalance, monthlyRepayment, mopYears, ownerOccupierTax, sccRange, afterKeys } = await import(
  "../../frontend/src/utils/ownership.ts"
);
const { buildCalendar } = await import("../../frontend/src/utils/calendar.ts");
const { shareUrl, readSharedPlan } = await import("../../frontend/src/utils/share.ts");
const { distanceKm } = await import("../../frontend/src/utils/commute.ts");
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

// Ballot chances: FT 2, FT(PMC) 3, +1 per Standard try after two misses, capped at 4 (5); none extra for Plus/Prime.
const chances = (profile, standard = true, firstTimers = "both", household = "couple") =>
  ballotChances({ household, firstTimers, profile, standard }).chances;
assert.equal(chances({ pmc: false, unsuccessfulStandard: 0 }), 2);
assert.equal(chances({ pmc: true, unsuccessfulStandard: 0 }), 3);
assert.equal(chances({ pmc: false, unsuccessfulStandard: 1 }), 2);
assert.equal(chances({ pmc: false, unsuccessfulStandard: 2 }), 3);
assert.equal(chances({ pmc: false, unsuccessfulStandard: 6 }), 4);
assert.equal(chances({ pmc: true, unsuccessfulStandard: 6 }), 5);
assert.equal(chances({ pmc: true, unsuccessfulStandard: 6 }, false), 3);
assert.equal(chances({ pmc: false, unsuccessfulStandard: 0 }, true, "none"), 1);
assert.equal(chances({ pmc: false, unsuccessfulStandard: 0 }, true, "both", "single"), 1);
assert.equal(roughOdds(0.6, 2, 2), 1);
assert.equal(roughOdds(4, 2, 2), 0.25);
assert.equal(roughOdds(4, 3, 2), 0.375);

// Repayments and balances at 2.6% over 25 years.
const monthly = monthlyRepayment(411209, 2.6, 25);
assert.ok(Math.abs(monthly - 1866) < 1);
assert.ok(Math.abs(loanBalance(411209, 2.6, 25, 60) - 348835) < 50);
assert.equal(Math.round(loanBalance(411209, 2.6, 25, 300)), 0);
assert.equal(mopYears({ btoType: "standard" }), 5);
assert.equal(mopYears({ btoType: "plus" }), 10);
assert.equal(mopYears({ btoType: "Prime" }), 10);
const after = afterKeys({ keysDate: new Date(2030, 7, 1), loan: 411209, ratePercent: 2.6, tenureYears: 25, project: { btoType: "standard" } });
assert.equal(after.mopEnds, new Date(2035, 7, 1).toLocaleString("en-SG", { month: "short", year: "numeric" }));

// IRAS's worked example: annual value S$36,000, owner-occupied, pays S$960 (2025 rates).
assert.equal(ownerOccupierTax(36000), 960);
assert.equal(ownerOccupierTax(12000), 0);
assert.deepEqual(
  sccRange({ sources: [{ rates: { "4-room": 81.5 } }, { rates: { "4-room": 89.5 } }, { rates: {} }] }, "4-room"),
  { low: 81.5, high: 89.5 },
);

// Calendar: all-day events with escaped text and CRLF lines.
const ics = buildCalendar(
  [{ date: new Date(2027, 1, 15), title: "Apply, Feb", description: "Line one; two" }],
  new Date(Date.UTC(2026, 10, 17, 9, 5)),
);
assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
assert.match(ics, /DTSTART;VALUE=DATE:20270201\r\n/);
assert.match(ics, /DTEND;VALUE=DATE:20270202\r\n/);
assert.match(ics, /SUMMARY:Apply\\, Feb\r\n/);
assert.match(ics, /DESCRIPTION:Line one\\; two\r\n/);
assert.match(ics, /END:VCALENDAR\r\n$/);

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
assert.equal(parseBudgetInputs({ unsuccessfulStandard: 99 }).unsuccessfulStandard, 20);
assert.equal(parseBudgetInputs({ hfeIssued: "soon" }).hfeIssued, null);

// Raffles Place to Toa Payoh is a little over 5 km in a straight line.
const km = distanceKm({ lat: 1.2841, lon: 103.8515 }, { lat: 1.3343, lon: 103.8563 });
assert.ok(km > 5.4 && km < 5.8, `distance ${km}`);

console.log("extras checks passed");
