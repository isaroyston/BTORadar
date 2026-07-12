import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const {
  createPlannerSnapshot,
  parsePlannerSnapshot,
  savePlannerSnapshot,
} = await import(
  "../../frontend/src/utils/planStorage.ts"
);

const legacyV1 = parsePlannerSnapshot(
  JSON.stringify({
    ...baseSnapshot(),
    version: 1,
    completedMilestones: [
      "Application window",
      "Application window",
      "Post-keys fees",
      "",
      null,
    ],
    confirmedMilestoneDates: {
      "Flat booking": "2026-12-15",
      "Key collection": "2030-02-29",
      "Post-keys fees": "2032-02-29",
    },
  })
);

assert.equal(legacyV1.version, 4);
assert.deepEqual(legacyV1.completedMilestones, ["application", "key-fees"]);
assert.deepEqual(legacyV1.confirmedMilestoneDates, {
  booking: "2026-12-15",
  "key-fees": "2032-02-29",
});
assert.deepEqual(legacyV1.paymentOverrides, {});
assert.equal(legacyV1.availableCash, null);
assert.equal(legacyV1.availableCpfOa, null);
assert.equal(legacyV1.monthlyDebtPayments, null);
assert.equal(legacyV1.monthlyPropertyLoanPayments, null);
assert.equal(legacyV1.bankThereafterRate, null);
assert.equal(legacyV1.ageForLoanRules, null);
assert.equal(legacyV1.outstandingHousingLoans, null);
assert.equal(legacyV1.ehgMode, "unassessed");
assert.equal(legacyV1.ehgAssessedIncome, null);
assert.equal(legacyV1.ehgConfirmedAmount, null);
assert.equal(legacyV1.ehgFamilyEligibilityConfirmed, false);

const legacyV2 = parsePlannerSnapshot(
  JSON.stringify({
    ...baseSnapshot(),
    version: 2,
    completedMilestones: ["Key collection fees", "Key collection fees"],
    paymentOverrides: {
      "Agreement for lease": { total: 50000, cpf: 45000, cash: 5000 },
      "Key collection": { total: 25000, cpf: 20000, cash: 5000 },
    },
  })
);

assert.deepEqual(legacyV2.completedMilestones, ["key-fees"]);
assert.deepEqual(legacyV2.paymentOverrides, {
  agreement: { total: 50000, cpf: 45000, cash: 5000 },
  keys: { total: 25000, cpf: 20000, cash: 5000 },
});

const current = parsePlannerSnapshot(
  JSON.stringify({
    ...baseSnapshot(),
    version: 4,
    financing: "hdb",
    loanTenureYears: 25,
    availableCash: 75000,
    availableCpfOa: null,
    monthlyDebtPayments: 350,
    monthlyPropertyLoanPayments: 200,
    bankThereafterRate: 4.5,
    ageForLoanRules: 31,
    outstandingHousingLoans: 0,
    ehgMode: "confirmed",
    ehgConfirmedAmount: 40000,
    ehgFamilyEligibilityConfirmed: true,
    completedMilestones: ["booking", "agreement"],
    confirmedMilestoneDates: {
      booking: "2028-02-29",
    },
    paymentOverrides: {
      agreement: { total: 48000, cpf: 43000, cash: 5000 },
    },
  })
);

assert.equal(current.loanTenureYears, 25);
assert.equal(current.availableCash, 75000);
assert.equal(current.availableCpfOa, null);
assert.equal(current.monthlyDebtPayments, 350);
assert.equal(current.monthlyPropertyLoanPayments, 200);
assert.equal(current.bankThereafterRate, 4.5);
assert.equal(current.ageForLoanRules, 31);
assert.equal(current.outstandingHousingLoans, 0);
assert.equal(current.ehgMode, "confirmed");
assert.equal(current.ehgConfirmedAmount, 40000);
assert.deepEqual(current.completedMilestones, ["booking", "agreement"]);
assert.deepEqual(current.confirmedMilestoneDates, {
  booking: "2028-02-29",
});
assert.deepEqual(current.paymentOverrides, {
  agreement: { total: 48000, cpf: 43000, cash: 5000 },
});

const invalidOptionalNumbers = parsePlannerSnapshot(
  JSON.stringify({
    ...baseSnapshot(),
    version: 3,
    loanTenureYears: "20",
    loanInterestRate: "2.6",
    availableCash: "75000",
    availableCpfOa: false,
    monthlyDebtPayments: "0",
    monthlyPropertyLoanPayments: "0",
    bankThereafterRate: "4.5",
    ageForLoanRules: "30",
    outstandingHousingLoans: "0",
    ehgAssessedIncome: "5000",
    ehgConfirmedAmount: "40000",
  })
);

assert.equal(invalidOptionalNumbers.loanTenureYears, 25);
assert.equal(invalidOptionalNumbers.loanInterestRate, 2.6);
assert.equal(invalidOptionalNumbers.availableCash, null);
assert.equal(invalidOptionalNumbers.availableCpfOa, null);
assert.equal(invalidOptionalNumbers.monthlyDebtPayments, null);
assert.equal(invalidOptionalNumbers.monthlyPropertyLoanPayments, null);
assert.equal(invalidOptionalNumbers.bankThereafterRate, null);
assert.equal(invalidOptionalNumbers.ageForLoanRules, null);
assert.equal(invalidOptionalNumbers.outstandingHousingLoans, null);
assert.equal(invalidOptionalNumbers.ehgAssessedIncome, null);
assert.equal(invalidOptionalNumbers.ehgConfirmedAmount, null);

assert.throws(
  () => parsePlannerSnapshot(JSON.stringify({ ...baseSnapshot(), version: 5 })),
  /newer planner version/
);
assert.throws(
  () =>
    parsePlannerSnapshot(JSON.stringify({ ...baseSnapshot(), version: "4" })),
  /invalid schema version/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({ ...baseSnapshot(), combinedIncome: "6000" })
    ),
  /invalid household income/
);
assert.throws(
  () =>
    parsePlannerSnapshot(JSON.stringify({ ...baseSnapshot(), flatPrice: null })),
  /invalid flat price/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({ ...baseSnapshot(), version: 4, availableCash: -1 })
    ),
  /availableCash/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({
        ...baseSnapshot(),
        version: 4,
        financing: "hdb",
        loanTenureYears: 30,
      })
    ),
  /loan tenure/
);
assert.throws(
  () => {
    const value = { ...baseSnapshot(), version: 4 };
    delete value.applicationMonth;
    return parsePlannerSnapshot(JSON.stringify(value));
  },
  /application month/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({
        ...baseSnapshot(),
        version: 4,
        confirmedMilestoneDates: {
          agreement: "2028-01-01",
          keys: "2027-01-01",
        },
      })
    ),
  /chronology/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({ ...baseSnapshot(), version: 4, yearFilter: "garbage" })
    ),
  /year filter/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({
        ...baseSnapshot(),
        version: 4,
        selectedBtoProjectId: "   ",
      })
    ),
  /selected project id/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({
        ...baseSnapshot(),
        version: 4,
        savedAt: "2026-02-31T10:00:00.000Z",
      })
    ),
  /saved timestamp/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({
        ...baseSnapshot(),
        version: 4,
        applicationMonth: "2024-09",
      })
    ),
  /application month/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({
        ...baseSnapshot(),
        version: 4,
        completedMilestones: ["unknown-stage"],
      })
    ),
  /completed milestones/
);
assert.throws(
  () =>
    parsePlannerSnapshot(
      JSON.stringify({
        ...baseSnapshot(),
        version: 4,
        paymentOverrides: {
          agreement: { total: 100, cpf: 90, cash: 5 },
        },
      })
    ),
  /payment overrides/
);

const stamped = createPlannerSnapshot({
  ...baseSnapshot(),
  version: 999,
  savedAt: "invalid",
});
assert.equal(stamped.version, 4);
assert.notEqual(stamped.savedAt, "invalid");
assert.deepEqual(parsePlannerSnapshot(JSON.stringify(stamped)), stamped);
assert.throws(
  () =>
    savePlannerSnapshot({
      ...baseSnapshot(),
      version: 4,
      paymentOverrides: {
        agreement: { total: Number.POSITIVE_INFINITY, cpf: 0, cash: 0 },
      },
    }),
  /payment overrides/
);

console.log("Plan storage checks passed.");

function baseSnapshot() {
  return {
    savedAt: "2026-07-12T10:00:00.000Z",
    combinedIncome: 6000,
    flatPrice: 500000,
    flatType: "4-room",
    financing: "hdb",
    scheme: "normal",
    loanTenureYears: 25,
    loanInterestRate: 2.6,
    yearFilter: "latest",
    townQuery: "",
    btoScoreMode: "buyer-fit",
    btoScorePreset: "balanced",
    btoScoreWeights: {
      affordability: 30,
      commute: 25,
      centrality: 15,
      wait: 15,
      supply: 15,
    },
    selectedBtoProjectId: null,
    applicationMonth: "2026-08",
    completedMilestones: [],
    confirmedMilestoneDates: {},
    paymentOverrides: {},
    availableCash: null,
    availableCpfOa: null,
    monthlyDebtPayments: null,
    monthlyPropertyLoanPayments: null,
    bankThereafterRate: null,
    ageForLoanRules: null,
    outstandingHousingLoans: null,
    ehgMode: "unassessed",
    ehgAssessedIncome: null,
    ehgConfirmedAmount: null,
    ehgFamilyEligibilityConfirmed: false,
  };
}
