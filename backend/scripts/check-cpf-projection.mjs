import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const { oaRateForAge, estimateMonthlyOa, projectOa, affordableCeiling, fundStages, timingForLaunch } = await import(
  "../../frontend/src/utils/cpfProjection.ts"
);

// 2026 allocation: 37% of wages, 62.17% of that to OA for 35 and under.
assert.ok(Math.abs(oaRateForAge(30) - 0.230029) < 1e-6);
assert.equal(estimateMonthlyOa(6000, 30), 1380);
// Ordinary Wage ceiling: S$8,000 per earner, two earners.
assert.equal(estimateMonthlyOa(20000, 30), Math.round(16000 * 0.37 * 0.6217));
// The rate drops after 35, month by month.
assert.ok(projectOa({ cpfToday: 0, combinedIncome: 6000, age: 35, monthlyOverride: null, months: 24 }) < 1380 * 24);
assert.equal(projectOa({ cpfToday: 1000, combinedIncome: 6000, age: 30, monthlyOverride: 500, months: 10 }), 6000);

// Timing: a launch in Nov 2026 with keys in Jul 2030, seen from Nov 2026.
const timing = timingForLaunch({
  today: new Date(2026, 10, 1),
  applicationMonth: new Date(2026, 10, 1),
  expectedKeys: new Date(2030, 6, 1),
});
assert.deepEqual(timing, { monthsToSigning: 7, monthsToKeys: 44 });

// A fresh-grad couple: S$6,000 a month, aged 26, S$10k CPF, only fee money in cash, S$50k grant.
const base = {
  financing: "hdb",
  purchasePrice: 400000,
  grossMonthlyIncome: 6000,
  availableCash: 2010,
  availableCpfOa: 10000,
  grantAmount: 50000,
  monthlyDebtPayments: 0,
  monthlyPropertyLoanPayments: 0,
  bankThereafterRatePercent: 2.6,
  cashOnlyPurchaseAmount: 2000,
  fixedAdditionalCosts: 314,
  cashOnlyCosts: 10,
  ageForLoanRules: 26,
  outstandingHousingLoans: 0,
  requestedTenureYears: 25,
  repaymentRatePercent: 2.6,
};
const common = { base, cpfToday: 10000, combinedIncome: 6000, age: 26, monthlyOverride: null, signingShare: 0.1, minCashSigningShare: 0 };
const today = affordableCeiling({ ...common, timing: { monthsToSigning: 0, monthsToKeys: 0 } });
const later = affordableCeiling({ ...common, timing });
console.log("savings today only:", Math.round(today.price), today.limitedBy);
console.log("CPF built up by keys:", Math.round(later.price), later.limitedBy, "OA at signing", later.oaAtSigning, "at keys", later.oaAtKeys);
assert.ok(later.price > today.price + 100000, "CPF built up before keys should raise the ceiling a lot");

// Grant arrives before signing and pays the signing downpayment first.
const stages = fundStages({ signing: 40000, keys: 60000, minCashSigning: 0, grant: 50000, oaAtSigning: 20000, oaAtKeys: 70000, cash: 2000 });
assert.deepEqual(stages.signing, { grant: 40000, cpf: 0, cash: 0, uncovered: 0 });
assert.deepEqual(stages.keys, { grant: 10000, cpf: 50000, cash: 0, uncovered: 0 });
// Not enough CPF by signing: the rest is cash, and what cash can't cover is flagged.
const short = fundStages({ signing: 40000, keys: 0, minCashSigning: 0, grant: 0, oaAtSigning: 30000, oaAtKeys: 30000, cash: 4000 });
assert.deepEqual(short.signing, { grant: 0, cpf: 30000, cash: 4000, uncovered: 6000 });

console.log("CPF projection checks passed.");
