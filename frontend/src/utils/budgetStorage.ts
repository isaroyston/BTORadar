export type BudgetInputs = {
  age: number | null;
  cpfOa: number | null;
  cash: number | null;
  firstTimer: boolean;
};

const STORAGE_KEY = "bto-radar:budget:v1";

export const EMPTY_BUDGET_INPUTS: BudgetInputs = {
  age: null,
  cpfOa: null,
  cash: null,
  firstTimer: true,
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
      firstTimer: parsed.firstTimer !== false,
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
