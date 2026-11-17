import type { FinancingType, FlatType } from "../types";
import { parseBudgetInputs, type BudgetInputs } from "./budgetStorage";

// A plan travels in the link's hash, so nothing is sent to a server: the part after # never
// leaves the browser.
export type SharedPlan = {
  budget: BudgetInputs;
  combinedIncome: number;
  flatType: FlatType;
  financing: FinancingType;
  projectId: string | null;
};

const PREFIX = "#plan=";
const FLAT_TYPES: FlatType[] = ["2-room", "3-room", "4-room", "5-room", "executive"];

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function shareUrl(plan: SharedPlan, base: string) {
  const url = new URL(base);
  url.hash = "";
  url.search = "";
  return `${url.toString()}${PREFIX}${toBase64Url(JSON.stringify(plan))}`;
}

/** Reads a plan from a link's hash; anything malformed is ignored. */
export function readSharedPlan(hash: string): SharedPlan | null {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    const raw = JSON.parse(fromBase64Url(hash.slice(PREFIX.length))) as Record<string, unknown>;
    const income = Number(raw.combinedIncome);
    if (!Number.isFinite(income) || income <= 0) return null;
    return {
      budget: parseBudgetInputs((raw.budget ?? {}) as Record<string, unknown>),
      combinedIncome: income,
      flatType: FLAT_TYPES.includes(raw.flatType as FlatType) ? (raw.flatType as FlatType) : "4-room",
      financing: raw.financing === "bank" || raw.financing === "none" ? raw.financing : "hdb",
      projectId: typeof raw.projectId === "string" ? raw.projectId : null,
    };
  } catch {
    return null;
  }
}
