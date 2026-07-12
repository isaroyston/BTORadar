import type { BtoProject } from "./policyConfig";

const BTO_PROJECTS_JSON = "/data/recordbto/projects.json";
const CACHE_DURATION = 60 * 60 * 1000;
const FLAT_TYPES = new Set([
  "2-room",
  "3-room",
  "4-room",
  "5-room",
  "executive",
]);

type BtoPayload = {
  generatedAt?: string;
  projectCount?: number;
  projects?: unknown[];
};

export type BtoDataset = {
  projects: BtoProject[];
  generatedAt: string | null;
  projectCount: number;
};

let cachedDataset: BtoDataset | null = null;
let cacheTime = 0;

export async function fetchBtoProjects(): Promise<BtoProject[]> {
  return (await fetchBtoDataset()).projects;
}

export async function getBtoProjectsCached(): Promise<BtoProject[]> {
  return (await getBtoDatasetCached()).projects;
}

export async function fetchBtoDataset(): Promise<BtoDataset> {
  return fetchFromBtoJson();
}

export async function getBtoDatasetCached(): Promise<BtoDataset> {
  const now = Date.now();
  const hasInvalidPrice = cachedDataset?.projects.some((project) =>
    project.flatVariants.some((variant) => !Number.isFinite(variant.basePrice))
  );

  if (cachedDataset && !hasInvalidPrice && now - cacheTime < CACHE_DURATION) {
    return cachedDataset;
  }

  cachedDataset = await fetchBtoDataset();
  cacheTime = now;
  return cachedDataset;
}

async function fetchFromBtoJson(): Promise<BtoDataset> {
  const response = await fetch(BTO_PROJECTS_JSON);
  if (!response.ok) {
    throw new Error(`Unable to load BTO dataset: ${response.status}`);
  }

  const payload = (await response.json()) as BtoPayload;
  if (!Array.isArray(payload.projects)) {
    throw new Error("BTO dataset is missing the projects array.");
  }

  if (!Number.isInteger(payload.projectCount)) {
    throw new Error("BTO dataset has an invalid projectCount value.");
  }

  if (payload.projectCount !== payload.projects.length) {
    throw new Error(
      `BTO dataset count mismatch: expected ${payload.projectCount}, received ${payload.projects.length}.`
    );
  }

  if (
    typeof payload.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.generatedAt))
  ) {
    throw new Error("BTO dataset has an invalid generatedAt timestamp.");
  }

  const invalidProjectIndex = payload.projects.findIndex(
    (project) => !isValidBtoProject(project)
  );
  if (invalidProjectIndex >= 0) {
    const invalidProject = payload.projects[invalidProjectIndex];
    const invalidId =
      isRecord(invalidProject) && typeof invalidProject.id === "string"
        ? invalidProject.id
        : `item ${invalidProjectIndex + 1}`;
    throw new Error(
      `BTO dataset contains an invalid project: ${invalidId}.`
    );
  }

  if (payload.projects.length === 0) {
    throw new Error("BTO dataset did not contain any projects.");
  }

  const projects = payload.projects as BtoProject[];
  if (new Set(projects.map((project) => project.id)).size !== projects.length) {
    throw new Error("BTO dataset contains duplicate project identifiers.");
  }
  if (
    projects.some(
      (project) =>
        new Set(project.flatVariants.map((variant) => variant.type)).size !==
        project.flatVariants.length
    )
  ) {
    throw new Error("BTO dataset contains duplicate flat variants.");
  }

  return {
    projects,
    generatedAt: payload.generatedAt,
    projectCount: projects.length,
  };
}

function isValidBtoProject(project: unknown): project is BtoProject {
  if (!isRecord(project)) return false;

  return Boolean(
    isNonEmptyString(project.id) &&
      isNonEmptyString(project.name) &&
      isNonEmptyString(project.launchMonth) &&
      isNonEmptyString(project.location) &&
      isNonEmptyString(project.district) &&
      project.dataSource === "recordbto" &&
      isOptionalString(project.status) &&
      isOptionalString(project.btoType) &&
      isOptionalString(project.expectedTop) &&
      isOptionalString(project.address) &&
      isOptionalString(project.nearestMrt) &&
      isOptionalString(project.sourceUrl) &&
      isOptionalString(project.unitTypes) &&
      isOptionalString(project.waitTimeMonths) &&
      isOptionalString(project.nearestMrtDistanceSource) &&
      isOptionalNonNegativeNumber(project.totalUnits) &&
      isOptionalNonNegativeNumber(project.nearestMrtDistanceMeters) &&
      isOptionalFlatTypeArray(project.availableFlatTypes) &&
      isOptionalLocationSignals(project.locationSignals) &&
      isOptionalBtoHq(project.btohq) &&
      (project.suggestedFinancing === undefined ||
        project.suggestedFinancing === "hdb" ||
        project.suggestedFinancing === "bank") &&
      (project.suggestedScheme === undefined ||
        project.suggestedScheme === "normal" ||
        project.suggestedScheme === "staggered" ||
        project.suggestedScheme === "dia") &&
      Array.isArray(project.flatVariants) &&
      project.flatVariants.every(isValidFlatVariant)
  );
}

function isValidFlatVariant(variant: unknown) {
  if (!isRecord(variant)) return false;

  return Boolean(
    typeof variant.type === "string" &&
      FLAT_TYPES.has(variant.type) &&
      isPositiveFiniteNumber(variant.basePrice) &&
      isOptionalPositiveNumber(variant.minPrice) &&
      isOptionalPositiveNumber(variant.maxPrice) &&
      isOptionalPositiveNumber(variant.floorAreaSqm) &&
      isOptionalPositiveNumber(variant.pricePerSqm) &&
      isOptionalNonNegativeNumber(variant.maxEhg) &&
      isOptionalPositiveNumber(variant.suggestedOccupants) &&
      isOptionalPositiveNumber(variant.suggestedTenureYears) &&
      isOptionalString(variant.priceNote) &&
      (variant.priceSource === undefined ||
        variant.priceSource === "recordbto" ||
        variant.priceSource === "estimate")
  );
}

function isOptionalFlatTypeArray(value: unknown) {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (flatType) => typeof flatType === "string" && FLAT_TYPES.has(flatType)
      ) &&
      new Set(value).size === value.length)
  );
}

function isOptionalLocationSignals(value: unknown) {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;

  return Boolean(
    isOptionalNonNegativeNumber(value.centralityScore) &&
      isOptionalString(value.centralityLabel) &&
      isOptionalString(value.nearestCentralAnchor) &&
      isOptionalNonNegativeNumber(value.centralAnchorDistanceMeters) &&
      isOptionalString(value.matchedStation) &&
      isOptionalString(value.source) &&
      (value.contextTags === undefined ||
        Array.isArray(value.contextTags) &&
          value.contextTags.every(isNonEmptyString))
  );
}

function isOptionalBtoHq(value: unknown) {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;

  const ratings = value.ratings;
  const nearbyAmenities = value.nearbyAmenities;
  return Boolean(
    (ratings === undefined ||
      isRecord(ratings) &&
        isOptionalFiniteNumber(ratings.accessibility) &&
        isOptionalFiniteNumber(ratings.amenities) &&
        isOptionalFiniteNumber(ratings.affordability)) &&
      (nearbyAmenities === undefined ||
        isRecord(nearbyAmenities) &&
          Object.values(nearbyAmenities).every(isOptionalString))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isOptionalPositiveNumber(value: unknown) {
  return value === undefined || isPositiveFiniteNumber(value);
}

function isOptionalNonNegativeNumber(value: unknown) {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isFinite(value) && value >= 0)
  );
}

function isOptionalFiniteNumber(value: unknown) {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isFinite(value))
  );
}
