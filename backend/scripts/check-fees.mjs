import assert from "node:assert/strict";

const {
  calculateBuyerStampDuty,
  calculateDeedOfAssignmentStampDuty,
} = await import(
  "../../frontend/src/utils/fees.ts"
);

assert.equal(calculateBuyerStampDuty(0), 0);
assert.equal(calculateBuyerStampDuty(180000), 1800);
assert.equal(calculateBuyerStampDuty(360000), 5400);
assert.equal(calculateBuyerStampDuty(500000), 9600);
assert.equal(calculateBuyerStampDuty(650000), 14100);
assert.equal(calculateBuyerStampDuty(2000000), 69600);
assert.equal(calculateDeedOfAssignmentStampDuty(0), 0);
assert.equal(calculateDeedOfAssignmentStampDuty(100000), 400);
assert.equal(calculateDeedOfAssignmentStampDuty(125000), 500);
assert.equal(calculateDeedOfAssignmentStampDuty(500000), 500);

console.log("Fee checks passed.");
