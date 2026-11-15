import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const {
  calculateFinancingEstimate,
  monthlyPaymentFromPrincipal,
  principalFromMonthlyPayment,
} = await import("../../frontend/src/utils/affordability.ts");

const hdb = calculateFinancingEstimate({
  financing: "hdb",
  purchasePrice: 500000,
  grossMonthlyIncome: 6000,
  availableCash: 50000,
  availableCpfOa: 50000,
  grantAmount: 0,
  monthlyDebtPayments: null,
  monthlyPropertyLoanPayments: null,
  bankThereafterRatePercent: null,
  cashOnlyPurchaseAmount: 0,
  fixedAdditionalCosts: 0,
  cashOnlyCosts: 0,
  ageForLoanRules: 30,
  outstandingHousingLoans: null,
  requestedTenureYears: 25,
  repaymentRatePercent: 2.6,
});

assert.equal(hdb.completeness, "complete");
assert.equal(hdb.msrMonthlyLimit, 1800);
assert.equal(hdb.assessmentRatePercent, 3);
assert.equal(hdb.ltvLimit, 0.75);
assert.equal(Math.round(hdb.estimatedLoanLimit ?? 0), 375000);
assert.equal(Math.round(hdb.maxPurchasePrice ?? 0), 374644);
assert.equal(Math.round(hdb.fundingGap ?? 0), 35100);
assert.equal(hdb.deedOfAssignmentStampDuty, 500);

const hdbStressRate = calculateFinancingEstimate({
  ...hdbInput(),
  repaymentRatePercent: 5,
});
assert.equal(hdbStressRate.assessmentRatePercent, 3);

const bank = calculateFinancingEstimate({
  financing: "bank",
  purchasePrice: 500000,
  grossMonthlyIncome: 6000,
  availableCash: 50000,
  availableCpfOa: 50000,
  grantAmount: 0,
  monthlyDebtPayments: 2000,
  monthlyPropertyLoanPayments: 0,
  bankThereafterRatePercent: 3,
  cashOnlyPurchaseAmount: 0,
  fixedAdditionalCosts: 0,
  cashOnlyCosts: 0,
  ageForLoanRules: 30,
  outstandingHousingLoans: 0,
  requestedTenureYears: 25,
  repaymentRatePercent: 3,
});

assert.equal(bank.completeness, "complete");
assert.equal(bank.msrMonthlyLimit, 1800);
assert.equal(Math.round(bank.tdsrMonthlyLimit ?? 0), 1300);
assert.equal(Math.round(bank.monthlyPaymentLimit ?? 0), 1300);
assert.equal(bank.assessmentRatePercent, 4);
assert.ok((bank.serviceabilityLoanLimit ?? 0) > 240000);
assert.ok((bank.serviceabilityLoanLimit ?? 0) < 250000);

const bankWithPropertyDebt = calculateFinancingEstimate({
  ...bankInput(),
  monthlyDebtPayments: 1000,
  monthlyPropertyLoanPayments: 800,
});
assert.equal(bankWithPropertyDebt.msrMonthlyLimit, 1000);
assert.equal(Math.round(bankWithPropertyDebt.tdsrMonthlyLimit ?? 0), 2300);
assert.equal(bankWithPropertyDebt.monthlyPaymentLimit, 1000);

const inconsistentDebt = calculateFinancingEstimate({
  ...bankInput(),
  monthlyDebtPayments: 500,
  monthlyPropertyLoanPayments: 800,
});
assert.equal(inconsistentDebt.completeness, "incomplete");
assert.equal(Math.round(inconsistentDebt.tdsrMonthlyLimit ?? 0), 2500);

const lowerLtvBank = calculateFinancingEstimate({
  ...bankInput(),
  requestedTenureYears: 30,
});
assert.equal(lowerLtvBank.ltvLimit, 0.55);
assert.equal(lowerLtvBank.minimumCashRate, 0.1);

const noLoan = calculateFinancingEstimate({
  ...bankInput(),
  financing: "none",
  availableCash: 100000,
  availableCpfOa: 120000,
  grantAmount: 50000,
});
assert.equal(noLoan.estimatedLoanLimit, 0);
assert.equal(Math.round(noLoan.maxPurchasePrice ?? 0), 266471);
assert.equal(noLoan.fundingGap, 239600);

const lowTargetBudget = calculateFinancingEstimate({
  ...bankInput(),
  financing: "none",
  purchasePrice: 100000,
  grossMonthlyIncome: 15000,
  availableCash: 300000,
  availableCpfOa: 300000,
  grantAmount: 0,
});
const highTargetBudget = calculateFinancingEstimate({
  ...lowTargetBudgetInput(),
  purchasePrice: 1000000,
});
assert.equal(lowTargetBudget.completeness, "complete");
assert.ok(lowTargetBudget.maxPurchasePrice !== null);
assert.ok(
  Math.abs(
    (lowTargetBudget.maxPurchasePrice ?? 0) -
      (highTargetBudget.maxPurchasePrice ?? 0)
  ) < 0.01
);

const hdbLowTarget = calculateFinancingEstimate({
  ...hdbInput(),
  purchasePrice: 300000,
  availableCash: 50000,
  availableCpfOa: 100000,
  grantAmount: 40000,
});
const hdbHighTarget = calculateFinancingEstimate({
  ...hdbInput(),
  purchasePrice: 800000,
  availableCash: 50000,
  availableCpfOa: 100000,
  grantAmount: 40000,
});
assert.ok(
  Math.abs(
    (hdbLowTarget.maxPurchasePrice ?? 0) -
      (hdbHighTarget.maxPurchasePrice ?? 0)
  ) < 0.01
);

const smallOptionBudget = calculateFinancingEstimate({
  ...lowTargetBudgetInput(),
  availableCash: 1000,
  availableCpfOa: 100000,
  cashOnlyPurchaseAmount: 500,
});
const largeOptionBudget = calculateFinancingEstimate({
  ...lowTargetBudgetInput(),
  availableCash: 1000,
  availableCpfOa: 100000,
  cashOnlyPurchaseAmount: 2000,
});
assert.ok((smallOptionBudget.maxPurchasePrice ?? 0) > 0);
assert.equal(largeOptionBudget.maxPurchasePrice, 0);

const incompleteNoLoan = calculateFinancingEstimate({
  ...lowTargetBudgetInput(),
  availableCash: null,
});
assert.equal(incompleteNoLoan.completeness, "incomplete");
assert.equal(incompleteNoLoan.maxPurchasePrice, null);
assert.equal(incompleteNoLoan.fundingGap, null);

const ageCappedHdb = calculateFinancingEstimate({
  ...bankInput(),
  financing: "hdb",
  ageForLoanRules: 45,
});
assert.equal(ageCappedHdb.effectiveTenureYears, 20);

const zeroRatePayment = monthlyPaymentFromPrincipal(120000, 0, 10);
assert.equal(zeroRatePayment, 1000);
assert.equal(principalFromMonthlyPayment(zeroRatePayment, 0, 10), 120000);

const incompleteBank = calculateFinancingEstimate({
  ...bankInput(),
  monthlyDebtPayments: null,
});
assert.equal(incompleteBank.completeness, "incomplete");
assert.equal(incompleteBank.estimatedLoanLimit, null);
assert.equal(incompleteBank.maxPurchasePrice, null);

const cashOnlyFeeGap = calculateFinancingEstimate({
  ...bankInput(),
  financing: "hdb",
  availableCash: 1000,
  availableCpfOa: 135100,
  grantAmount: 0,
  fixedAdditionalCosts: 2000,
  cashOnlyCosts: 2000,
  cashOnlyPurchaseAmount: 0,
});
assert.equal(cashOnlyFeeGap.cashOnlyCostShortfall, 1000);
assert.equal(cashOnlyFeeGap.fundingGap, 1000);
assert.equal(cashOnlyFeeGap.maxPurchasePrice, 0);

const cpfFundedFees = calculateFinancingEstimate({
  ...bankInput(),
  financing: "hdb",
  availableCash: 0,
  availableCpfOa: 137100,
  grantAmount: 0,
  fixedAdditionalCosts: 2000,
  cashOnlyCosts: 0,
});
assert.equal(cpfFundedFees.cashOnlyCostShortfall, 0);
assert.equal(cpfFundedFees.fundingGap, 0);
assert.equal(Math.round(cpfFundedFees.maxPurchasePrice ?? 0), 500000);

const optionCashGap = calculateFinancingEstimate({
  ...bankInput(),
  financing: "hdb",
  availableCash: 1000,
  availableCpfOa: 135100,
  grantAmount: 0,
  cashOnlyPurchaseAmount: 2000,
});
assert.equal(optionCashGap.minimumCashShortfall, 1000);
assert.equal(optionCashGap.fundingGap, 1000);
assert.equal(optionCashGap.maxPurchasePrice, 0);

const cappedGrant = calculateFinancingEstimate({
  ...bankInput(),
  financing: "none",
  purchasePrice: 100000,
  availableCash: 6000,
  availableCpfOa: 0,
  grantAmount: 120000,
});
assert.equal(cappedGrant.usableGrantAmount, 95000);
assert.equal(cappedGrant.grantOwnFundsShortfall, 0);
assert.equal(cappedGrant.fundingGap, 0);
assert.equal(Math.round(cappedGrant.maxPurchasePrice ?? 0), 100000);

const missingOwnGrantFunds = calculateFinancingEstimate({
  ...bankInput(),
  financing: "none",
  purchasePrice: 100000,
  availableCash: 0,
  availableCpfOa: 0,
  grantAmount: 120000,
});
assert.equal(missingOwnGrantFunds.grantOwnFundsShortfall, 5000);
assert.equal(missingOwnGrantFunds.fundingGap, 5000);
assert.equal(missingOwnGrantFunds.maxPurchasePrice, 0);

console.log("Affordability checks passed.");

function bankInput() {
  return {
    financing: "bank",
    purchasePrice: 500000,
    grossMonthlyIncome: 6000,
    availableCash: 50000,
    availableCpfOa: 50000,
    grantAmount: 0,
    monthlyDebtPayments: 0,
    monthlyPropertyLoanPayments: 0,
    bankThereafterRatePercent: 3,
    cashOnlyPurchaseAmount: 0,
    fixedAdditionalCosts: 0,
    cashOnlyCosts: 0,
    ageForLoanRules: 30,
    outstandingHousingLoans: 0,
    requestedTenureYears: 25,
    repaymentRatePercent: 3,
  };
}

function hdbInput() {
  return {
    ...bankInput(),
    financing: "hdb",
    monthlyDebtPayments: null,
    monthlyPropertyLoanPayments: null,
    bankThereafterRatePercent: null,
    outstandingHousingLoans: null,
    repaymentRatePercent: 2.6,
  };
}

function lowTargetBudgetInput() {
  return {
    ...bankInput(),
    financing: "none",
    purchasePrice: 100000,
    grossMonthlyIncome: 15000,
    availableCash: 300000,
    availableCpfOa: 300000,
    grantAmount: 0,
  };
}
