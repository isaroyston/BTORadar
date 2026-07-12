import assert from "node:assert/strict";
import {
  formatDateInputDisplay,
  getLaunchMonthSortValue,
  isDateInputValue,
  parseLaunchMonth,
  parseLaunchMonthInput,
  parseMonth,
  parseMonthYearDate,
} from "../../frontend/src/utils/date.ts";

const month = parseMonth("2026-02");
assert.ok(month instanceof Date);
assert.equal(month.getFullYear(), 2026);
assert.equal(month.getMonth(), 1);
assert.equal(month.getDate(), 1);

for (const invalidMonth of [
  "",
  "2026",
  "2026-2",
  "2026-00",
  "2026-13",
  " 2026-02",
  "2026-02-01",
  "2024-09",
  "0001-02",
  "2101-01",
]) {
  assert.equal(parseMonth(invalidMonth), null, invalidMonth);
}

for (const validDate of [
  "2024-02-29",
  "2025-02-28",
  "2000-02-29",
  "2026-12-31",
]) {
  assert.equal(isDateInputValue(validDate), true, validDate);
}

for (const invalidDate of [
  "",
  "2025-02-29",
  "1900-02-29",
  "2026-04-31",
  "2026-00-10",
  "2026-13-10",
  "2026-01-00",
  "2026-01-32",
  "2026-1-01",
  " 2026-01-01",
]) {
  assert.equal(isDateInputValue(invalidDate), false, invalidDate);
  assert.equal(formatDateInputDisplay(invalidDate), null, invalidDate);
}

assert.ok(formatDateInputDisplay("2024-02-29")?.includes("2024"));
assert.deepEqual(parseLaunchMonth("2026-07"), {
  year: 2026,
  monthIndex: 6,
});
assert.deepEqual(parseLaunchMonth("September 2026"), {
  year: 2026,
  monthIndex: 8,
});
assert.deepEqual(parseLaunchMonth("Sept 2026"), {
  year: 2026,
  monthIndex: 8,
});
assert.deepEqual(parseLaunchMonth("Dec 2100"), {
  year: 2100,
  monthIndex: 11,
});
assert.deepEqual(parseLaunchMonth("May 2101"), {
  year: 2101,
  monthIndex: 4,
});
assert.equal(parseLaunchMonth("2026-13"), null);
assert.equal(parseLaunchMonth("FY 2026"), null);
assert.equal(parseLaunchMonthInput("Jul 2026"), "2026-07");
assert.equal(parseLaunchMonthInput("Feb 0001"), null);
assert.equal(parseLaunchMonthInput("FY 2026"), null);
assert.equal(getLaunchMonthSortValue("2026-07"), 2026 * 12 + 6);
assert.equal(getLaunchMonthSortValue("invalid"), 0);

const monthYearDate = parseMonthYearDate("Feb 2028");
assert.ok(monthYearDate instanceof Date);
assert.equal(monthYearDate.getFullYear(), 2028);
assert.equal(monthYearDate.getMonth(), 1);
assert.equal(parseMonthYearDate("FY 2028"), null);

console.log("Date checks passed.");
