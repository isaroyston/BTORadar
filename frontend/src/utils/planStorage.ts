import {
  FLAT_MAX,
  FLAT_MIN,
  FLAT_TYPE_OPTIONS,
  INCOME_MAX,
  INCOME_MIN,
  DEFAULT_LOAN_INTEREST_RATE,
  DEFAULT_LOAN_TENURE_YEARS,
  LOAN_INTEREST_RATE_MAX,
  LOAN_INTEREST_RATE_MIN,
  LOAN_TENURE_MIN,
  BANK_LOAN_TENURE_MAX,
} from "../constants";
import type {
  BtoScoreComponentKey,
  FinancingType,
  EhgMode,
  FlatType,
  SchemeType,
  TimelinePaymentOverride,
} from "../types";
import type { BtoScoreMode, BtoScorePreset } from "../types";
import {
  BTO_SCORE_MODES,
  BTO_SCORE_PRESETS,
  BTO_SCORE_PRESET_DETAILS,
  type BtoScoreWeights,
} from "./btoScoring";
import {
  isDateInputValue,
  isSupportedApplicationMonth,
} from "./date";
import { clampNumber } from "./format";

export const PLANNER_STORAGE_KEY = "hdb-planner:saved-plan";
const PLANNER_SCHEMA_VERSION = 4;

const LEGACY_MILESTONE_IDS: Record<string, string> = {
  "Application window": "application",
  "Flat booking": "booking",
  "Agreement for lease": "agreement",
  "Key collection": "keys",
  "Post-keys fees": "key-fees",
  "Key collection fees": "key-fees",
};

const FINANCING_VALUES = ["hdb", "bank", "none"] satisfies FinancingType[];
const SCHEME_VALUES = ["normal", "staggered", "dia"] satisfies SchemeType[];
const EHG_MODE_VALUES = [
  "unassessed",
  "family-estimate",
  "confirmed",
  "none",
] satisfies EhgMode[];
const FLAT_TYPE_VALUES = FLAT_TYPE_OPTIONS.map((option) => option.value);
const SCORE_WEIGHT_KEYS = [
  "affordability",
  "commute",
  "centrality",
  "wait",
  "supply",
] satisfies BtoScoreComponentKey[];
const TIMELINE_ITEM_ID_LIST = [
  "application",
  "booking",
  "agreement",
  "agreement-fees",
  "keys",
  "key-fees",
] as const;
const TIMELINE_ITEM_IDS = new Set<string>(TIMELINE_ITEM_ID_LIST);

export type PlannerSnapshot = {
  version: number;
  savedAt: string;
  combinedIncome: number;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
  yearFilter: string;
  townQuery: string;
  btoScoreMode: BtoScoreMode;
  btoScorePreset: BtoScorePreset;
  btoScoreWeights: BtoScoreWeights;
  selectedBtoProjectId: string | null;
  applicationMonth: string;
  completedMilestones: string[];
  confirmedMilestoneDates: Record<string, string>;
  paymentOverrides: Record<string, TimelinePaymentOverride>;
  availableCash: number | null;
  availableCpfOa: number | null;
  monthlyDebtPayments: number | null;
  monthlyPropertyLoanPayments: number | null;
  bankThereafterRate: number | null;
  ageForLoanRules: number | null;
  outstandingHousingLoans: 0 | 1 | 2 | null;
  ehgMode: EhgMode;
  ehgAssessedIncome: number | null;
  ehgConfirmedAmount: number | null;
  ehgFamilyEligibilityConfirmed: boolean;
};

type PlannerSnapshotInput = Omit<PlannerSnapshot, "version" | "savedAt">;

export function createPlannerSnapshot(
  input: PlannerSnapshotInput
): PlannerSnapshot {
  return {
    ...input,
    version: PLANNER_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
  };
}

export function savePlannerSnapshot(snapshot: PlannerSnapshot) {
  validateCurrentSnapshot(snapshot as unknown as Record<string, unknown>);
  window.localStorage.setItem(
    PLANNER_STORAGE_KEY,
    JSON.stringify(snapshot, null, 2)
  );
}

export function loadPlannerSnapshot(): PlannerSnapshot | null {
  const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY);
  if (!raw) return null;

  return parsePlannerSnapshot(raw);
}

export function parsePlannerSnapshot(raw: string): PlannerSnapshot {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Plan file must contain a JSON object.");
  }

  const parsedVersion = parseSnapshotVersion(parsed.version);
  if (parsedVersion === PLANNER_SCHEMA_VERSION) {
    validateCurrentSnapshot(parsed);
  }

  const flatType = parseEnum(
    parsed.flatType,
    FLAT_TYPE_VALUES,
    "flat type"
  );
  const financing = parseEnum(
    parsed.financing,
    FINANCING_VALUES,
    "financing type"
  );
  const scheme = parseEnum(parsed.scheme, SCHEME_VALUES, "payment scheme");
  const btoScorePreset = parseEnumWithDefault(
    parsed.btoScorePreset,
    BTO_SCORE_PRESETS,
    "balanced"
  );

  return {
    version: PLANNER_SCHEMA_VERSION,
    savedAt: parseSavedAt(parsed.savedAt),
    combinedIncome: parseBoundedNumber(
      parsed.combinedIncome,
      INCOME_MIN,
      INCOME_MAX,
      "household income"
    ),
    flatPrice: parseBoundedNumber(
      parsed.flatPrice,
      FLAT_MIN,
      FLAT_MAX,
      "flat price"
    ),
    flatType,
    financing,
    scheme,
    loanTenureYears: parseBoundedNumberWithDefault(
      parsed.loanTenureYears,
      LOAN_TENURE_MIN,
      financing === "hdb" ? 25 : BANK_LOAN_TENURE_MAX,
      DEFAULT_LOAN_TENURE_YEARS
    ),
    loanInterestRate: parseBoundedNumberWithDefault(
      parsed.loanInterestRate,
      LOAN_INTEREST_RATE_MIN,
      LOAN_INTEREST_RATE_MAX,
      DEFAULT_LOAN_INTEREST_RATE
    ),
    yearFilter: parseYearFilter(parsed.yearFilter),
    townQuery: typeof parsed.townQuery === "string" ? parsed.townQuery : "",
    btoScoreMode: parseEnumWithDefault(
      parsed.btoScoreMode,
      BTO_SCORE_MODES,
      "buyer-fit"
    ),
    btoScorePreset,
    btoScoreWeights: parseScoreWeights(
      parsed.btoScoreWeights,
      BTO_SCORE_PRESET_DETAILS[btoScorePreset].weights
    ),
    selectedBtoProjectId:
      typeof parsed.selectedBtoProjectId === "string" &&
      parsed.selectedBtoProjectId.trim().length > 0
        ? parsed.selectedBtoProjectId
        : null,
    applicationMonth: parseApplicationMonth(parsed.applicationMonth),
    completedMilestones: parseStringArray(
      parsed.completedMilestones,
      parsedVersion
    ),
    confirmedMilestoneDates: normalizeMilestoneDates(
      parseDateMap(parsed.confirmedMilestoneDates, parsedVersion),
      parseApplicationMonth(parsed.applicationMonth)
    ),
    paymentOverrides: parsePaymentOverrideMap(
      parsed.paymentOverrides,
      parsedVersion
    ),
    availableCash: parseNullableBoundedNumber(
      parsed.availableCash,
      0,
      FLAT_MAX * 2
    ),
    availableCpfOa: parseNullableBoundedNumber(
      parsed.availableCpfOa,
      0,
      FLAT_MAX * 2
    ),
    monthlyDebtPayments: parseNullableBoundedNumber(
      parsed.monthlyDebtPayments,
      0,
      INCOME_MAX * 2
    ),
    monthlyPropertyLoanPayments: parseNullableBoundedNumber(
      parsed.monthlyPropertyLoanPayments,
      0,
      INCOME_MAX * 2
    ),
    bankThereafterRate: parseNullableBoundedNumber(
      parsed.bankThereafterRate,
      LOAN_INTEREST_RATE_MIN,
      LOAN_INTEREST_RATE_MAX
    ),
    ageForLoanRules: parseNullableBoundedNumber(
      parsed.ageForLoanRules,
      18,
      80
    ),
    outstandingHousingLoans: parseOutstandingHousingLoans(
      parsed.outstandingHousingLoans
    ),
    ehgMode: parseEnumWithDefault(
      parsed.ehgMode,
      EHG_MODE_VALUES,
      "unassessed"
    ),
    ehgAssessedIncome: parseNullableBoundedNumber(
      parsed.ehgAssessedIncome,
      0,
      INCOME_MAX
    ),
    ehgConfirmedAmount: parseNullableBoundedNumber(
      parsed.ehgConfirmedAmount,
      0,
      120000
    ),
    ehgFamilyEligibilityConfirmed:
      parsed.ehgFamilyEligibilityConfirmed === true,
  };
}

export function downloadPlannerSnapshot(snapshot: PlannerSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `hdb-plan-${snapshot.savedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function parseEnum<T extends string>(
  value: unknown,
  validValues: readonly T[],
  label: string
): T {
  if (typeof value === "string" && validValues.includes(value as T)) {
    return value as T;
  }

  throw new Error(`Plan file has an unsupported ${label}.`);
}

function parseEnumWithDefault<T extends string>(
  value: unknown,
  validValues: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && validValues.includes(value as T)
    ? (value as T)
    : fallback;
}

function parseApplicationMonth(value: unknown) {
  if (typeof value === "string" && isSupportedApplicationMonth(value)) {
    return value;
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function parseYearFilter(value: unknown) {
  return typeof value === "string" && isValidYearFilter(value)
    ? value
    : "latest";
}

function isValidYearFilter(value: string) {
  if (value === "latest" || value === "all") return true;
  if (!/^\d{4}$/.test(value)) return false;

  const year = Number(value);
  return year >= 1900 && year <= 2100;
}

function parseBoundedNumber(
  value: unknown,
  min: number,
  max: number,
  label: string
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Plan file has an invalid ${label}.`);
  }

  return clampNumber(value, min, max);
}

function parseBoundedNumberWithDefault(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  return typeof value === "number" && Number.isFinite(value)
    ? clampNumber(value, min, max)
    : fallback;
}

function parseNullableBoundedNumber(
  value: unknown,
  min: number,
  max: number
) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  return clampNumber(value, min, max);
}

function parseOutstandingHousingLoans(value: unknown): 0 | 1 | 2 | null {
  return value === 0 || value === 1 || value === 2 ? value : null;
}

function parseStringArray(value: unknown, version: number) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter(
          (item): item is string => typeof item === "string" && item.length > 0
        )
        .map((item) => migrateMilestoneKey(item, version))
        .filter((item) => TIMELINE_ITEM_IDS.has(item))
    ),
  ];
}

function parseDateMap(value: unknown, version: number) {
  if (!isRecord(value)) return {};

  const entries = Object.entries(value)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "string" &&
        entry[0].length > 0 &&
        isDateInputValue(entry[1])
    )
    .map(([key, date]) => [migrateMilestoneKey(key, version), date] as const)
    .filter(([key]) => TIMELINE_ITEM_IDS.has(key));
  assertNoMigratedKeyCollisions(entries, "milestone dates");
  return Object.fromEntries(entries);
}

function parsePaymentOverrideMap(value: unknown, version: number) {
  if (!isRecord(value)) return {};

  const entries = Object.entries(value).flatMap(([label, candidate]) => {
    if (!label || !isRecord(candidate)) return [];

    const { total, cpf, cash } = candidate;
    if (
      typeof total !== "number" ||
      !Number.isFinite(total) ||
      total < 0 ||
      typeof cpf !== "number" ||
      !Number.isFinite(cpf) ||
      cpf < 0 ||
      typeof cash !== "number" ||
      !Number.isFinite(cash) ||
      cash < 0 ||
      Math.abs(cpf + cash - total) > 0.01
    ) {
      return [];
    }

    const key = migrateMilestoneKey(label, version);
    if (!TIMELINE_ITEM_IDS.has(key)) return [];
    return [
      [key, { total, cpf, cash } satisfies TimelinePaymentOverride] as const,
    ];
  });
  assertNoMigratedKeyCollisions(entries, "payment overrides");
  return Object.fromEntries(entries) as Record<string, TimelinePaymentOverride>;
}

function assertNoMigratedKeyCollisions(
  entries: ReadonlyArray<readonly [string, unknown]>,
  label: string
) {
  const keys = entries.map(([key]) => key);
  if (new Set(keys).size !== keys.length) {
    throw new Error(`Plan file has colliding legacy ${label}.`);
  }
}

function parseSnapshotVersion(value: unknown) {
  if (value === undefined) return 1;
  if (!Number.isInteger(value) || typeof value !== "number" || value < 1) {
    throw new Error("Plan file has an invalid schema version.");
  }
  if (value > PLANNER_SCHEMA_VERSION) {
    throw new Error("Plan file was created by a newer planner version.");
  }

  return value;
}

function parseSavedAt(value: unknown) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
}

function migrateMilestoneKey(key: string, version: number) {
  return version < 3 ? LEGACY_MILESTONE_IDS[key] ?? key : key;
}

function parseScoreWeights(value: unknown, fallback: BtoScoreWeights): BtoScoreWeights {
  if (!isRecord(value)) return fallback;

  const entries = SCORE_WEIGHT_KEYS.map((key) => {
    const candidate = value[key];
    const parsed =
      typeof candidate === "number" && Number.isFinite(candidate)
        ? candidate
        : Number.NaN;
    return [key, parsed] as const;
  });

  if (entries.some(([, parsed]) => !Number.isFinite(parsed) || parsed < 0 || parsed > 100)) {
    return fallback;
  }

  const total = entries.reduce((sum, [, parsed]) => sum + parsed, 0);
  if (total !== 100) return fallback;

  return Object.fromEntries(entries) as BtoScoreWeights;
}

function validateCurrentSnapshot(value: Record<string, unknown>) {
  const financing = requireEnumValue(
    value.financing,
    FINANCING_VALUES,
    "financing type"
  );
  requireValidDateTime(value.savedAt, "saved timestamp");
  requireBoundedValue(value.combinedIncome, INCOME_MIN, INCOME_MAX, "household income");
  requireBoundedValue(value.flatPrice, FLAT_MIN, FLAT_MAX, "flat price");
  requireEnumValue(value.flatType, FLAT_TYPE_VALUES, "flat type");
  requireEnumValue(value.scheme, SCHEME_VALUES, "payment scheme");
  requireBoundedValue(
    value.loanTenureYears,
    LOAN_TENURE_MIN,
    financing === "hdb" ? 25 : BANK_LOAN_TENURE_MAX,
    "loan tenure"
  );
  requireBoundedValue(
    value.loanInterestRate,
    LOAN_INTEREST_RATE_MIN,
    LOAN_INTEREST_RATE_MAX,
    "loan interest rate"
  );

  if (
    typeof value.yearFilter !== "string" ||
    !isValidYearFilter(value.yearFilter)
  ) {
    throw new Error("Plan file has an invalid year filter.");
  }
  if (typeof value.townQuery !== "string") {
    throw new Error("Plan file has an invalid town filter.");
  }
  requireEnumValue(value.btoScoreMode, BTO_SCORE_MODES, "score mode");
  requireEnumValue(value.btoScorePreset, BTO_SCORE_PRESETS, "score preset");
  validateScoreWeights(value.btoScoreWeights);
  if (
    value.selectedBtoProjectId !== null &&
    (typeof value.selectedBtoProjectId !== "string" ||
      value.selectedBtoProjectId.trim().length === 0)
  ) {
    throw new Error("Plan file has an invalid selected project id.");
  }
  if (
    typeof value.applicationMonth !== "string" ||
    !isSupportedApplicationMonth(value.applicationMonth)
  ) {
    throw new Error("Plan file has an invalid application month.");
  }

  validateMilestoneArray(value.completedMilestones);
  validateDateMap(value.confirmedMilestoneDates, value.applicationMonth);
  validateOverrideMap(value.paymentOverrides);
  requireNullableBoundedValue(value, "availableCash", 0, FLAT_MAX * 2);
  requireNullableBoundedValue(value, "availableCpfOa", 0, FLAT_MAX * 2);
  requireNullableBoundedValue(
    value,
    "monthlyDebtPayments",
    0,
    INCOME_MAX * 2
  );
  requireNullableBoundedValue(
    value,
    "monthlyPropertyLoanPayments",
    0,
    INCOME_MAX * 2
  );
  requireNullableBoundedValue(
    value,
    "bankThereafterRate",
    LOAN_INTEREST_RATE_MIN,
    LOAN_INTEREST_RATE_MAX
  );
  requireNullableBoundedValue(value, "ageForLoanRules", 18, 80);
  if (
    !hasOwn(value, "outstandingHousingLoans") ||
    !(
      value.outstandingHousingLoans === null ||
      value.outstandingHousingLoans === 0 ||
      value.outstandingHousingLoans === 1 ||
      value.outstandingHousingLoans === 2
    )
  ) {
    throw new Error("Plan file has invalid outstanding housing loans.");
  }
  requireEnumValue(value.ehgMode, EHG_MODE_VALUES, "EHG mode");
  requireNullableBoundedValue(value, "ehgAssessedIncome", 0, INCOME_MAX);
  requireNullableBoundedValue(value, "ehgConfirmedAmount", 0, 120000);
  if (typeof value.ehgFamilyEligibilityConfirmed !== "boolean") {
    throw new Error("Plan file has an invalid EHG eligibility confirmation.");
  }
}

function requireEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`Plan file has an unsupported ${label}.`);
  }
  return value as T;
}

function requireBoundedValue(
  value: unknown,
  min: number,
  max: number,
  label: string
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(`Plan file has an invalid ${label}.`);
  }
}

function requireNullableBoundedValue(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number
) {
  if (!hasOwn(record, key)) {
    throw new Error(`Plan file is missing ${key}.`);
  }
  const value = record[key];
  if (value === null) return;
  requireBoundedValue(value, min, max, key);
}

function requireValidDateTime(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`Plan file has an invalid ${label}.`);
  }
}

function validateScoreWeights(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("Plan file has invalid score weights.");
  }
  const weights = SCORE_WEIGHT_KEYS.map((key) => value[key]);
  if (
    weights.some(
      (weight) =>
        typeof weight !== "number" ||
        !Number.isFinite(weight) ||
        weight < 0 ||
        weight > 100
    ) ||
    weights.reduce<number>((sum, weight) => sum + (weight as number), 0) !== 100
  ) {
    throw new Error("Plan file has invalid score weights.");
  }
}

function validateMilestoneArray(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.some(
      (id) => typeof id !== "string" || !TIMELINE_ITEM_IDS.has(id)
    ) ||
    new Set(value).size !== value.length
  ) {
    throw new Error("Plan file has invalid completed milestones.");
  }
}

function validateDateMap(value: unknown, applicationMonth: string) {
  if (
    !isRecord(value) ||
    Object.entries(value).some(
      ([id, date]) =>
        !TIMELINE_ITEM_IDS.has(id) ||
        typeof date !== "string" ||
        !isDateInputValue(date)
    )
  ) {
    throw new Error("Plan file has invalid milestone dates.");
  }

  let previousDate = `${applicationMonth}-01`;
  for (const id of TIMELINE_ITEM_ID_LIST) {
    const date = value[id];
    if (typeof date !== "string") continue;
    if (date < previousDate) {
      throw new Error("Plan file has invalid milestone date chronology.");
    }
    previousDate = date;
  }
}

function normalizeMilestoneDates(
  dates: Record<string, string>,
  applicationMonth: string
) {
  const normalized: Record<string, string> = {};
  let previousDate = `${applicationMonth}-01`;

  for (const id of TIMELINE_ITEM_ID_LIST) {
    const date = dates[id];
    if (!date || date < previousDate) continue;
    normalized[id] = date;
    previousDate = date;
  }

  return normalized;
}

function validateOverrideMap(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("Plan file has invalid payment overrides.");
  }
  for (const [id, candidate] of Object.entries(value)) {
    if (!TIMELINE_ITEM_IDS.has(id) || !isRecord(candidate)) {
      throw new Error("Plan file has invalid payment overrides.");
    }
    const { total, cpf, cash } = candidate;
    if (
      typeof total !== "number" ||
      !Number.isFinite(total) ||
      total < 0 ||
      total > FLAT_MAX * 2 ||
      typeof cpf !== "number" ||
      !Number.isFinite(cpf) ||
      cpf < 0 ||
      typeof cash !== "number" ||
      !Number.isFinite(cash) ||
      cash < 0 ||
      Math.abs(cpf + cash - total) > 0.01
    ) {
      throw new Error("Plan file has invalid payment overrides.");
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}
