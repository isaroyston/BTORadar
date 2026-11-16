import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Reads the facts on each RecordBTO project page that the list scrape skips: the
// estimated waiting time (which HDB announces at launch, long before a keys date),
// block count, tallest block, highlights and what's nearby. It covers every project
// still without a keys date plus everything launched since 2023, and writes
// data/recordbto/details.json for merge-bto-datasets.mjs to fold in.

const RECORDBTO_PATH = fileURLToPath(new URL("../../frontend/public/data/recordbto/projects.json", import.meta.url));
const OUTPUT_PATH = fileURLToPath(new URL("../../frontend/public/data/recordbto/details.json", import.meta.url));
const REQUEST_DELAY_MS = Number(process.env.RECORDBTO_DELAY_MS ?? 400);
const SINCE_YEAR = 2023;
const NEARBY_GROUPS = ["shopping", "education", "transport", "healthcare", "recreation"];

async function main() {
  const { projects } = JSON.parse(await readFile(RECORDBTO_PATH, "utf8"));
  const targets = projects.filter((project) => {
    const year = Number(String(project.launchMonth ?? "").slice(-4));
    return project.sourceUrl && (year >= SINCE_YEAR || !/\d{4}/.test(project.expectedTop ?? ""));
  });

  const details = {};
  for (const [index, project] of targets.entries()) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    try {
      const response = await fetch(project.sourceUrl, {
        headers: { "user-agent": "bto-planner-data-refresh/1.0 (+https://recordbto.com/bto project details backfill)" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parseDetails(await response.text(), project.name);
      if (Object.keys(parsed).length) details[project.id] = parsed;
      console.log(`[${String(index + 1).padStart(3, "0")}/${targets.length}] ${project.name}${parsed.waitMonths ? ` · ${parsed.waitMonths.min}${parsed.waitMonths.max !== parsed.waitMonths.min ? `-${parsed.waitMonths.max}` : ""} months` : ""}`);
    } catch (error) {
      console.warn(`[${index + 1}/${targets.length}] ${project.name}: ${error.message}`);
    }
  }

  const payload = { generatedAt: new Date().toISOString(), source: "https://recordbto.com/bto", projectCount: Object.keys(details).length, details };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote details for ${payload.projectCount} projects to ${OUTPUT_PATH}`);
}

export function pageLines(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function parseDetails(html, name) {
  const lines = pageLines(html);
  const after = (label) => {
    const index = lines.indexOf(label);
    return index === -1 ? undefined : lines[index + 1];
  };
  const between = (start, ends) => {
    const from = lines.indexOf(start);
    if (from === -1) return [];
    const rest = lines.slice(from + 1);
    const stop = rest.findIndex((line) => ends.includes(line));
    return stop === -1 ? rest.slice(0, 12) : rest.slice(0, stop);
  };

  const result = {};
  const blocks = Number(after("No of Blocks"));
  if (Number.isFinite(blocks) && blocks > 0) result.blocks = blocks;
  const floor = Number(after("Highest Floor"));
  if (Number.isFinite(floor) && floor > 0) result.highestFloor = floor;

  const highlights = between("Project Highlights", ["Investment Outlook", "Recreation & Lifestyle", "Upcoming Transformations", "Site Plan", "Units & Pricing"]);
  if (highlights.length) result.highlights = highlights.slice(0, 6);

  // The waiting-time block lists every project in the launch; ours follows "Current Project".
  const comparison = lines.indexOf("Waiting Time Comparison");
  if (comparison !== -1) {
    const window = lines.slice(comparison, comparison + 80);
    const current = window.indexOf("Current Project");
    const own = current !== -1 && window[current + 1] === name ? window.slice(current + 1, current + 5) : null;
    const value = own?.find((line) => /^\d{2}(\s*-\s*\d{2})?$/.test(line));
    if (value) {
      const [min, max = min] = value.split("-").map((part) => Number(part.trim()));
      result.waitMonths = { min, max };
    }
  }

  const nearbyLines = between("Nearby Amenities", ["Photo Gallery", "Similar Projects in"]);
  const nearby = {};
  let group = null;
  for (const line of nearbyLines) {
    if (NEARBY_GROUPS.includes(line.toLowerCase())) {
      group = line.toLowerCase();
      nearby[group] = [];
    } else if (group && nearby[group].length < 4) {
      nearby[group].push(line);
    }
  }
  if (Object.keys(nearby).length) result.nearby = nearby;
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
