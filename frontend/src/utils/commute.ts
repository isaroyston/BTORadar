import type { BtoProject } from "../policies/policyConfig";

export type Place = { label: string; address: string; lat: number; lon: number };

const SEARCH = "https://www.onemap.gov.sg/api/common/elastic/search";
const STORAGE_KEY = "bto-radar:places:v1";

/** Finds a postal code, building or street with OneMap's public search (no key needed). */
export async function findPlace(query: string): Promise<Omit<Place, "label"> | null> {
  const params = new URLSearchParams({ searchVal: query.trim(), returnGeom: "Y", getAddrDetails: "Y", pageNum: "1" });
  const response = await fetch(`${SEARCH}?${params}`);
  if (!response.ok) throw new Error("OneMap search is unavailable right now.");
  const payload = (await response.json()) as { results?: { ADDRESS?: string; LATITUDE?: string; LONGITUDE?: string }[] };
  const first = payload.results?.[0];
  const lat = Number(first?.LATITUDE);
  const lon = Number(first?.LONGITUDE);
  if (!first || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { address: titleCase(first.ADDRESS ?? query), lat, lon };
}

/** Straight-line distance in kilometres. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function projectPoint(project: BtoProject) {
  const point = project.projectCoordinates;
  return point && Number.isFinite(point.lat) && Number.isFinite(point.lon) ? point : null;
}

/** Google Maps public transport directions, for the real door-to-door time. */
export function transitLink(project: BtoProject, place: Place) {
  const point = projectPoint(project);
  if (!point) return null;
  const params = new URLSearchParams({
    api: "1",
    origin: `${point.lat},${point.lon}`,
    destination: `${place.lat},${place.lon}`,
    travelmode: "transit",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

export function loadPlaces(): Place[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Place[];
    return Array.isArray(parsed)
      ? parsed.filter((place) => Number.isFinite(place?.lat) && Number.isFinite(place?.lon)).slice(0, 2)
      : [];
  } catch {
    return [];
  }
}

export function savePlaces(places: Place[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // Storage can be blocked; the places still work for this visit.
  }
}

function titleCase(text: string) {
  return text.toLowerCase().replace(/\b([a-z])/g, (match) => match.toUpperCase()).replace(/\bSingapore (\d{6})\b/i, "Singapore $1");
}
