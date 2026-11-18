// The guided setup asks for each person's income and CPF; the planner only needs the totals.
// Keeping the split lets the setup show each person's figure when it is opened again.
export type SetupSplit = {
  incomeYou: number | null;
  incomePartner: number | null;
  cpfYou: number | null;
  cpfPartner: number | null;
};

const STORAGE_KEY = "bto-radar:setup:v1";

const numberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export function loadSetupSplit(): SetupSplit | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      incomeYou: numberOrNull(parsed.incomeYou),
      incomePartner: numberOrNull(parsed.incomePartner),
      cpfYou: numberOrNull(parsed.cpfYou),
      cpfPartner: numberOrNull(parsed.cpfPartner),
    };
  } catch {
    return null;
  }
}

export function saveSetupSplit(split: SetupSplit) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(split));
  } catch {
    // Storage can be blocked or full; the totals are still saved with the budget.
  }
}

/** Puts the split back as it was when the setup opened, or forgets it if there was none. */
export function restoreSetupSplit(split: SetupSplit | null) {
  if (split) {
    saveSetupSplit(split);
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to undo if storage is blocked.
  }
}
