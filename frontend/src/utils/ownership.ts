import type { BtoProject } from "../policies/policyConfig";
import type { FlatType } from "../types";
import { addMonths, formatMonthYear } from "./date";

/** Loan left after `months` of repayments on an amortising loan. */
export function loanBalance(principal: number, ratePercent: number, years: number, months: number) {
  const n = years * 12;
  const paid = Math.min(Math.max(months, 0), n);
  if (principal <= 0 || n <= 0) return 0;
  const r = ratePercent / 100 / 12;
  if (r === 0) return Math.max(principal * (1 - paid / n), 0);
  const monthly = (principal * r) / (1 - Math.pow(1 + r, -n));
  const balance = principal * Math.pow(1 + r, paid) - (monthly * (Math.pow(1 + r, paid) - 1)) / r;
  return Math.max(balance, 0);
}

export function monthlyRepayment(principal: number, ratePercent: number, years: number) {
  const n = years * 12;
  if (principal <= 0 || n <= 0) return 0;
  const r = ratePercent / 100 / 12;
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
}

// Standard flats: 5-year minimum occupation period. Plus and Prime: 10 years, a subsidy
// recovery when sold (6% to 9% in the October 2024 launch) and no renting out the whole flat.
export function mopYears(project: BtoProject | null) {
  const type = (project?.btoType ?? "").toLowerCase();
  return type === "plus" || type === "prime" || type === "plh" ? 10 : 5;
}

export type AfterKeys = {
  keys: string;
  mopYears: number;
  mopEnds: string;
  monthly: number;
  balanceAtMop: number;
  totalInterest: number;
  loanEnds: string;
};

/** What happens after keys: repayments, when the minimum occupation period ends and the loan left then. */
export function afterKeys({
  keysDate,
  loan,
  ratePercent,
  tenureYears,
  project,
}: {
  keysDate: Date;
  loan: number;
  ratePercent: number;
  tenureYears: number;
  project: BtoProject | null;
}): AfterKeys {
  const years = mopYears(project);
  const monthly = monthlyRepayment(loan, ratePercent, tenureYears);
  return {
    keys: formatMonthYear(keysDate),
    mopYears: years,
    mopEnds: formatMonthYear(addMonths(keysDate, years * 12)),
    monthly,
    balanceAtMop: loanBalance(loan, ratePercent, tenureYears, years * 12),
    totalInterest: Math.max(monthly * tenureYears * 12 - loan, 0),
    loanEnds: formatMonthYear(addMonths(keysDate, tenureYears * 12 + 1)),
  };
}

export type SccData = {
  note: string;
  checked: string;
  sources: { townCouncil: string; effective: string | null; url: string; rates: Partial<Record<FlatType, number>> }[];
};

/** The lowest and highest normal S&CC for a flat size across the town councils on file. */
export function sccRange(data: SccData | null, flatType: FlatType) {
  const rates = (data?.sources ?? []).map((source) => source.rates[flatType]).filter((rate): rate is number => typeof rate === "number");
  if (rates.length === 0) return null;
  return { low: Math.min(...rates), high: Math.max(...rates) };
}

// IRAS owner-occupier rates from 1 January 2025, on the flat's annual value (AV).
const OWNER_OCCUPIER_BANDS: [number, number][] = [
  [12000, 0],
  [28000, 0.04],
  [10000, 0.06],
  [25000, 0.1],
  [10000, 0.14],
  [15000, 0.2],
  [40000, 0.26],
  [Infinity, 0.32],
];

/** Yearly owner-occupier property tax for an annual value, before any rebate. */
export function ownerOccupierTax(annualValue: number) {
  let left = Math.max(annualValue, 0);
  let tax = 0;
  for (const [width, rate] of OWNER_OCCUPIER_BANDS) {
    const slice = Math.min(left, width);
    tax += slice * rate;
    left -= slice;
    if (left <= 0) break;
  }
  return Math.round(tax);
}
