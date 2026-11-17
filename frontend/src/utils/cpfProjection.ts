import { POLICY_CONFIG } from "../policies/policyConfig";
import { calculateFinancingEstimate, type FinancingEstimate, type FinancingEstimateInput } from "./affordability";
import { calculateBuyerStampDuty } from "./fees";

// Most BTO buyers pay the downpayment years after booking, mostly from CPF that keeps
// building up while the flat is built. This module projects that balance to each payment
// date and works out the price ceiling and each payment's funding from it.

const BANDS = POLICY_CONFIG.cpf.bands;

export function oaRateForAge(age: number) {
  const band = BANDS.find((entry) => age <= entry.maxAge) ?? BANDS[BANDS.length - 1];
  return band.totalRate * band.oaShare;
}

/** Ordinary Account contributions a month for the household, from gross monthly income. */
export function estimateMonthlyOa(combinedIncome: number, age: number, earners: number = POLICY_CONFIG.cpf.earners) {
  const { ordinaryWageCeilingPerEarner } = POLICY_CONFIG.cpf;
  const wages = Math.min(Math.max(combinedIncome, 0), ordinaryWageCeilingPerEarner * earners);
  return Math.round(wages * oaRateForAge(age));
}

/**
 * OA balance after `months` of contributions. When `monthlyOverride` is null the rate follows
 * the buyer's age band as they get older; an override (from a CPF statement) stays flat.
 */
export function projectOa({
  cpfToday,
  combinedIncome,
  age,
  monthlyOverride,
  months,
  earners,
}: {
  cpfToday: number;
  combinedIncome: number;
  age: number;
  monthlyOverride: number | null;
  months: number;
  /** Two for a couple, one for a single buyer: each earner has their own wage ceiling. */
  earners?: number;
}) {
  const span = Math.max(Math.floor(months), 0);
  if (monthlyOverride !== null) return cpfToday + monthlyOverride * span;
  let total = cpfToday;
  for (let month = 0; month < span; month += 1) {
    total += estimateMonthlyOa(combinedIncome, age + month / 12, earners);
  }
  return Math.round(total);
}

export function monthsBetween(from: Date, to: Date) {
  return Math.max((to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()), 0);
}

export type PurchaseTiming = { monthsToSigning: number; monthsToKeys: number };

/** Months from today to signing and keys for a launch, using its keys date when known. */
export function timingForLaunch({
  today,
  applicationMonth,
  expectedKeys,
}: {
  today: Date;
  applicationMonth: Date;
  expectedKeys: Date | null;
}): PurchaseTiming {
  const offsets = POLICY_CONFIG.defaultOffsets;
  const booking = new Date(
    applicationMonth.getFullYear(),
    applicationMonth.getMonth() + offsets.ballotAfterMonths + Math.round(offsets.bookingAfterBallotWeeks / 4),
    1,
  );
  const signing = new Date(booking.getFullYear(), booking.getMonth() + offsets.agreementAfterBookingMonths, 1);
  const keys = expectedKeys ?? new Date(booking.getFullYear(), booking.getMonth() + offsets.keyAfterBookingMonths, 1);
  return { monthsToSigning: monthsBetween(today, signing), monthsToKeys: monthsBetween(today, keys) };
}

export type CeilingResult = {
  price: number;
  limitedBy: "loan" | "keys" | "signing";
  estimate: FinancingEstimate;
  oaAtSigning: number;
  oaAtKeys: number;
};

/**
 * Highest price where every payment can be met when it falls due:
 * - by keys: loan + grant + CPF built up by then + cash covers the price and costs;
 * - at signing: grant (credited before signing) + CPF by then + cash covers the signing
 *   downpayment and stamp duty, with any compulsory cash share paid in cash.
 */
export function affordableCeiling({
  base,
  timing,
  cpfToday,
  combinedIncome,
  age,
  monthlyOverride,
  signingShare,
  minCashSigningShare,
  earners,
}: {
  earners?: number;
  base: FinancingEstimateInput;
  timing: PurchaseTiming;
  cpfToday: number;
  combinedIncome: number;
  age: number;
  monthlyOverride: number | null;
  signingShare: number;
  minCashSigningShare: number;
}): CeilingResult | null {
  const oaAtSigning = projectOa({ cpfToday, combinedIncome, age, monthlyOverride, months: timing.monthsToSigning, earners });
  const oaAtKeys = projectOa({ cpfToday, combinedIncome, age, monthlyOverride, months: timing.monthsToKeys, earners });
  const atKeys = calculateFinancingEstimate({ ...base, availableCpfOa: oaAtKeys });
  if (atKeys.maxPurchasePrice === null) return null;

  const keysPrice = atKeys.maxPurchasePrice;
  const cash = Math.max((base.availableCash ?? 0) - base.cashOnlyCosts - base.cashOnlyPurchaseAmount, 0);
  const grant = Math.max(base.grantAmount ?? 0, 0);
  const signingFits = (price: number) => {
    const due = price * signingShare + calculateBuyerStampDuty(price);
    const cashDue = price * minCashSigningShare;
    const grantUsed = Math.min(grant, price * 0.95);
    return cashDue <= cash + 0.5 && due <= grantUsed + oaAtSigning + cash + 0.5;
  };

  let price = keysPrice;
  let limitedBy: CeilingResult["limitedBy"] = describeKeysLimit(atKeys);
  if (!signingFits(keysPrice)) {
    let low = 0;
    let high = keysPrice;
    for (let step = 0; step < 40 && high - low > 50; step += 1) {
      const mid = (low + high) / 2;
      if (signingFits(mid)) low = mid;
      else high = mid;
    }
    price = low;
    limitedBy = "signing";
  }

  const estimate = calculateFinancingEstimate({ ...base, availableCpfOa: oaAtKeys, purchasePrice: price });
  return { price, limitedBy, estimate, oaAtSigning, oaAtKeys };
}

function describeKeysLimit(estimate: FinancingEstimate): "loan" | "keys" {
  const incomeLimit = estimate.serviceabilityLoanLimit;
  const loan = estimate.loanForTarget ?? 0;
  return incomeLimit !== null && loan >= incomeLimit - 1 ? "loan" : "keys";
}

export type StageFunding = { grant: number; cpf: number; cash: number; uncovered: number };

/**
 * Funds the signing and keys payments in date order: grant first (it arrives before signing),
 * then CPF built up by that date, then cash. Whatever is left is cash the buyer must find.
 */
export function fundStages({
  signing,
  keys,
  minCashSigning,
  grant,
  oaAtSigning,
  oaAtKeys,
  cash,
}: {
  signing: number;
  keys: number;
  minCashSigning: number;
  grant: number;
  oaAtSigning: number;
  oaAtKeys: number;
  cash: number | null;
}): { signing: StageFunding; keys: StageFunding } {
  let grantLeft = Math.max(grant, 0);
  let cashLeft = cash === null ? Number.POSITIVE_INFINITY : Math.max(cash, 0);
  let cpfSpent = 0;

  const fund = (total: number, oaAvailable: number, compulsoryCash: number): StageFunding => {
    const forcedCash = Math.min(compulsoryCash, total);
    let rest = total - forcedCash;
    const fromGrant = Math.min(grantLeft, rest);
    grantLeft -= fromGrant;
    rest -= fromGrant;
    const fromCpf = Math.min(Math.max(oaAvailable - cpfSpent, 0), rest);
    cpfSpent += fromCpf;
    rest -= fromCpf;
    const cashNeeded = forcedCash + rest;
    const fromCash = Math.min(cashLeft, cashNeeded);
    cashLeft -= fromCash;
    return {
      grant: Math.round(fromGrant),
      cpf: Math.round(fromCpf),
      cash: Math.round(cash === null ? cashNeeded : fromCash),
      uncovered: Math.round(cash === null ? 0 : cashNeeded - fromCash),
    };
  };

  const signingFunding = fund(signing, oaAtSigning, minCashSigning);
  const keysFunding = fund(keys, oaAtKeys, 0);
  return { signing: signingFunding, keys: keysFunding };
}
