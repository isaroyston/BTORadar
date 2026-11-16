export type BudgetInputs = {
  age: number | null;
  cpfOa: number | null;
  cash: number | null;
  // CPF Ordinary Account added each month, from a CPF statement. Null means estimate it from income and age.
  cpfMonthly: number | null;
  firstTimers: FirstTimers;
};

// Whether the buyers are first-timers, which decides the housing grant table.
export type FirstTimers = "both" | "one" | "none";

const STORAGE_KEY = "bto-radar:budget:v1";

export const EMPTY_BUDGET_INPUTS: BudgetInputs = {
  age: null,
  cpfOa: null,
  cash: null,
  cpfMonthly: null,
  firstTimers: "both",
};

const numberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export function loadBudgetInputs(): BudgetInputs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_BUDGET_INPUTS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;

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
    };
  } catch {
    return EMPTY_BUDGET_INPUTS;
  }
}

export function saveBudgetInputs(inputs: BudgetInputs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    // Storage can be blocked or full; the budget still works for this visit.
  }
}
