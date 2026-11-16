import type { BtoProject } from "../policies/policyConfig";
import type { BtoScoreComponentKey } from "../types";
import type { BtoScoreWeights } from "./btoScoring";

/** Keys month as "Mmm YYYY": HDB's completion date when published, else the launch's waiting time. */
export function keysMonth(project: BtoProject | null | undefined) {
  if (!project) return undefined;
  if (/\d{4}/.test(project.expectedTop ?? "")) return project.expectedTop;
  return project.estimatedKeys;
}

export function keysAreEstimated(project: BtoProject) {
  return !/\d{4}/.test(project.expectedTop ?? "") && Boolean(project.estimatedKeys);
}

/** "Mar 2030", "About Mar 2030" or "Not announced". */
export function keysLabel(project: BtoProject) {
  const month = keysMonth(project);
  if (!month) return "Not announced";
  return keysAreEstimated(project) ? `About ${month}` : month;
}

export function waitLabel(project: BtoProject) {
  const wait = project.waitMonths;
  if (!wait) return null;
  const range = wait.min === wait.max ? `${wait.min}` : `${wait.min}–${wait.max}`;
  return `${range} months from booking`;
}

/** A grey OneMap street map centred on the project, with a pin. Free and keyless; SLA data. OneMap allows at most 512 px a side. */
export function locationMapUrl(project: BtoProject, width = 512, height = 240) {
  const point = project.projectCoordinates;
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
  const lat = point.lat.toFixed(5);
  const lon = point.lon.toFixed(5);
  const params = new URLSearchParams({
    layerchosen: "grey",
    lat,
    lng: lon,
    zoom: "15",
    width: String(width),
    height: String(height),
    points: `[${lat},${lon},"222,46,92"]`,
  });
  return `https://www.onemap.gov.sg/api/staticmap/getStaticImage?${params.toString()}`;
}

export type ProjectFact = { key: BtoScoreComponentKey; icon: "money" | "metro" | "map" | "clock" | "building"; text: string };

/**
 * Short facts for a card, led by what the buyer said matters most, so changing priorities
 * changes what each card says first, not only the order.
 */
export function projectFacts(
  project: BtoProject,
  weights: BtoScoreWeights,
  priceRank: { rank: number; of: number } | null,
  limit = 3,
): ProjectFact[] {
  const facts: Record<BtoScoreComponentKey, ProjectFact | null> = {
    affordability:
      priceRank && priceRank.of > 1
        ? {
            key: "affordability",
            icon: "money",
            text: priceRank.rank === 1 ? `Lowest price of ${priceRank.of}` : `${ordinal(priceRank.rank)} lowest of ${priceRank.of}`,
          }
        : null,
    commute: Number.isFinite(project.nearestMrtDistanceMeters)
      ? {
          key: "commute",
          icon: "metro",
          text: `${formatWalk(project.nearestMrtDistanceMeters ?? 0)} to ${shortStation(project)}`,
        }
      : null,
    centrality: placeTag(project) ? { key: "centrality", icon: "map", text: placeTag(project) as string } : null,
    wait: keysMonth(project) ? { key: "wait", icon: "clock", text: `Keys ${keysLabel(project).replace("About", "about")}` } : null,
    supply: Number.isFinite(project.totalUnits)
      ? {
          key: "supply",
          icon: "building",
          text: `${(project.totalUnits ?? 0).toLocaleString("en-SG")} flats${project.blocks ? ` in ${project.blocks} blocks` : ""}`,
        }
      : null,
  };
  const order = (Object.keys(facts) as BtoScoreComponentKey[])
    .map((key, index) => ({ key, weight: weights[key] ?? 0, index }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  return order
    .map(({ key }) => facts[key])
    .filter((fact): fact is ProjectFact => fact !== null)
    .slice(0, limit);
}

function ordinal(value: number) {
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][value % 10] ?? "th";
  return `${value}${suffix}`;
}

function formatWalk(meters: number) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

function shortStation(project: BtoProject) {
  const name = project.locationSignals?.matchedStation ?? project.nearestMrt?.replace(/\s*\(.*\)$/, "").replace(/\s+MRT$/i, "");
  return name ? `${name} MRT` : "MRT";
}

// Region tags ("East region") say little, so only tags that describe the place count.
function placeTag(project: BtoProject) {
  return project.locationSignals?.contextTags?.find((tag) => !/region$/i.test(tag) && !/context$/i.test(tag));
}
