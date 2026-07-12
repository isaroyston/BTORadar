import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const { calculateEhgAssessment } = await import(
  "../../frontend/src/utils/ehg.ts"
);

const base = {
  assessedAverageMonthlyIncome: null,
  confirmedAmount: null,
  familyEligibilityConfirmed: false,
};

assert.deepEqual(calculateEhgAssessment({ ...base, mode: "unassessed" }).amount, null);
assert.equal(calculateEhgAssessment({ ...base, mode: "none" }).amount, 0);
assert.equal(
  calculateEhgAssessment({ ...base, mode: "confirmed", confirmedAmount: 40000 })
    .amount,
  40000
);
assert.equal(
  calculateEhgAssessment({
    ...base,
    mode: "family-estimate",
    assessedAverageMonthlyIncome: 6000,
  }).amount,
  null
);
assert.equal(
  calculateEhgAssessment({
    ...base,
    mode: "family-estimate",
    assessedAverageMonthlyIncome: 1500.5,
    familyEligibilityConfirmed: true,
  }).amount,
  110000
);
assert.equal(
  calculateEhgAssessment({
    ...base,
    mode: "family-estimate",
    assessedAverageMonthlyIncome: 6000,
    familyEligibilityConfirmed: true,
  }).amount,
  50000
);
const aboveCeiling = calculateEhgAssessment({
  ...base,
  mode: "family-estimate",
  assessedAverageMonthlyIncome: 9000.01,
  familyEligibilityConfirmed: true,
});
assert.equal(aboveCeiling.status, "ineligible");
assert.equal(aboveCeiling.amount, 0);

console.log("EHG checks passed.");
