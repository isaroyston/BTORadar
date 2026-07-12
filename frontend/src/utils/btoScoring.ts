import type { BtoProject } from "../policies/policyConfig";
import type {
  BtoDecisionScore,
  BtoScoreComponent,
  BtoScoreComponentKey,
  BtoScoreMode,
  BtoScorePreset,
  FlatType,
} from "../types";
import { getLaunchMonthSortValue } from "./date";

export type BtoScoreWeights = Record<BtoScoreComponentKey, number>;

export type BtoScoreContext = {
  flatType: FlatType;
  totalAffordability: number | null;
  cohortProjects: BtoProject[];
};

export const BTO_SCORE_MODE_OPTIONS: Array<{
  value: BtoScoreMode;
  label: string;
}> = [
  { value: "buyer-fit", label: "Buyer Fit" },
];

export const BTO_SCORE_PRESET_OPTIONS: Array<{
  value: BtoScorePreset;
  label: string;
}> = [
  { value: "balanced", label: "Balanced" },
  { value: "budget", label: "Budget" },
  { value: "commute", label: "Commute" },
  { value: "faster-top", label: "Faster TOP" },
  { value: "custom", label: "Custom" },
];

export const BTO_SCORE_MODES = BTO_SCORE_MODE_OPTIONS.map((option) => option.value);
export const BTO_SCORE_PRESETS = BTO_SCORE_PRESET_OPTIONS.map((option) => option.value);

export const BTO_SCORE_PRESET_DETAILS: Record<
  BtoScorePreset,
  {
    label: string;
    focus: string;
    weights: BtoScoreWeights;
  }
> = {
  balanced: {
    label: "Balanced",
    focus: "Good all-round shortlist for most buyers.",
    weights: {
      affordability: 30,
      commute: 20,
      centrality: 20,
      wait: 15,
      supply: 15,
    },
  },
  budget: {
    label: "Budget",
    focus: "Pushes lower prices and estimated purchase-budget fit to the front.",
    weights: {
      affordability: 52,
      commute: 14,
      centrality: 14,
      wait: 10,
      supply: 10,
    },
  },
  commute: {
    label: "Commute",
    focus: "Prioritises MRT access and central station context before other tradeoffs.",
    weights: {
      affordability: 20,
      commute: 40,
      centrality: 25,
      wait: 8,
      supply: 7,
    },
  },
  "faster-top": {
    label: "Faster TOP",
    focus: "Favours projects expected to complete sooner.",
    weights: {
      affordability: 25,
      commute: 15,
      centrality: 10,
      wait: 40,
      supply: 10,
    },
  },
  custom: {
    label: "Custom",
    focus: "You have manually adjusted the score weights.",
    weights: {
      affordability: 20,
      commute: 20,
      centrality: 20,
      wait: 20,
      supply: 20,
    },
  },
};

export const BTO_SCORE_COMPONENT_DETAILS: Record<
  BtoScoreComponentKey,
  {
    label: string;
    shortLabel: string;
    description: string;
  }
> = {
  affordability: {
    label: "Affordability",
    shortLabel: "Budget",
    description:
      "Checks the selected flat price against your entered funds and estimated loan budget, then compares price and price per sqm within the full launch.",
  },
  commute: {
    label: "MRT Proximity",
    shortLabel: "MRT",
    description:
      "Uses distance to the nearest listed MRT. Shorter distance scores higher, separate from station centrality.",
  },
  centrality: {
    label: "Location Demand",
    shortLabel: "Place",
    description:
      "Uses generated station centrality and curated location context such as city fringe, regional centre, waterfront, or emerging estate.",
  },
  wait: {
    label: "Wait Time",
    shortLabel: "TOP",
    description:
      "Uses expected TOP. Earlier completion scores higher within the selected launch.",
  },
  supply: {
    label: "Supply",
    shortLabel: "Units",
    description:
      "Uses total unit count as a simple supply signal. More units score higher within the launch.",
  },
};

export function scoreBtoProject(
  project: BtoProject,
  context: BtoScoreContext,
  mode: BtoScoreMode,
  preset: BtoScorePreset,
  customWeights?: BtoScoreWeights
): BtoDecisionScore {
  const weights = customWeights ?? BTO_SCORE_PRESET_DETAILS[preset].weights;
  const components = buildComponents(project, context, weights);
  const requestedWeight = Object.values(weights).reduce(
    (sum, weight) =>
      sum + (Number.isFinite(weight) ? Math.max(weight, 0) : 0),
    0
  );
  const availableWeight = components.reduce((sum, component) => sum + component.weight, 0);
  const coverage =
    requestedWeight > 0 ? Math.round((availableWeight / requestedWeight) * 100) : 0;
  const total =
    availableWeight > 0
      ? Math.round(
          components.reduce(
            (sum, component) => sum + component.score * component.weight,
            0
          ) / availableWeight
        )
      : null;
  const missingFields = getMissingFields(project, context, weights);
  const confidence = getConfidence(coverage, components.length);

  return {
    total,
    mode,
    preset,
    label: "Fit",
    confidence,
    coverage,
    components,
    missingFields,
    reasons: buildReasons(components, total),
  };
}

export function scoreBtoProjects(
  projects: BtoProject[],
  context: Omit<BtoScoreContext, "cohortProjects">,
  mode: BtoScoreMode,
  preset: BtoScorePreset,
  customWeights?: BtoScoreWeights,
  cohortProjects: BtoProject[] = projects
) {
  const scoreContext = {
    ...context,
    cohortProjects,
  };

  return new Map(
    projects.map((project) => [
      project.id,
      scoreBtoProject(project, scoreContext, mode, preset, customWeights),
    ])
  );
}

export function getAvailableBtoScoreComponents(
  projects: BtoProject[],
  flatType: FlatType,
  totalAffordability: number | null
) {
  const available = new Set<BtoScoreComponentKey>();
  const hasBudget =
    typeof totalAffordability === "number" &&
    Number.isFinite(totalAffordability) &&
    totalAffordability > 0;

  if (
    hasBudget &&
    projects.some((project) =>
      project.flatVariants.some((variant) => variant.type === flatType)
    )
  ) {
    available.add("affordability");
  }
  if (
    projects.some((project) =>
      Number.isFinite(project.nearestMrtDistanceMeters)
    )
  ) {
    available.add("commute");
  }
  if (
    projects.some((project) =>
      Number.isFinite(project.locationSignals?.centralityScore)
    )
  ) {
    available.add("centrality");
  }
  if (
    projects.some(
      (project) => getLaunchMonthSortValue(project.expectedTop ?? "") > 0
    )
  ) {
    available.add("wait");
  }
  if (
    projects.some((project) => Number.isFinite(project.totalUnits))
  ) {
    available.add("supply");
  }

  return available;
}

function buildComponents(
  project: BtoProject,
  context: BtoScoreContext,
  weights: BtoScoreWeights
) {
  return [
    buildAffordabilityComponent(project, context, weights.affordability),
    buildCommuteComponent(project, context, weights.commute),
    buildCentralityComponent(project, weights.centrality),
    buildWaitComponent(project, context, weights.wait),
    buildSupplyComponent(project, context, weights.supply),
  ].filter(
    (component): component is BtoScoreComponent =>
      Boolean(component && component.weight > 0)
  );
}

function buildAffordabilityComponent(
  project: BtoProject,
  context: BtoScoreContext,
  weight: number
): BtoScoreComponent | null {
  const variant = project.flatVariants.find((candidate) => candidate.type === context.flatType);
  if (!variant) return null;

  const cohortVariants = context.cohortProjects
    .map((candidate) =>
      candidate.flatVariants.find((variant) => variant.type === context.flatType)
    )
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const priceScore = lowIsBetter(
    variant.basePrice,
    cohortVariants.map((candidate) => candidate.basePrice)
  );
  const pricePerSqm = getPricePerSqm(variant);
  const sqmScore =
    pricePerSqm === null
      ? null
      : lowIsBetter(
          pricePerSqm,
          cohortVariants
            .map(getPricePerSqm)
            .filter((value): value is number => Number.isFinite(value))
        );

  const estimatedBudget = context.totalAffordability;
  if (
    typeof estimatedBudget !== "number" ||
    !Number.isFinite(estimatedBudget) ||
    estimatedBudget <= 0
  ) {
    return null;
  }

  const budgetRatio = variant.basePrice / estimatedBudget;
  const budgetScore =
    budgetRatio <= 1 ? 100 : Math.max(0, 88 - (budgetRatio - 1) * 180);

  return {
    key: "affordability",
    label: BTO_SCORE_COMPONENT_DETAILS.affordability.label,
    score: Math.round(averageScores([budgetScore, priceScore, sqmScore], [0.7, 0.2, 0.1])),
    weight,
    reason:
      budgetRatio <= 1
        ? "Within estimated budget"
        : "Above estimated budget",
  };
}

function buildCommuteComponent(
  project: BtoProject,
  context: BtoScoreContext,
  weight: number
): BtoScoreComponent | null {
  const distanceMeters = project.nearestMrtDistanceMeters;
  if (typeof distanceMeters !== "number" || !Number.isFinite(distanceMeters)) {
    return null;
  }

  const thresholdScore = distanceScore(distanceMeters);
  const relativeScore = lowIsBetter(
    distanceMeters,
    context.cohortProjects
      .map((candidate) => candidate.nearestMrtDistanceMeters)
      .filter((value): value is number => Number.isFinite(value))
  );

  return {
    key: "commute",
    label: BTO_SCORE_COMPONENT_DETAILS.commute.label,
    score: Math.round(averageScores([thresholdScore, relativeScore], [0.65, 0.35])),
    weight,
    reason:
      distanceMeters <= 600
        ? "Near MRT"
        : distanceMeters <= 1000
          ? "Moderate MRT walk"
          : "Longer MRT distance",
  };
}

function buildCentralityComponent(
  project: BtoProject,
  weight: number
): BtoScoreComponent | null {
  const score = project.locationSignals?.centralityScore;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  return {
    key: "centrality",
    label: BTO_SCORE_COMPONENT_DETAILS.centrality.label,
    score: Math.round(clampScore(score)),
    weight,
    reason: project.locationSignals?.centralityLabel ?? "Location context available",
  };
}

function buildWaitComponent(
  project: BtoProject,
  context: BtoScoreContext,
  weight: number
): BtoScoreComponent | null {
  const topSortValue = getLaunchMonthSortValue(project.expectedTop ?? "");
  if (!topSortValue) return null;

  const score = lowIsBetter(
    topSortValue,
    context.cohortProjects
      .map((candidate) => getLaunchMonthSortValue(candidate.expectedTop ?? ""))
      .filter((value) => value > 0)
  );

  return {
    key: "wait",
    label: BTO_SCORE_COMPONENT_DETAILS.wait.label,
    score,
    weight,
    reason: "Earlier TOP",
  };
}

function buildSupplyComponent(
  project: BtoProject,
  context: BtoScoreContext,
  weight: number
): BtoScoreComponent | null {
  const totalUnits = project.totalUnits;
  if (typeof totalUnits !== "number" || !Number.isFinite(totalUnits)) return null;

  return {
    key: "supply",
    label: BTO_SCORE_COMPONENT_DETAILS.supply.label,
    score: highIsBetter(
      totalUnits,
      context.cohortProjects
        .map((candidate) => candidate.totalUnits)
        .filter((value): value is number => Number.isFinite(value))
    ),
    weight,
    reason: "More units",
  };
}

function getMissingFields(
  project: BtoProject,
  context: BtoScoreContext,
  weights: BtoScoreWeights
) {
  const fields: string[] = [];
  const variant = project.flatVariants.find((candidate) => candidate.type === context.flatType);

  if (weights.affordability > 0) {
    if (!variant) fields.push(`${context.flatType} price`);
    if (
      context.totalAffordability === null ||
      !Number.isFinite(context.totalAffordability) ||
      context.totalAffordability <= 0
    ) {
      fields.push("affordability estimate");
    }
  }
  if (weights.commute > 0 && !Number.isFinite(project.nearestMrtDistanceMeters)) {
    fields.push("MRT distance");
  }
  if (
    weights.centrality > 0 &&
    !Number.isFinite(project.locationSignals?.centralityScore)
  ) {
    fields.push("location centrality");
  }
  if (
    weights.wait > 0 &&
    getLaunchMonthSortValue(project.expectedTop ?? "") <= 0
  ) {
    fields.push("expected TOP");
  }
  if (weights.supply > 0 && !Number.isFinite(project.totalUnits)) {
    fields.push("unit count");
  }

  return fields;
}

function buildReasons(components: BtoScoreComponent[], total: number | null) {
  if (total === null) return ["Not enough comparable data"];

  return [...components]
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .slice(0, 2)
    .map((component) => component.reason);
}

function getConfidence(coverage: number, componentCount: number) {
  if (coverage >= 75 && componentCount >= 3) return "Strong data";
  if (coverage >= 45 && componentCount >= 2) return "Partial data";
  return "Limited data";
}

function getPricePerSqm(variant: BtoProject["flatVariants"][number]) {
  if (Number.isFinite(variant.pricePerSqm)) return variant.pricePerSqm ?? null;
  if (!variant.floorAreaSqm || variant.floorAreaSqm <= 0) return null;

  return variant.basePrice / variant.floorAreaSqm;
}

function lowIsBetter(value: number, values: number[]) {
  const range = getRange(values);
  if (!range) return 80;
  if (range.max === range.min) return 80;
  return Math.round(
    clampScore(100 - ((value - range.min) / (range.max - range.min)) * 70)
  );
}

function highIsBetter(value: number, values: number[]) {
  const range = getRange(values);
  if (!range) return 80;
  if (range.max === range.min) return 80;
  return Math.round(
    clampScore(30 + ((value - range.min) / (range.max - range.min)) * 70)
  );
}

function clampScore(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function distanceScore(distanceMeters: number) {
  if (distanceMeters <= 400) return 100;
  if (distanceMeters <= 600) return 90;
  if (distanceMeters <= 800) return 78;
  if (distanceMeters <= 1000) return 68;
  if (distanceMeters <= 1400) return 52;
  return 35;
}

function getRange(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) return null;

  return {
    min: Math.min(...validValues),
    max: Math.max(...validValues),
  };
}

function averageScores(values: Array<number | null>, weights?: number[]) {
  const entries = values
    .map((value, index) => ({
      value,
      weight: weights?.[index] ?? 1,
    }))
    .filter((entry): entry is { value: number; weight: number } =>
      Number.isFinite(entry.value)
    );
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  if (!entries.length || totalWeight <= 0) return 0;

  return (
    entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) /
    totalWeight
  );
}
