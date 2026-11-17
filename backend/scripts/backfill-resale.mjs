// Median HDB resale prices by town and flat type over the last 12 months, from data.gov.sg
// ("Resale flat prices based on registration date from Jan-2017 onwards"). Writes
// frontend/public/data/resale/medians.json. No key needed; requests are spaced out and retried.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESOURCE = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const API = "https://data.gov.sg/api/action/datastore_search";
const MONTHS = 12;
// "Young" resale flats are a fairer comparison with a new BTO than the whole market.
const YOUNG_YEARS = 15;

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../frontend/public/data/resale/medians.json");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const FLAT_TYPES = { "2 ROOM": "2-room", "3 ROOM": "3-room", "4 ROOM": "4-room", "5 ROOM": "5-room", EXECUTIVE: "executive" };

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "bto-radar-data-script" } });
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      await sleep(5000 * attempt);
      continue;
    }
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  throw new Error(`Gave up after retries: ${url}`);
}

async function monthRecords(month) {
  const records = [];
  for (let offset = 0; ; offset += 5000) {
    const params = new URLSearchParams({
      resource_id: RESOURCE,
      limit: "5000",
      offset: String(offset),
      filters: JSON.stringify({ month }),
    });
    const payload = await fetchJson(`${API}?${params}`);
    const batch = payload.result?.records ?? [];
    records.push(...batch);
    if (batch.length < 5000) break;
    await sleep(2500);
  }
  return records;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

// The newest month with data, then the 11 before it.
const latest = (await fetchJson(`${API}?resource_id=${RESOURCE}&limit=1&sort=month%20desc`)).result.records[0].month;
const [latestYear, latestMonth] = latest.split("-").map(Number);
const months = Array.from({ length: MONTHS }, (_, index) => {
  const date = new Date(latestYear, latestMonth - 1 - index, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
});

const groups = new Map();
let total = 0;
for (const month of months) {
  const records = await monthRecords(month);
  total += records.length;
  console.log(`${month}: ${records.length} sales`);
  for (const record of records) {
    const type = FLAT_TYPES[record.flat_type];
    if (!type) continue;
    const key = `${record.town}|${type}`;
    const group = groups.get(key) ?? { all: [], young: [] };
    const price = Number(record.resale_price);
    group.all.push(price);
    if (Number(record.lease_commence_date) >= latestYear - YOUNG_YEARS) group.young.push(price);
    groups.set(key, group);
  }
  await sleep(2500);
}

const towns = {};
for (const [key, group] of groups) {
  const [town, type] = key.split("|");
  towns[town] ??= {};
  towns[town][type] = {
    median: median(group.all),
    sales: group.all.length,
    youngMedian: group.young.length >= 5 ? median(group.young) : null,
    youngSales: group.young.length,
  };
}

await mkdir(path.dirname(out), { recursive: true });
await writeFile(
  out,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "data.gov.sg: Resale flat prices based on registration date from Jan-2017 onwards",
      sourceUrl: `https://data.gov.sg/datasets/${RESOURCE}/view`,
      from: months[months.length - 1],
      to: months[0],
      youngYears: YOUNG_YEARS,
      sales: total,
      towns,
    },
    null,
    1,
  )}\n`,
);
console.log(`Wrote ${out}: ${total} sales across ${Object.keys(towns).length} towns.`);
