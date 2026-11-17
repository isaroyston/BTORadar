import type { BtoProject } from "../policies/policyConfig";
import type { FlatType, TimelineItem } from "../types";
import type { FirstTimers } from "./budgetStorage";
import type { CeilingResult } from "./cpfProjection";
import { addMonths, formatMonthYear, getLaunchMonthSortValue, parseMonthYearDate } from "./date";
import { currency } from "./format";

// HDB's monthly household income ceilings for couples and families (HDB eligibility pages,
// checked 2026-11-17). A 2-room Flexi has a lower ceiling than bigger flats.
export const INCOME_CEILINGS = {
  newFlat: 14000,
  twoRoomFlexi: 7000,
  hdbLoan: 14000,
  ehg: 9000,
} as const;

export const FLAT_LABELS: Record<FlatType, string> = {
  "2-room": "2-room Flexi",
  "3-room": "3-room",
  "4-room": "4-room",
  "5-room": "5-room",
  executive: "Executive",
};

export type CheckStatus = "ok" | "caution" | "info";
export type EligibilityCheck = { key: string; status: CheckStatus; title: string; body: string };

/** Plain checks a couple can act on: income ceilings, the HDB loan, the grant and ballot priority. */
export function eligibilityChecks({
  income,
  firstTimers,
  flatType,
  grant,
}: {
  income: number;
  firstTimers: FirstTimers;
  flatType: FlatType;
  grant: number;
}): EligibilityCheck[] {
  const checks: EligibilityCheck[] = [];
  const flatCeiling = flatType === "2-room" ? INCOME_CEILINGS.twoRoomFlexi : INCOME_CEILINGS.newFlat;
  const flat = FLAT_LABELS[flatType];

  checks.push(
    income <= flatCeiling
      ? {
          key: "ceiling",
          status: "ok",
          title: `Within the income ceiling for a ${flat}`,
          body: `HDB allows up to ${currency(flatCeiling)} a month; you earn ${currency(income)} together.`,
        }
      : {
          key: "ceiling",
          status: "caution",
          title: `Above the income ceiling for a ${flat}`,
          body:
            flatType === "2-room"
              ? `A 2-room Flexi is for households earning up to ${currency(flatCeiling)} a month. Bigger flats allow up to ${currency(INCOME_CEILINGS.newFlat)}.`
              : `New HDB flats are for households earning up to ${currency(flatCeiling)} a month. Resale flats and executive condominiums have higher limits.`,
        },
  );

  checks.push(
    income <= INCOME_CEILINGS.hdbLoan
      ? {
          key: "loan",
          status: "ok",
          title: "HDB loan available",
          body: "HDB lends at 2.6% a year for up to 25 years, and the HFE letter confirms the amount.",
        }
      : {
          key: "loan",
          status: "caution",
          title: "A bank loan instead of an HDB loan",
          body: `HDB loans are for households earning up to ${currency(INCOME_CEILINGS.hdbLoan)} a month. Bank rates move with the market.`,
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
      body: "Paid into your CPF before you sign. At least one of you needs to have worked for the 12 months before you apply.",
    });
  } else {
    checks.push({
      key: "grant",
      status: "info",
      title: "No housing grant at this income",
      body: `The Enhanced CPF Housing Grant stops at ${currency(INCOME_CEILINGS.ehg)} a month of household income.`,
    });
  }

  if (firstTimers === "both") {
    checks.push({
      key: "priority",
      status: "ok",
      title: "First-timer priority in the ballot",
      body: "First-timer couples get two ballot chances and most flats in each launch are set aside for them.",
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

export type JourneyStage = {
  key: string;
  title: string;
  when: string;
  body: string;
  /** Money due at this step, split by where it comes from. */
  due?: { total: number; cash: number; cpf: number; grant: number; shortfall: number };
};

/** From HFE letter to keys, dated from the payment timeline. */
export function journeyStages(timeline: TimelineItem[]): JourneyStage[] {
  const find = (label: string) => timeline.find((item) => item.label === label);
  const dueOf = (item: TimelineItem | undefined, extra?: TimelineItem) => {
    const payments = [item?.payment, extra?.payment].filter(Boolean) as NonNullable<TimelineItem["payment"]>[];
    if (payments.length === 0) return undefined;
    return payments.reduce(
      (sum, payment) => ({
        total: sum.total + payment.total,
        cash: sum.cash + payment.cash,
        cpf: sum.cpf + payment.cpfOa,
        grant: sum.grant + (payment.grant ?? 0),
        shortfall: sum.shortfall + (payment.shortfall ?? 0),
      }),
      { total: 0, cash: 0, cpf: 0, grant: 0, shortfall: 0 },
    );
  };
  const application = find("Application window");
  const booking = find("Flat booking");
  const signing = find("Agreement for lease");
  const keys = find("Key collection");
  const afterKeys = find("Post-keys fees");

  return [
    {
      key: "hfe",
      title: "Get your HFE letter",
      when: "Before you apply",
      body: "Apply on HDB's Flat Portal. It confirms you can buy, your loan and your grant, and lasts 9 months.",
    },
    {
      key: "apply",
      title: "Apply in a launch",
      when: application?.date ?? "",
      body: "Pick one project and flat size. Results come by ballot, with a queue number.",
      due: dueOf(application),
    },
    {
      key: "book",
      title: "Book your flat",
      when: booking?.date ?? "",
      body: "When your queue number comes up, choose a unit and pay the option fee.",
      due: dueOf(booking),
    },
    {
      key: "sign",
      title: "Sign the agreement for lease",
      when: signing?.date ?? "",
      body: "Pay the first part of the downpayment. Your grant is already in CPF by now.",
      due: dueOf(signing),
    },
    {
      key: "keys",
      title: "Collect your keys",
      when: keys?.date ?? "",
      body: "Pay the rest of the downpayment and fees. Loan repayments start the month after.",
      due: dueOf(keys, afterKeys),
    },
  ];
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

/** One change and how far it moves the price ceiling. */
export type Lever = { key: string; label: string; delta: number; note?: string };
