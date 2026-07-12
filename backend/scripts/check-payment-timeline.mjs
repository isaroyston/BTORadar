import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const { getDownpaymentRule, POLICY_CONFIG } = await import(
  "../../frontend/src/policies/policyConfig.ts"
);
const { buildPaymentTimeline } = await import(
  "../../frontend/src/utils/paymentTimeline.ts"
);

const flatPrice = 500000;
const optionFee = POLICY_CONFIG.fees.optionFeeByFlatType["4-room"];

assert.deepEqual(
  ["normal", "staggered", "dia"].map((scheme) => {
    const rule = getDownpaymentRule("hdb", scheme, 0.75);
    return [rule.signing, rule.key, rule.minCashSigning, rule.minCashKey];
  }),
  [
    [0.1, 0.15, 0, 0],
    [0.05, 0.2, 0, 0],
    [0.025, 0.225, 0, 0],
  ]
);
assert.match(getDownpaymentRule("bank", "normal", 0.45).note, /45%/);
assert.match(
  getDownpaymentRule("bank", "normal", 0.45).note,
  /does not publish a stage split/
);
assert.deepEqual(
  ["normal", "staggered", "dia"].map((scheme) => {
    const rule = getDownpaymentRule("bank", scheme, 0.75);
    return [rule.signing, rule.key, rule.minCashSigning, rule.minCashKey];
  }),
  [
    [0.2, 0.05, 0.05, 0],
    [0.1, 0.15, 0.05, 0],
    [0.025, 0.225, 0.025, 0.025],
  ]
);
assert.deepEqual(
  ["normal", "staggered", "dia"].map((scheme) => {
    const rule = getDownpaymentRule("bank", scheme, 0.55);
    return [rule.signing, rule.key, rule.minCashSigning, rule.minCashKey];
  }),
  [
    [0.2, 0.25, 0.1, 0],
    [0.1, 0.35, 0.1, 0],
    [0.025, 0.425, 0.025, 0.075],
  ]
);

for (const scheme of ["normal", "staggered", "dia"]) {
  const rule = getDownpaymentRule("none", scheme, 0);
  assert.equal(rule.signing + rule.key, 1, `${scheme} schedule`);

  const signingAmount = flatPrice * rule.signing - optionFee;
  const keyAmount = flatPrice * rule.key;
  const timeline = buildPaymentTimeline({
    applicationMonth: "2026-08",
    expectedTop: "2030-11",
    flatType: "4-room",
    financing: "none",
    keyFeeLabel: "Survey and lease-registration estimates",
    applicationAllocation: cashAllocation(POLICY_CONFIG.fees.applicationFee),
    bookingAllocation: cashAllocation(optionFee),
    signingAllocation: allocation(signingAmount),
    agreementFeeAllocation: allocation(0),
    keyAllocation: allocation(keyAmount),
    keyFeeAllocation: cashAllocation(0),
  });

  assert.deepEqual(
    timeline.map(({ id }) => id),
    [
      "application",
      "booking",
      "agreement",
      "agreement-fees",
      "keys",
      "key-fees",
    ]
  );

  const purchasePayments = timeline
    .filter(({ id }) => ["booking", "agreement", "keys"].includes(id))
    .reduce((sum, item) => sum + (item.payment?.total ?? 0), 0);

  assert.equal(purchasePayments, flatPrice, `${scheme} purchase total`);
  assert.equal(
    timeline.find(({ id }) => id === "booking")?.payment?.total,
    optionFee
  );
  assert.equal(
    timeline.find(({ id }) => id === "agreement")?.payment?.total,
    signingAmount
  );
  assert.match(
    timeline.find(({ id }) => id === "keys")?.note ?? "",
    /expected TOP/
  );
  assert.match(
    timeline.find(({ id }) => id === "keys")?.payment?.note ?? "",
    /No housing loan/
  );
}

const historicalTopTimeline = buildPaymentTimeline({
  applicationMonth: "2026-08",
  expectedTop: "2022-01",
  flatType: "4-room",
  financing: "hdb",
  keyFeeLabel: "Survey and HDB fees",
  applicationAllocation: cashAllocation(POLICY_CONFIG.fees.applicationFee),
  bookingAllocation: cashAllocation(optionFee),
  signingAllocation: allocation(48000),
  agreementFeeAllocation: allocation(9600),
  keyAllocation: allocation(75000),
  keyFeeAllocation: allocation(0),
});
assert.match(
  historicalTopTimeline.find(({ id }) => id === "keys")?.note ?? "",
  /not after the agreement/
);

assert.throws(
  () =>
    buildPaymentTimeline({
      applicationMonth: "Aug 2026",
      flatType: "4-room",
      financing: "none",
      keyFeeLabel: "Survey and lease-registration estimates",
      applicationAllocation: cashAllocation(POLICY_CONFIG.fees.applicationFee),
      bookingAllocation: cashAllocation(optionFee),
      signingAllocation: allocation(48000),
      agreementFeeAllocation: allocation(0),
      keyAllocation: allocation(75000),
      keyFeeAllocation: cashAllocation(0),
    }),
  /YYYY-MM/
);

console.log("Payment timeline checks passed.");

function allocation(total) {
  return {
    total,
    cash: 0,
    cpfOa: total,
    grant: 0,
    unallocated: 0,
    minimumCash: 0,
    minimumCashShortfall: 0,
  };
}

function cashAllocation(total) {
  return {
    total,
    cash: total,
    cpfOa: 0,
    grant: 0,
    unallocated: 0,
    minimumCash: total,
    minimumCashShortfall: 0,
  };
}
