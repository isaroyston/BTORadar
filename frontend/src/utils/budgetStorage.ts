export type BudgetInputs = {
  // A single buyer's age, or a couple's income-weighted average age, which HDB uses for the
  // loan tenure. Null means assume under 35.
  age: number | null;
  cpfOa: number | null;
  cash: number | null;
  // CPF Ordinary Account added each month, from a CPF statement. Null means estimate it from income and age.
  cpfMonthly: number | null;
  firstTimers: FirstTimers;
  household: Household;
  // Figures from an HFE letter. When set they replace the estimated loan and grant.
  hfeLoan: number | null;
  hfeGrant: number | null;
  // The month the HFE letter was issued (YYYY-MM); it is valid for 9 months.
  hfeIssued: string | null;
  // For ballot chances: FT(PMC) status and unsuccessful Standard applications since Oct 2024.
  pmc: boolean;
  unsuccessfulStandard: number;
};

// Whether the buyers are first-timers, which decides the housing grant table.
export type FirstTimers = "both" | "one" | "none";
// A couple (married, engaged or a family) or a single buyer aged 35 and over.
export type Household = "couple" | "single";

const STORAGE_KEY = "bto-radar:budget:v1";

export const EMPTY_BUDGET_INPUTS: BudgetInputs = {
  age: null,
  cpfOa: null,
  cash: null,
  cpfMonthly: null,
  firstTimers: "both",
  household: "couple",
  hfeLoan: null,
  hfeGrant: null,
  hfeIssued: null,
  pmc: false,
  unsuccessfulStandard: 0,
};

const numberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export function loadBudgetInputs(): BudgetInputs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_BUDGET_INPUTS;
    return parseBudgetInputs(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return EMPTY_BUDGET_INPUTS;
  }
}

/** Reads stored or shared answers, keeping only values of the right shape. */
export function parseBudgetInputs(parsed: Record<string, unknown>): BudgetInputs {
  return {
    age: numberOrNull(parsed.age),
    cpfOa: numberOrNull(parsed.cpfOa),
    cash: numberOrNull(parsed.cash),
    cpfMonthly: numberOrNull(parsed.cpfMonthly),
    firstTimers:
      parsed.firstTimers === "one" || parsed.firstTimers === "none" || parsed.firstTimers === "both"
        ? parsed.firstTimers
        : parsed.firstTimer === false
          ? "none"
          : "both",
    household: parsed.household === "single" ? "single" : "couple",
    hfeLoan: numberOrNull(parsed.hfeLoan),
    hfeGrant: numberOrNull(parsed.hfeGrant),
    hfeIssued: typeof parsed.hfeIssued === "string" && /^\d{4}-\d{2}$/.test(parsed.hfeIssued) ? parsed.hfeIssued : null,
    pmc: parsed.pmc === true,
    unsuccessfulStandard: Math.min(Math.floor(numberOrNull(parsed.unsuccessfulStandard) ?? 0), 20),
  };
}

export function saveBudgetInputs(inputs: BudgetInputs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    // Storage can be blocked or full; the budget still works for this visit.
  }
}
