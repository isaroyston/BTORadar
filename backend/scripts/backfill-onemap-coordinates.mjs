import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Fills in site coordinates for projects BTOHQ's map doesn't place, using OneMap's free
// address search (Singapore Land Authority). It tries the project name first (OneMap knows
// most named BTO sites), then each road in the listed address. Only confident matches are
// kept: the name must match, or the road name must match exactly. merge-bto-datasets.mjs
// then checks each point against the listed MRT station before using it.

const PROJECTS_PATH = fileURLToPath(new URL("../../frontend/public/data/bto/projects.json", import.meta.url));
const OUTPUT_PATH = fileURLToPath(new URL("../../frontend/public/data/onemap/coordinates.json", import.meta.url));
const SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search";
const REQUEST_DELAY_MS = Number(process.env.ONEMAP_DELAY_MS ?? 1200);
const ROAD_WORDS = /\b(street|st|avenue|ave|road|rd|drive|dr|walk|way|crescent|cres|lane|link|close|place|central|ring|rise|view|vale|terrace|hill|park|loop|grove|gardens?)\b/i;

async function main() {
  const { projects } = JSON.parse(await readFile(PROJECTS_PATH, "utf8"));
  const existing = await readExisting();
  const missing = projects.filter((project) => !project.projectCoordinates || project.projectCoordinates.source === "onemap-search");
  const coordinates = { ...existing };

  for (const [index, project] of missing.entries()) {
    if (coordinates[project.id] && !process.env.ONEMAP_REFRESH) continue;
    const found = await locate(project);
    const label = `[${String(index + 1).padStart(3, "0")}/${missing.length}] ${project.name}`;
    if (found) {
      coordinates[project.id] = found;
      console.log(`${label} -> ${found.matched} (${found.by})`);
    } else {
      console.log(`${label} -> not found`);
    }
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), source: SEARCH_URL, projectCount: Object.keys(coordinates).length, coordinates };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote coordinates for ${payload.projectCount} projects to ${OUTPUT_PATH}`);
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8")).coordinates ?? {};
  } catch {
    return {};
  }
}

async function locate(project) {
  const name = normalise(project.name);
  const byName = await search(project.name);
  const named = byName.find((result) => {
    const value = normalise(result.SEARCHVAL);
    return value === name || value.startsWith(`${name} `) || name.startsWith(`${value} `);
  });
  if (named) return point(named, "name");

  for (const road of roads(project.address ?? "")) {
    const results = await search(road);
    const match = results.find((result) => normalise(result.ROAD_NAME) === normalise(road));
    if (match) return point(match, `road: ${road}`);
  }
  return null;
}

// "Yishun Street 82, Yishun Walk and Yishun Avenue 2, about 570m from Khatib MRT" -> the roads.
export function roads(address) {
  return address
    .split(/,|\band\b|\bnext to\b|\bnear\b|\bbetween\b|\bbounded by\b|\balong\b|\bfrom\b|\//i)
    .map((part) => part.replace(/\(.*?\)/g, "").trim())
    .filter((part) => part && ROAD_WORDS.test(part) && !/\bmrt\b|\blrt\b|\babout\b|\d+\s*m\b/i.test(part))
    .slice(0, 4);
}

async function search(query) {
  await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
  const url = `${SEARCH_URL}?${new URLSearchParams({ searchVal: query, returnGeom: "Y", getAddrDetails: "Y", pageNum: "1" })}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: { "user-agent": "bto-planner-data-refresh/1.0 (OneMap geocode backfill)" } });
    const text = await response.text();
    if (response.ok && text.startsWith("{")) return JSON.parse(text).results ?? [];
    await new Promise((resolve) => setTimeout(resolve, 4000 * (attempt + 1)));
  }
  return [];
}

function point(result, by) {
  const lat = Number(result.LATITUDE);
  const lon = Number(result.LONGITUDE);
  if (!(lat > 1.15 && lat < 1.48 && lon > 103.6 && lon < 104.1)) return null;
  return { lat, lon, matched: result.SEARCHVAL, by };
}

function normalise(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/@/g, " AT ")
    .replace(/\bST\b/g, "STREET")
    .replace(/\bAVE\b/g, "AVENUE")
    .replace(/\bRD\b/g, "ROAD")
    .replace(/\bDR\b/g, "DRIVE")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
