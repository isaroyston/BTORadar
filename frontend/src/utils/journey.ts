import type { BtoProject } from "../policies/policyConfig";
import type { FlatType } from "../types";
import type { FirstTimers, Household } from "./budgetStorage";
import type { CeilingResult } from "./cpfProjection";
import { addMonths, formatMonthYear, getLaunchMonthSortValue, parseMonthYearDate } from "./date";
import { currency } from "./format";

// HDB's monthly income ceilings, raised for HFE applications from 24 Aug 2026 (National Day
// Rally 2026: families S$14,000 to S$16,000, singles S$7,000 to S$8,000). The grant ceilings
// did not change. Checked 2026-11-17 against several reports of the announcement; HDB's HFE
// letter is the final word.
export const INCOME_CEILINGS = {
  newFlat: 16000,
  twoRoomFlexi: 8000,
  hdbLoan: 16000,
  singles: 8000,
  singlesLoan: 8000,
  ehg: 9000,
  ehgSingles: 4500,
} as const;

export const SINGLES_MIN_AGE = 35;

export const FLAT_LABELS: Record<FlatType, string> = {
  "2-room": "2-room Flexi",
  "3-room": "3-room",
  "4-room": "4-room",
  "5-room": "5-room",
  executive: "Executive",
};

export type CheckStatus = "ok" | "caution" | "info";
export type EligibilityCheck = { key: string; status: CheckStatus; title: string; body: string };

/** Plain checks a buyer can act on: who can buy, income ceilings, the HDB loan, the grant and ballot priority. */
export function eligibilityChecks({
  income,
  firstTimers,
  flatType,
  grant,
  household = "couple",
  age = null,
  hfe = false,
}: {
  income: number;
  firstTimers: FirstTimers;
  flatType: FlatType;
  grant: number;
  household?: Household;
  age?: number | null;
  /** True when the loan and grant come from an HFE letter. */
  hfe?: boolean;
}): EligibilityCheck[] {
  const checks: EligibilityCheck[] = [];
  const single = household === "single";
  const flat = FLAT_LABELS[flatType];


  if (single) {
    checks.push(
      age !== null && age < SINGLES_MIN_AGE
        ? {
            key: "who",
            status: "caution",
            title: `Singles can buy from age ${SINGLES_MIN_AGE}`,
            body: "Until then, a single can't buy a new HDB flat alone. Buying with a fiancé(e) or family counts as a couple.",
          }
        : {
            key: "who",
            status: flatType === "2-room" ? "ok" : "caution",
            title: flatType === "2-room" ? "Singles can buy a 2-room Flexi" : `Singles can't buy a new ${flat}`,
            body: "First-timer singles aged 35 and over can buy a new 2-room Flexi in Standard, Plus and Prime projects.",
          },
    );
  }

  const flatCeiling = single ? INCOME_CEILINGS.singles : flatType === "2-room" ? INCOME_CEILINGS.twoRoomFlexi : INCOME_CEILINGS.newFlat;
  checks.push(
    income <= flatCeiling
      ? {
          key: "ceiling",
          status: "ok",
          title: `Within the income ceiling for a ${flat}`,
          body: `HDB allows up to ${currency(flatCeiling)} a month; you earn ${currency(income)}${single ? "" : " together"}.`,
        }
      : {
          key: "ceiling",
          status: "caution",
          title: `Above the income ceiling for a ${flat}`,
          body:
            !single && flatType === "2-room"
              ? `A 2-room Flexi is for households earning up to ${currency(flatCeiling)} a month. Bigger flats allow up to ${currency(INCOME_CEILINGS.newFlat)}.`
              : `New HDB flats are for ${single ? "singles" : "households"} earning up to ${currency(flatCeiling)} a month. Resale flats have no income ceiling unless you take an HDB loan or grant.`,
        },
  );

  const loanCeiling = single ? INCOME_CEILINGS.singlesLoan : INCOME_CEILINGS.hdbLoan;
  checks.push(
    hfe
      ? {
          key: "loan",
          status: "ok",
          title: "Loan and grant from your HFE letter",
          body: "Every figure uses the amounts on your letter. It lasts 9 months, so apply for flats before it runs out.",
        }
      : income <= loanCeiling
        ? {
            key: "loan",
            status: "ok",
            title: "HDB loan available",
            body: "HDB lends at 2.6% a year for up to 25 years, ending by age 65. Your HFE letter confirms the amount.",
          }
        : {
            key: "loan",
            status: "caution",
            title: "A bank loan instead of an HDB loan",
            body: `HDB loans are for ${single ? "singles" : "households"} earning up to ${currency(loanCeiling)} a month. Bank rates move with the market.`,
          },
  );

  if (firstTimers === "none") {
    checks.push({
      key: "grant",
      status: "info",
      title: "No Enhanced CPF Housing Grant",
      body: "The grant is for first-timers, so the price is paid from your loan, CPF and cash.",
    });
  } else if (grant > 0) {
    checks.push({
      key: "grant",
      status: "ok",
      title: `Housing grant of ${currency(grant)}`,
      body: single
        ? "Paid into your CPF before you sign. You need to have worked for the 12 months before you apply."
        : "Paid into your CPF before you sign. At least one of you needs to have worked for the 12 months before you apply.",
    });
  } else {
    checks.push({
      key: "grant",
      status: "info",
      title: "No housing grant at this income",
      body: `The Enhanced CPF Housing Grant stops at ${currency(single ? INCOME_CEILINGS.ehgSingles : INCOME_CEILINGS.ehg)} a month of ${single ? "income" : "household income"}.`,
    });
  }

  if (!single && firstTimers === "both") {
    checks.push({
      key: "priority",
      status: "ok",
      title: "First-timer priority in the ballot",
      body: "First-timer couples get at least two ballot chances, and most flats in each launch are set aside for them.",
    });
  }

  return checks;
}

export type LaunchSnapshot = {
  label: string;
  projects: BtoProject[];
  openNow: boolean;
  totalUnits: number;
  /** Projects with this flat size, and those priced within the ceiling. */
  priced: number;
  fitting: BtoProject[];
  lowestPrice: number | null;
  /** HDB has held three launches a year, three to five months apart. */
  nextExpected: string;
};

/** The newest launch in the data, with how many of its projects fit the ceiling. */
export function latestLaunch({
  projects,
  flatType,
  today,
  ceilingFor,
}: {
  projects: BtoProject[];
  flatType: FlatType;
  today: Date;
  ceilingFor: ((project: BtoProject) => number) | null;
}): LaunchSnapshot | null {
  if (projects.length === 0) return null;
  const newest = Math.max(...projects.map((project) => getLaunchMonthSortValue(project.launchMonth)));
  const inLaunch = projects.filter((project) => getLaunchMonthSortValue(project.launchMonth) === newest);
  const label = inLaunch[0].launchMonth;
  const launchDate = parseMonthYearDate(label) ?? today;
  const openNow = launchDate.getFullYear() === today.getFullYear() && launchDate.getMonth() === today.getMonth();
  const withType = inLaunch.filter((project) => variantFor(project, flatType));
  const fitting = ceilingFor
    ? withType
        .filter((project) => (variantFor(project, flatType)?.basePrice ?? Infinity) <= ceilingFor(project))
        .sort((a, b) => (variantFor(a, flatType)?.basePrice ?? 0) - (variantFor(b, flatType)?.basePrice ?? 0))
    : [];
  const prices = withType.map((project) => variantFor(project, flatType)?.basePrice ?? 0).filter((price) => price > 0);
  const nextFrom = addMonths(launchDate, 3);
  const nextTo = addMonths(launchDate, 4);
  return {
    label,
    projects: inLaunch,
    openNow,
    totalUnits: inLaunch.reduce((sum, project) => sum + (project.totalUnits ?? 0), 0),
    priced: withType.length,
    fitting,
    lowestPrice: prices.length ? Math.min(...prices) : null,
    nextExpected: monthRange(nextFrom, nextTo),
  };
}

/** Lowest listed price for each flat size in the newest launch that has that size. */
export function pricesBySize(projects: BtoProject[]): Partial<Record<FlatType, { from: number; launch: string }>> {
  const result: Partial<Record<FlatType, { from: number; launch: string; sort: number }>> = {};
  for (const project of projects) {
    const sort = getLaunchMonthSortValue(project.launchMonth);
    for (const variant of project.flatVariants) {
      if (!variant.basePrice) continue;
      const current = result[variant.type];
      if (!current || sort > current.sort || (sort === current.sort && variant.basePrice < current.from)) {
        result[variant.type] = { from: variant.basePrice, launch: project.launchMonth, sort };
      }
    }
  }
  return Object.fromEntries(
    Object.entries(result).map(([type, value]) => [type, { from: value!.from, launch: value!.launch }]),
  );
}

function variantFor(project: BtoProject, flatType: FlatType) {
  return project.flatVariants.find((variant) => variant.type === flatType && variant.basePrice > 0);
}

function monthRange(from: Date, to: Date) {
  const a = formatMonthYear(from);
  const b = formatMonthYear(to);
  if (a === b) return a;
  const [aMonth, aYear] = a.split(" ");
  const [bMonth, bYear] = b.split(" ");
  return aYear === bYear ? `${aMonth} to ${bMonth} ${bYear}` : `${a} to ${b}`;
}

export type CeilingSplit = {
  price: number;
  loan: number;
  grant: number;
  cpf: number;
  cash: number;
  monthly: number | null;
  tenure: number | null;
};

/** Where a price ceiling's money comes from: loan, grant, CPF built up by keys, then cash. */
export function splitCeiling(result: CeilingResult | null): CeilingSplit | null {
  if (!result || result.price <= 0) return null;
  const loan = Math.round(result.estimate.loanForTarget ?? 0);
  const grant = Math.round(result.estimate.usableGrantAmount ?? 0);
  const own = Math.max(Math.round(result.price) - loan - grant, 0);
  const cpf = Math.min(Math.round(result.oaAtKeys), own);
  return {
    price: Math.floor(result.price / 1000) * 1000,
    loan,
    grant,
    cpf,
    cash: Math.max(own - cpf, 0),
    monthly: result.estimate.estimatedMonthlyPayment,
    tenure: result.estimate.effectiveTenureYears,
  };
}
