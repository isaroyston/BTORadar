import {
  calculateBuyerStampDuty,
  calculateDeedOfAssignmentStampDuty,
} from "./fees";

export type FinancingEstimateMode = "hdb" | "bank" | "none";

export type FinancingEstimateInput = {
  financing: FinancingEstimateMode;
  purchasePrice: number;
  grossMonthlyIncome: number;
  availableCash: number | null;
  availableCpfOa: number | null;
  grantAmount: number | null;
  monthlyDebtPayments: number | null;
  monthlyPropertyLoanPayments: number | null;
  bankThereafterRatePercent: number | null;
  cashOnlyPurchaseAmount: number;
  fixedAdditionalCosts: number;
  cashOnlyCosts: number;
  ageForLoanRules: number | null;
  outstandingHousingLoans: 0 | 1 | 2 | null;
  requestedTenureYears: number;
  repaymentRatePercent: number;
};

export type FinancingEstimate = {
  completeness: "complete" | "incomplete";
  missingInputs: string[];
  warnings: string[];
  availableFunds: number | null;
  usableGrantAmount: number | null;
  assessmentRatePercent: number | null;
  effectiveTenureYears: number | null;
  ltvLimit: number | null;
  minimumCashRate: number | null;
  msrMonthlyLimit: number | null;
  tdsrMonthlyLimit: number | null;
  monthlyPaymentLimit: number | null;
  serviceabilityLoanLimit: number | null;
  ltvLoanLimit: number | null;
  estimatedLoanLimit: number | null;
  loanForTarget: number | null;
  estimatedMonthlyPayment: number | null;
  maxPurchasePrice: number | null;
  totalResourceShortfall: number | null;
  cashOnlyCostShortfall: number | null;
  grantOwnFundsShortfall: number | null;
  minimumCashShortfall: number | null;
  fundingGap: number | null;
  deedOfAssignmentStampDuty: number | null;
};

const HDB_MSR_LIMIT = 0.3;
const BANK_TDSR_LIMIT = 0.55;
const HDB_ASSESSMENT_RATE_FLOOR = 3;
const BANK_ASSESSMENT_RATE_FLOOR = 4;
const CURRENT_HDB_CONCESSIONARY_RATE = 2.6;

export function calculateFinancingEstimate(
  input: FinancingEstimateInput
): FinancingEstimate {
  const missingInputs = getMissingInputs(input);
  const warnings = getWarnings(input);
  const usableGrantAmount =
    input.grantAmount === null
      ? null
      : Math.min(input.grantAmount, input.purchasePrice * 0.95);

  if (input.financing === "none") {
    const target = calculateTargetFunding({
      input,
      purchasePrice: input.purchasePrice,
      estimatedLoanLimit: 0,
    });
    const totalResourceShortfall =
      target.availableFunds === null
        ? null
        : Math.max(input.purchasePrice - target.availableFunds, 0);
    const fundingGap = maxKnown(
      maxKnown(totalResourceShortfall, target.minimumCashShortfall),
      target.grantOwnFundsShortfall
    );
    const maxPurchasePrice = calculateMaxPurchasePrice({
      input,
      serviceabilityLoanLimit: 0,
      ltvLimit: 0,
      minimumCashRate: 0,
    });
    const isComplete = missingInputs.length === 0;

    return {
      completeness: isComplete ? "complete" : "incomplete",
      missingInputs,
      warnings,
      availableFunds: target.availableFunds,
      usableGrantAmount,
      assessmentRatePercent: null,
      effectiveTenureYears: null,
      ltvLimit: 0,
      minimumCashRate: 0,
      msrMonthlyLimit: null,
      tdsrMonthlyLimit: null,
      monthlyPaymentLimit: null,
      serviceabilityLoanLimit: 0,
      ltvLoanLimit: 0,
      estimatedLoanLimit: 0,
      loanForTarget: 0,
      estimatedMonthlyPayment: 0,
      maxPurchasePrice: isComplete ? maxPurchasePrice : null,
      totalResourceShortfall,
      cashOnlyCostShortfall: target.cashOnlyCostShortfall,
      grantOwnFundsShortfall: target.grantOwnFundsShortfall,
      minimumCashShortfall: target.minimumCashShortfall,
      fundingGap: isComplete ? fundingGap : null,
      deedOfAssignmentStampDuty: 0,
    };
  }

  const age = input.ageForLoanRules;
  const effectiveTenureYears = getEffectiveTenureYears(
    input.financing,
    input.requestedTenureYears,
    age
  );
  const assessmentRatePercent =
    input.financing === "bank"
      ? input.bankThereafterRatePercent === null
        ? null
        : Math.max(
            BANK_ASSESSMENT_RATE_FLOOR,
            input.bankThereafterRatePercent
          )
      : Math.max(
          HDB_ASSESSMENT_RATE_FLOOR,
          CURRENT_HDB_CONCESSIONARY_RATE
        );
  const msrMonthlyLimit =
    input.financing === "bank"
      ? input.monthlyPropertyLoanPayments === null
        ? null
        : Math.max(
            input.grossMonthlyIncome * HDB_MSR_LIMIT -
              input.monthlyPropertyLoanPayments,
            0
          )
      : Math.max(input.grossMonthlyIncome * HDB_MSR_LIMIT, 0);
  const tdsrMonthlyLimit =
    input.financing === "bank" && input.monthlyDebtPayments !== null
      ? Math.max(
          input.grossMonthlyIncome * BANK_TDSR_LIMIT -
            Math.max(
              input.monthlyDebtPayments,
              input.monthlyPropertyLoanPayments ?? 0
            ),
          0
        )
      : null;
  const monthlyPaymentLimit =
    input.financing === "bank"
      ? tdsrMonthlyLimit === null
        || msrMonthlyLimit === null
        ? null
        : Math.min(msrMonthlyLimit, tdsrMonthlyLimit)
      : msrMonthlyLimit;
  const serviceabilityLoanLimit =
    monthlyPaymentLimit === null ||
    effectiveTenureYears === null ||
    assessmentRatePercent === null
      ? null
      : principalFromMonthlyPayment(
          monthlyPaymentLimit,
          assessmentRatePercent,
          effectiveTenureYears
        );
  const ltv = getLtvDetails(input, effectiveTenureYears);
  const ltvLoanLimit =
    ltv.limit === null ? null : input.purchasePrice * ltv.limit;
  const estimatedLoanLimit = minKnown(
    serviceabilityLoanLimit,
    ltvLoanLimit
  );
  const target = calculateTargetFunding({
    input,
    purchasePrice: input.purchasePrice,
    estimatedLoanLimit,
  });
  const loanForTarget = target.loanForTarget;
  const totalResourceShortfall =
    target.availableFunds === null || estimatedLoanLimit === null
      ? null
      : Math.max(
          input.purchasePrice - target.availableFunds - estimatedLoanLimit,
          0
        );
  const fundingGap = maxKnown(
    maxKnown(totalResourceShortfall, target.minimumCashShortfall),
    target.grantOwnFundsShortfall
  );
  const maxPurchasePrice = calculateMaxPurchasePrice({
    input,
    serviceabilityLoanLimit,
    ltvLimit: ltv.limit,
    minimumCashRate: ltv.minimumCashRate,
  });
  const estimatedMonthlyPayment =
    loanForTarget === null || effectiveTenureYears === null
      ? null
      : monthlyPaymentFromPrincipal(
          loanForTarget,
          input.repaymentRatePercent,
          effectiveTenureYears
        );
  const isComplete = missingInputs.length === 0;

  return {
    completeness: isComplete ? "complete" : "incomplete",
    missingInputs,
    warnings,
    availableFunds: target.availableFunds,
    usableGrantAmount,
    assessmentRatePercent,
    effectiveTenureYears,
    ltvLimit: ltv.limit,
    minimumCashRate: ltv.minimumCashRate,
    msrMonthlyLimit,
    tdsrMonthlyLimit,
    monthlyPaymentLimit,
    serviceabilityLoanLimit,
    ltvLoanLimit,
    estimatedLoanLimit: isComplete ? estimatedLoanLimit : null,
    loanForTarget: isComplete ? loanForTarget : null,
    estimatedMonthlyPayment: isComplete ? estimatedMonthlyPayment : null,
    maxPurchasePrice: isComplete ? maxPurchasePrice : null,
    totalResourceShortfall,
    cashOnlyCostShortfall: target.cashOnlyCostShortfall,
    grantOwnFundsShortfall: target.grantOwnFundsShortfall,
    minimumCashShortfall: target.minimumCashShortfall,
    fundingGap: isComplete ? fundingGap : null,
    deedOfAssignmentStampDuty: isComplete
      ? target.deedOfAssignmentStampDuty
      : null,
  };
}

export function principalFromMonthlyPayment(
  monthlyPayment: number,
  annualRatePercent: number,
  tenureYears: number
) {
  if (monthlyPayment <= 0 || tenureYears <= 0) return 0;

  const months = tenureYears * 12;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate <= 0) return monthlyPayment * months;

  return (
    (monthlyPayment * (1 - Math.pow(1 + monthlyRate, -months))) /
    monthlyRate
  );
}

export function monthlyPaymentFromPrincipal(
  principal: number,
  annualRatePercent: number,
  tenureYears: number
) {
  if (principal <= 0 || tenureYears <= 0) return 0;

  const months = tenureYears * 12;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate <= 0) return principal / months;

  return (
    (principal * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -months))
  );
}

function getMissingInputs(input: FinancingEstimateInput) {
  const missing: string[] = [];

  if (input.availableCash === null) missing.push("cash available for purchase");
  if (input.availableCpfOa === null) missing.push("CPF OA available for purchase");
  if (input.grantAmount === null) missing.push("EHG amount or no-grant selection");

  if (input.financing !== "none" && input.ageForLoanRules === null) {
    missing.push("age used for loan rules");
  }

  if (input.financing === "bank") {
    if (input.monthlyDebtPayments === null) {
      missing.push("existing monthly debt payments");
    }
    if (input.monthlyPropertyLoanPayments === null) {
      missing.push("existing monthly property-loan payments");
    }
    if (input.bankThereafterRatePercent === null) {
      missing.push("bank thereafter rate");
    }
    if (
      input.monthlyDebtPayments !== null &&
      input.monthlyPropertyLoanPayments !== null &&
      input.monthlyPropertyLoanPayments > input.monthlyDebtPayments
    ) {
      missing.push(
        "all debt payments must include the property-loan payments"
      );
    }
    if (input.outstandingHousingLoans === null) {
      missing.push("outstanding housing loans");
    }
  }

  return missing;
}

function getWarnings(input: FinancingEstimateInput) {
  const warnings: string[] = [];

  warnings.push(
    "Flat/HFE eligibility by household type is not assessed (for example, standard family, extended-family and single income ceilings differ)."
  );
  if (input.grossMonthlyIncome > 14000) {
    warnings.push(
      "The standard family HDB income ceiling is exceeded. The financing result is conditional because an eligible extended-family or other household profile must be confirmed through HFE."
    );
  }

  if (input.financing === "hdb") {
    warnings.push("HFE credit assessment remains authoritative.");
    warnings.push(
      "Assumes a new 99-year BTO and a first/concessionary HDB loan; short or reduced leases, second-loan CPF refunds, and disposal proceeds are not assessed."
    );
  }
  if (input.financing === "bank") {
    warnings.push("A bank IPA and package thereafter rate remain authoritative.");
  }

  return warnings;
}

function getEffectiveTenureYears(
  financing: Exclude<FinancingEstimateMode, "none">,
  requestedTenureYears: number,
  ageForLoanRules: number | null
) {
  if (ageForLoanRules === null) return null;

  const providerMaximum = financing === "hdb" ? 25 : 30;
  const ageMaximum = Math.max(65 - ageForLoanRules, 0);

  if (financing === "hdb") {
    return Math.max(
      Math.min(requestedTenureYears, providerMaximum, ageMaximum),
      0
    );
  }

  return Math.max(Math.min(requestedTenureYears, providerMaximum), 0);
}

function getLtvDetails(
  input: FinancingEstimateInput,
  effectiveTenureYears: number | null
) {
  if (input.financing === "hdb") {
    return { limit: 0.75, minimumCashRate: 0 };
  }
  if (input.financing === "none") {
    return { limit: 0, minimumCashRate: 0 };
  }
  if (
    input.outstandingHousingLoans === null ||
    input.ageForLoanRules === null ||
    effectiveTenureYears === null
  ) {
    return { limit: null, minimumCashRate: null };
  }

  const lowerTier =
    input.requestedTenureYears > 25 ||
    input.ageForLoanRules + input.requestedTenureYears > 65;
  const tier = Math.min(input.outstandingHousingLoans, 2);

  if (tier === 0) {
    return lowerTier
      ? { limit: 0.55, minimumCashRate: 0.1 }
      : { limit: 0.75, minimumCashRate: 0.05 };
  }
  if (tier === 1) {
    return lowerTier
      ? { limit: 0.25, minimumCashRate: 0.25 }
      : { limit: 0.45, minimumCashRate: 0.25 };
  }

  return lowerTier
    ? { limit: 0.15, minimumCashRate: 0.25 }
    : { limit: 0.35, minimumCashRate: 0.25 };
}

type TargetFunding = {
  availableFunds: number | null;
  availableOwnFunds: number | null;
  loanForTarget: number | null;
  cashOnlyCostShortfall: number | null;
  minimumCashShortfall: number | null;
  grantOwnFundsShortfall: number | null;
  deedOfAssignmentStampDuty: number | null;
};

function calculateTargetFunding({
  input,
  purchasePrice,
  estimatedLoanLimit,
}: {
  input: FinancingEstimateInput;
  purchasePrice: number;
  estimatedLoanLimit: number | null;
}): TargetFunding {
  let deedOfAssignmentStampDuty = 0;
  let loanForTarget: number | null;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const funds = calculateFundsAfterCosts({
      input,
      purchasePrice,
      deedOfAssignmentStampDuty,
    });
    const usableGrant =
      input.grantAmount === null
        ? null
        : Math.min(Math.max(input.grantAmount, 0), purchasePrice * 0.95);
    const availableOwnFunds = sumKnownFunds(
      funds.availableCashForPurchase,
      funds.availableCpfForPurchase
    );
    const availableFunds = sumKnownFunds(availableOwnFunds, usableGrant);
    const grantOwnFundsShortfall = calculateGrantOwnFundsShortfall(
      input.grantAmount,
      purchasePrice,
      availableOwnFunds
    );
    const rawLoanNeeded =
      availableFunds === null
        ? null
        : Math.max(purchasePrice - availableFunds, 0);
    const loanNeeded =
      rawLoanNeeded === null || grantOwnFundsShortfall === null
        ? null
        : Math.max(rawLoanNeeded - grantOwnFundsShortfall, 0);
    loanForTarget = minKnown(estimatedLoanLimit, loanNeeded);

    if (input.financing !== "hdb") {
      deedOfAssignmentStampDuty = 0;
      break;
    }
    if (loanForTarget === null) {
      return {
        availableFunds,
        availableOwnFunds,
        loanForTarget,
        cashOnlyCostShortfall: calculateCashOnlyCostShortfall(
          input,
          funds.cashRequiredForCosts
        ),
        minimumCashShortfall: null,
        grantOwnFundsShortfall,
        deedOfAssignmentStampDuty: null,
      };
    }

    const nextDuty = calculateDeedOfAssignmentStampDuty(loanForTarget);
    if (nextDuty === deedOfAssignmentStampDuty) break;
    deedOfAssignmentStampDuty = nextDuty;
  }

  const funds = calculateFundsAfterCosts({
    input,
    purchasePrice,
    deedOfAssignmentStampDuty,
  });
  const usableGrant =
    input.grantAmount === null
      ? null
      : Math.min(Math.max(input.grantAmount, 0), purchasePrice * 0.95);
  const availableOwnFunds = sumKnownFunds(
    funds.availableCashForPurchase,
    funds.availableCpfForPurchase
  );
  const availableFunds = sumKnownFunds(availableOwnFunds, usableGrant);
  const grantOwnFundsShortfall = calculateGrantOwnFundsShortfall(
    input.grantAmount,
    purchasePrice,
    availableOwnFunds
  );
  const rawLoanNeeded =
    availableFunds === null
      ? null
      : Math.max(purchasePrice - availableFunds, 0);
  const loanNeeded =
    rawLoanNeeded === null || grantOwnFundsShortfall === null
      ? null
      : Math.max(rawLoanNeeded - grantOwnFundsShortfall, 0);
  loanForTarget = minKnown(estimatedLoanLimit, loanNeeded);

  return {
    availableFunds,
    availableOwnFunds,
    loanForTarget,
    cashOnlyCostShortfall: calculateCashOnlyCostShortfall(
      input,
      funds.cashRequiredForCosts
    ),
    minimumCashShortfall:
      input.availableCash === null ||
      funds.cashRequiredForCosts === null ||
      input.financing === "bank" && estimatedLoanLimit === null
        ? null
        : Math.max(
            funds.cashRequiredForCosts +
              Math.max(
                purchasePrice * getMinimumCashRateForTarget(input),
                input.cashOnlyPurchaseAmount
              ) -
              input.availableCash,
            0
          ),
    grantOwnFundsShortfall,
    deedOfAssignmentStampDuty,
  };
}

function calculateFundsAfterCosts({
  input,
  purchasePrice,
  deedOfAssignmentStampDuty,
}: {
  input: FinancingEstimateInput;
  purchasePrice: number;
  deedOfAssignmentStampDuty: number;
}) {
  const fixedAdditionalCosts = Math.max(
    input.fixedAdditionalCosts,
    input.cashOnlyCosts,
    0
  );
  const totalAdditionalCosts =
    fixedAdditionalCosts +
    calculateBuyerStampDuty(purchasePrice) +
    Math.max(deedOfAssignmentStampDuty, 0);
  const flexibleAdditionalCosts = Math.max(
    totalAdditionalCosts - input.cashOnlyCosts,
    0
  );
  const flexibleCostsRequiringCash =
    input.availableCpfOa === null
      ? null
      : Math.max(flexibleAdditionalCosts - input.availableCpfOa, 0);
  const cashRequiredForCosts =
    flexibleCostsRequiringCash === null
      ? null
      : input.cashOnlyCosts + flexibleCostsRequiringCash;
  const availableCashForPurchase =
    input.availableCash === null || cashRequiredForCosts === null
      ? null
      : Math.max(input.availableCash - cashRequiredForCosts, 0);
  const availableCpfForPurchase =
    input.availableCpfOa === null
      ? null
      : Math.max(input.availableCpfOa - flexibleAdditionalCosts, 0);

  return {
    availableCashForPurchase,
    availableCpfForPurchase,
    cashRequiredForCosts,
  };
}

function calculateCashOnlyCostShortfall(
  input: FinancingEstimateInput,
  cashRequiredForCosts: number | null
) {
  if (input.availableCash === null || cashRequiredForCosts === null) return null;

  return Math.max(
    cashRequiredForCosts +
      input.cashOnlyPurchaseAmount -
      input.availableCash,
    0
  );
}

function calculateGrantOwnFundsShortfall(
  grantAmount: number | null,
  purchasePrice: number,
  availableOwnFunds: number | null
) {
  if (grantAmount === null || availableOwnFunds === null) return null;

  return grantAmount > purchasePrice * 0.95
    ? Math.max(purchasePrice * 0.05 - availableOwnFunds, 0)
    : 0;
}

function getMinimumCashRateForTarget(input: FinancingEstimateInput) {
  if (input.financing !== "bank") return 0;
  const tenure = getEffectiveTenureYears(
    "bank",
    input.requestedTenureYears,
    input.ageForLoanRules
  );
  return getLtvDetails(input, tenure).minimumCashRate ?? 0;
}

function calculateMaxPurchasePrice({
  input,
  serviceabilityLoanLimit,
  ltvLimit,
  minimumCashRate,
}: {
  input: FinancingEstimateInput;
  serviceabilityLoanLimit: number | null;
  ltvLimit: number | null;
  minimumCashRate: number | null;
}) {
  if (
    input.availableCash === null ||
    input.availableCpfOa === null ||
    input.grantAmount === null ||
    serviceabilityLoanLimit === null ||
    ltvLimit === null ||
    minimumCashRate === null
  ) {
    return null;
  }

  const upperBound = Math.max(
    input.availableCash +
      input.availableCpfOa +
      Math.max(input.grantAmount, 0) +
      Math.max(serviceabilityLoanLimit, 0),
    0
  );
  const isFeasible = (candidate: number) => {
    const candidateLoanLimit = Math.min(
      Math.max(serviceabilityLoanLimit, 0),
      candidate * Math.max(ltvLimit, 0)
    );
    const target = calculateTargetFunding({
      input,
      purchasePrice: candidate,
      estimatedLoanLimit: candidateLoanLimit,
    });
    const hasResources =
      target.availableFunds !== null &&
      target.loanForTarget !== null &&
      target.availableFunds + target.loanForTarget >= candidate - 0.01;
    const funds = calculateFundsAfterCosts({
      input,
      purchasePrice: candidate,
      deedOfAssignmentStampDuty:
        target.deedOfAssignmentStampDuty ?? 0,
    });
    const meetsCashFloor =
      funds.cashRequiredForCosts !== null &&
      input.availableCash !== null &&
      input.availableCash >=
        funds.cashRequiredForCosts +
          Math.max(
            candidate * minimumCashRate,
            input.cashOnlyPurchaseAmount
          ) -
          0.01;

    return (
      hasResources &&
      meetsCashFloor &&
      target.grantOwnFundsShortfall === 0
    );
  };

  const grantThreshold = Math.max(input.grantAmount, 0) / 0.95;
  const intervals: Array<[number, number]> =
    grantThreshold > 0 && grantThreshold < upperBound
      ? [
          [0, Math.max(grantThreshold - 0.01, 0)],
          [grantThreshold, upperBound],
        ]
      : [[0, upperBound]];
  let best = 0;

  for (const [start, end] of intervals) {
    if (end < start || !isFeasible(start)) continue;
    if (isFeasible(end)) {
      best = Math.max(best, end);
      continue;
    }

    let lower = start;
    let upper = end;
    for (let iteration = 0; iteration < 80; iteration += 1) {
      const candidate = (lower + upper) / 2;
      if (isFeasible(candidate)) lower = candidate;
      else upper = candidate;
    }
    best = Math.max(best, lower);
  }

  return Math.max(best, 0);
}

function sumKnownFunds(...values: Array<number | null>) {
  if (values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function minKnown(left: number | null, right: number | null) {
  if (left === null || right === null) return null;
  return Math.min(left, right);
}

function maxKnown(left: number | null, right: number | null) {
  if (left === null || right === null) return null;
  return Math.max(left, right);
}
